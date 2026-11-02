from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)
from sqlmodel import Session

from app.core import (
    get_db,
    JwtManager,
    FieldException,
    ValidationErrorResponse
)

from ..dependencies import get_refresh_user
from ..models import Users
from ..schemas.auth_schemas import (
    PinRequest,
    SignInRequest,
    AuthResponse,
    ErrorResponse
)
from ..services import AuthServices, PasswordServices


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/sign-in",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ValidationErrorResponse,
            "description": "Email not found",
        },
        status.HTTP_401_UNAUTHORIZED: {
            "model": ValidationErrorResponse,
            "description": "Incorrect password",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ValidationErrorResponse,
            "description": "Invalid email format or password length",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error during sign-in",
        },
    },
)
async def sign_in(
    request: SignInRequest,
    db: Session = Depends(get_db),
):
    
    password_services = PasswordServices()
    jwt_manager = JwtManager()
    auth_service = AuthServices(
        db=db,
        password_services=password_services,
        jwt_manager=jwt_manager
    )

    result = await auth_service.sign_in(
        email=request.email,
        password=request.password,
        remember_me=request.remember_me,
    )

    if result.code == "EMAIL_NOT_FOUND":
        raise FieldException(
            status_code=status.HTTP_404_NOT_FOUND,
            field="email",
            message=result.message,
            type="email_not_found",
        )

    if result.code == "INCORRECT_PASSWORD":
        raise FieldException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            field="password",
            message=result.message,
            type="incorrect_password",
        )

    if result.code == "SIGN_IN_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.message,
        )

    return result


@router.post(
    "/sign-in/pin",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ValidationErrorResponse,
            "description": "Incorrect pin (missing/invalid refresh token returns a plain detail)",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ValidationErrorResponse,
            "description": "Pin is not exactly 4 digits",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error during pin verification",
        },
    },
)
async def pin(
    request: PinRequest,
    user: Users = Depends(get_refresh_user),
    db: Session = Depends(get_db),
)-> AuthResponse:
    password_services = PasswordServices()
    jwt_manager = JwtManager()
    auth_service = AuthServices(
        db=db,
        password_services=password_services,
        jwt_manager=jwt_manager
    )

    result = await auth_service.pin(
        user=user,
        pin=request.pin,
    )

    if result.code == "INVALID_PIN":
        raise FieldException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            field="pin",
            message=result.message,
            type="invalid_pin",
        )

    if result.code == "PIN_VERIFICATION_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.message,
        )

    return result