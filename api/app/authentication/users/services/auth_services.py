import logging
from datetime import datetime, timezone


from fastapi import Request
from sqlmodel import Session, select

from app.core import JwtManager, settings
from app.core.audit import AuditEvents, Outcome
from .audit_services import AuditServices
from .password_services import PasswordServices
from ..models import Users
from ..schemas import (
    ActivityQuery,
    ActivityRead,
    AuthResponse,
    Response,
    UpdateMeRequest,
    UserRead,
)

logger = logging.getLogger(__name__)


class AuthServices:
    def __init__(
        self,
        db: Session,
        password_services: PasswordServices | None = None,
        jwt_manager: JwtManager | None = None,
        audit: AuditServices | None = None,
    ):
        self.db = db
        self.password_services = password_services or PasswordServices()
        self.jwt_manager = jwt_manager or JwtManager()
        self.audit = audit or AuditServices()

    def me(self, user: Users) -> Response[UserRead]:
        return Response(
            success=True, message="User retrieved", code="USER_FOUND",
            details=UserRead.model_validate(user),
        )

    def my_activity(self, user: Users, query: ActivityQuery) -> Response[list[ActivityRead]]:
        # Only what the user actually did: failed attempts and rejected tokens are security noise, not activity
        events = self.db.exec(
            select(AuditEvents)
            .where(AuditEvents.actor_id == user.id, AuditEvents.outcome == Outcome.SUCCESS.value)
            .order_by(AuditEvents.occurred_at.desc())
            .limit(query.limit)
        ).all()
        return Response(
            success=True, message="Activity retrieved", code="ACTIVITY_LISTED",
            details=[ActivityRead.model_validate(event) for event in events],
        )

    def update_me(self, user: Users, payload: UpdateMeRequest, request: Request | None = None) -> Response[UserRead]:
        action = "auth.update_me"
        try:
            before = {"name": user.name}
            user.name = payload.name
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            self.audit.user(
                action, request, "USER_UPDATED", actor=user, target=user,
                changes={"before": before, "after": {"name": user.name}},
            )
            return Response(
                success=True, message="Profile updated", code="USER_UPDATED",
                details=UserRead.model_validate(user),
            )

        except Exception:
            self.db.rollback()
            logger.exception("Profile update failed for %s", user.id)
            self.audit.user(action, request, "USER_UPDATE_FAILED", actor=user, target=user)
            return Response(success=False, message="Couldn't update your profile", code="USER_UPDATE_FAILED", details=None)

    def sign_out(self, user: Users, request: Request | None = None) -> AuthResponse:
        # Tokens are stateless, so sign-out only records who left; the client drops its cookies
        self.audit.sign_out(request, "SIGNED_OUT", user=user)
        return AuthResponse(success=True, message="Signed out", code="SIGNED_OUT", details=None)

    def __still_default(self, other_hash: str, default: str) -> bool:
        """Onboarding finishes only once both the password and the pin are no longer the defaults."""
        return self.password_services.verify_password(default, other_hash)

    async def sign_in(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
        request: Request | None = None,
    ) -> AuthResponse:
        try:
            user = self.db.exec(
                select(Users).where(Users.email == email)
            ).first()

            if not user:
                self.audit.sign_in(request, "EMAIL_NOT_FOUND", email=email)
                return AuthResponse(
                    success=False,
                    message="Email not found",
                    code="EMAIL_NOT_FOUND",
                    details=None
                )

            if not self.password_services.verify_password(password, user.password):
                self.audit.sign_in(request, "INCORRECT_PASSWORD", email=email)
                return AuthResponse(
                    success=False,
                    message="Incorrect password",
                    code="INCORRECT_PASSWORD",
                    details=None
                )

            if not user.is_active:
                self.audit.sign_in(request, "USER_INACTIVE", email=email, user=user)
                return AuthResponse(
                    success=False,
                    message="This account is deactivated",
                    code="USER_INACTIVE",
                    details=None
                )

            refresh_token = self.jwt_manager.create_refresh_token(
                data={
                    "sub": str(user.id),
                    "role": user.role.value,
                },
                remember_me=remember_me,
            )

            access_token = self.jwt_manager.create_access_token(
                data={
                    "sub": str(user.id),
                    "role": user.role.value,
                }
            )

            self.audit.sign_in(
                request,
                "LOGIN_SUCCESS",
                email=email,
                user=user,
                access_token=access_token,
            )
            return AuthResponse(
                success=True,
                message="Login successful",
                code="LOGIN_SUCCESS",
                details={
                    "name": user.name,
                    "email": user.email,
                    "role": user.role.value,
                    "needs_onboarding": user.needs_onboarding,
                    "access_token": access_token,
                    "refresh_token": refresh_token
                }
            )

        except Exception:
            self.audit.sign_in(request, "SIGN_IN_FAILED", email=email)
            return AuthResponse(
                success=False,
                message="Unable to sign in right now",
                code="SIGN_IN_FAILED",
                details=None
            )

    async def pin(
        self,
        user: Users,
        pin: str,
        request: Request | None = None,
    ) -> AuthResponse:
        try:
            if not self.password_services.verify_password(pin, user.pin):
                self.audit.pin(request, "INVALID_PIN", user=user)
                return AuthResponse(
                    success=False,
                    message="Invalid pin",
                    code="INVALID_PIN",
                    details=None
                )

            access_token = self.jwt_manager.create_access_token(
                data={
                    "sub": str(user.id),
                    "role": user.role.value,
                }
            )

            # Re-authentication issues a new access token; record its lifetime, never the token
            expires_at = datetime.fromtimestamp(
                self.jwt_manager.decode_token(access_token)["exp"], tz=timezone.utc
            )
            self.audit.pin(
                request,
                "PIN_VERIFIED",
                user=user,
                access_token=access_token,
                changes={
                    "issued": {
                        "token_type": "access",
                        "issued_at": datetime.now(timezone.utc).isoformat(),
                        "expires_at": expires_at.isoformat(),
                    }
                },
            )
            return AuthResponse(
                success=True,
                message="Pin verified successfully",
                code="PIN_VERIFIED",
                details={
                    "name": user.name,
                    "email": user.email,
                    "role": user.role.value,
                    "needs_onboarding": user.needs_onboarding,
                    "access_token": access_token
                },
            )

        except Exception:
            self.audit.pin(request, "PIN_VERIFICATION_FAILED", user=user)
            return AuthResponse(
                success=False,
                message="Unable to verify pin right now",
                code="PIN_VERIFICATION_FAILED",
                details=None,
            )

    async def change_password(
        self,
        user: Users,
        current_password: str,
        new_password: str,
        request: Request | None = None,
        access_token: str | None = None,
    ) -> AuthResponse:
        try:
            user = self.db.exec(
                select(Users).where(Users.email == user.email)
            ).first()

            if not self.password_services.verify_password(current_password, user.password):
                self.audit.change_password(
                    request, 
                    "INCORRECT_CURRENT_PASSWORD", 
                    user=user,
                    access_token=access_token
                )
                return AuthResponse(
                    success=False,
                    message="Incorrect current password",
                    code="INCORRECT_CURRENT_PASSWORD",
                    details=None
                )

            if self.password_services.verify_password(new_password, user.password):
                self.audit.change_password(request, "SAME_PASSWORD", user=user, access_token=access_token)
                return AuthResponse(
                    success=False,
                    message="New password must be different from current password",
                    code="SAME_PASSWORD",
                    details=None
                )

            user.password = self.password_services.hash_password(new_password)
            user.has_default_credentials = user.has_default_credentials and self.__still_default(user.pin, settings.default_user_pin)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            self.audit.change_password(
                request,
                "PASSWORD_CHANGED",
                user=user,
                access_token=access_token,
            )

            return AuthResponse(
                success=True,
                message="Password changed successfully",
                code="PASSWORD_CHANGED",
                details=None
            )

        except Exception:
            self.db.rollback()
            self.audit.change_password(request, "CHANGE_PASSWORD_FAILED", user=user, access_token=access_token)
            return AuthResponse(
                success=False,
                message="Unable to change password right now",
                code="CHANGE_PASSWORD_FAILED",
                details=None
            )

    async def change_pin(
        self,
        user: Users,
        current_pin: str,
        new_pin: str,
        request: Request | None = None,
        access_token: str | None = None,
    ) -> AuthResponse:
        try:
            user = self.db.exec(
                select(Users).where(Users.email == user.email)
            ).first()

            if not self.password_services.verify_password(current_pin, user.pin):
                self.audit.change_pin(
                    request, 
                    "INCORRECT_CURRENT_PIN", 
                    user=user,
                    access_token=access_token
                )
                return AuthResponse(
                    success=False,
                    message="Incorrect current pin",
                    code="INCORRECT_CURRENT_PIN",
                    details=None
                )

            if self.password_services.verify_password(new_pin, user.pin):
                self.audit.change_pin(request, "SAME_PIN", user=user, access_token=access_token)
                return AuthResponse(
                    success=False,
                    message="New pin must be different from current pin",
                    code="SAME_PIN",
                    details=None
                )

            user.pin = self.password_services.hash_password(new_pin)
            user.has_default_credentials = user.has_default_credentials and self.__still_default(user.password, settings.default_user_password)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            self.audit.change_pin(
                request,
                "PIN_CHANGED",
                user=user,
                access_token=access_token,
            )

            return AuthResponse(
                success=True,
                message="Pin changed successfully",
                code="PIN_CHANGED",
                details=None
            )

        except Exception:
            self.db.rollback()
            self.audit.change_pin(request, "CHANGE_PIN_FAILED", user=user, access_token=access_token)
            return AuthResponse(
                success=False,
                message="Unable to change pin right now",
                code="CHANGE_PIN_FAILED",
                details=None
            )
