from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status
)
from fastapi.security import HTTPAuthorizationCredentials
from sqlmodel import Session

from app.core.exceptions import AUDIT_ACTION_KEY
from app.core import (
    get_db,
    JwtManager,
    FieldException,
    ValidationErrorResponse
)

from ..dependencies import bearer, get_refresh_user, get_current_user
from ..models import Users
from ..schemas.auth_schemas import (
    PinRequest,
    SignInRequest,
    ChangePasswordRequest,
    ChangePinRequest,
    AuthResponse,
    ErrorResponse
)
from ..services import AuthServices, PasswordServices


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/sign-in",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in"},
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
    http_request: Request,
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
        request=http_request,
    )

    if result.code == "EMAIL_NOT_FOUND":
        raise FieldException(
            status_code=status.HTTP_404_NOT_FOUND,
            field="email",
            message=result.message,
            type="email_not_found",
            action="auth.sign_in",
        )

    if result.code == "INCORRECT_PASSWORD":
        raise FieldException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            field="password",
            message=result.message,
            type="incorrect_password",
            action="auth.sign_in",
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
    openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in.pin"},
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
    http_request: Request,
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
        request=http_request,
    )

    if result.code == "INVALID_PIN":
        raise FieldException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            field="pin",
            message=result.message,
            type="invalid_pin",
            action="auth.sign_in.pin",
        )

    if result.code == "PIN_VERIFICATION_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.message,
        )

    return result


@router.patch(
    "/change-password",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.change_password"},
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ValidationErrorResponse,
            "description": "Incorrect current password",
        },
        status.HTTP_409_CONFLICT: {
            "model": ValidationErrorResponse,
            "description": "New password is the same as the current password",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error during password change",
        },
    },
)
async def change_password(
    request: ChangePasswordRequest,
    http_request: Request,
    user: Users = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
)-> AuthResponse:
    password_services = PasswordServices()
    jwt_manager = JwtManager()
    auth_service = AuthServices(
        db=db,
        password_services=password_services,
        jwt_manager=jwt_manager
    )

    result = await auth_service.change_password(
        user=user,
        current_password=request.current_password,
        new_password=request.new_password,
        request=http_request,
        access_token=credentials.credentials,
    )

    if result.code == "INCORRECT_CURRENT_PASSWORD":
        raise FieldException(
            status_code=status.HTTP_400_BAD_REQUEST,
            field="current_password",
            message=result.message,
            type="invalid_current_password",
            action="auth.change_password",
        )

    if result.code == "SAME_PASSWORD":
        raise FieldException(
            status_code=status.HTTP_409_CONFLICT,
            field="new_password",
            message=result.message,
            type="same_password",
            action="auth.change_password",
        )

    if result.code == "CHANGE_PASSWORD_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.message,
        )

    return result


@router.patch(
    "/change-pin",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.change_pin"},
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ValidationErrorResponse,
            "description": "Incorrect current pin",
        },
        status.HTTP_409_CONFLICT: {
            "model": ValidationErrorResponse,
            "description": "New pin is the same as the current pin",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error during pin change",
        },
    },
)
async def change_pin(
    request: ChangePinRequest,
    http_request: Request,
    user: Users = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
)-> AuthResponse:
    password_services = PasswordServices()
    jwt_manager = JwtManager()
    auth_service = AuthServices(
        db=db,
        password_services=password_services,
        jwt_manager=jwt_manager
    )

    result = await auth_service.change_pin(
        user=user,
        current_pin=request.current_pin,
        new_pin=request.new_pin,
        request=http_request,
        access_token=credentials.credentials,
    )

    if result.code == "INCORRECT_CURRENT_PIN":
        raise FieldException(
            status_code=status.HTTP_400_BAD_REQUEST,
            field="current_pin",
            message=result.message,
            type="invalid_current_pin",
            action="auth.change_pin",
        )

    if result.code == "SAME_PIN":
        raise FieldException(
            status_code=status.HTTP_409_CONFLICT,
            field="new_pin",
            message=result.message,
            type="same_pin",
            action="auth.change_pin",
        )

    if result.code == "CHANGE_PIN_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.message,
        )

    return result