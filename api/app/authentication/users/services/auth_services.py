import logging

from sqlmodel import Session, select

from app.core import JwtManager
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
    ):
        self.db = db
        self.password_services = password_services
        self.jwt_manager = jwt_manager

    async def sign_in(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
    ) -> AuthResponse:
        try:
            user = self.db.exec(
                select(Users).where(Users.email == email)
            ).first()

            if not user:
                return AuthResponse(
                    success=False,
                    message="Email not found",
                    code="EMAIL_NOT_FOUND",
                    details=None
                )

            if not self.password_services.verify_password(password, user.password):
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
    ) -> AuthResponse:
        try:
            if not self.password_services.verify_password(pin, user.pin):
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
            logger.exception("Pin verification failed for user %s", user.id)
            return AuthResponse(
                success=False,
                message="Unable to verify pin right now",
                code="PIN_VERIFICATION_FAILED",
                details=None,
            )
