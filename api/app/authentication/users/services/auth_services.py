import logging
from datetime import datetime, timezone


from fastapi import Request
from sqlmodel import Session, select

from app.core import JwtManager
from .audit_services import AuditServices
from .password_services import PasswordServices
from ..models import Users
from ..schemas import AuthResponse

logger = logging.getLogger(__name__)


class AuthServices:
    def __init__(
        self,
        db: Session,
        password_services: PasswordServices,
        jwt_manager: JwtManager,
        audit: AuditServices | None = None,
    ):
        self.db = db
        self.password_services = password_services
        self.jwt_manager = jwt_manager
        self.audit = audit or AuditServices()

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
            logger.exception("Password change failed for user %s", user.id)
            self.audit.change_password(request, "CHANGE_PASSWORD_FAILED", user=user, access_token=access_token)
            return AuthResponse(
                success=False,
                message="Unable to change password right now",
                code="CHANGE_PASSWORD_FAILED",
                details=None
            )
