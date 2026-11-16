from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials
from sqlmodel import Session

from app.core.exceptions import AUDIT_ACTION_KEY
from app.core import (
    get_db,
    JwtManager,
    ErrorResponse,
    RaiseFor,
    Response,
    ValidationErrorResponse,
)
from app.core.security import rate_limit

from ..dependencies import (
    AccountUser,
    AuthServicesDep,
    CurrentUser,
    bearer,
    get_refresh_user,
)
from ..models import Users
from ..schemas import (
    ActivityQuery,
    ActivityRead,
    PinRequest,
    SignInRequest,
    ChangePasswordRequest,
    ChangePinRequest,
    OnboardingRequest,
    AuthResponse,
    UpdateMeRequest,
    UserRead,
)
from ..services import AuthServices, PasswordServices
from ..services.audit_services import ERRORS, OUTCOMES


router = APIRouter(prefix="/auth", tags=["Authentication"])

raise_for = RaiseFor(OUTCOMES, ERRORS)

TOO_MANY_ATTEMPTS = {
    status.HTTP_429_TOO_MANY_REQUESTS: {
        "model": ErrorResponse,
        "description": "Too many attempts from this client; retry after Retry-After seconds",
    },
}


@router.get(
    "/me",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.me"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Missing, invalid or expired access token, or the user is deactivated",
        },
    },
)
def me(user: AccountUser, services: AuthServicesDep):
    return services.me(user)


@router.post(
    "/onboarding",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.onboarding"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Missing, invalid or expired access token, or the user is deactivated",
        },
        status.HTTP_409_CONFLICT: {
            "model": ValidationErrorResponse,
            "description": "Already set up, or the new password or pin is still the default",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ValidationErrorResponse,
            "description": "Password not 8 to 128 characters, or pin not exactly 4 digits",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error saving the new credentials",
        },
    },
)
def complete_onboarding(
    payload: OnboardingRequest,
    http_request: Request,
    user: AccountUser,
    services: AuthServicesDep,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> AuthResponse:
    result = services.complete_onboarding(user, payload, request=http_request, access_token=credentials.credentials)
    raise_for(result, "auth.onboarding")
    return result


@router.get(
    "/me/activity",
    response_model=Response[list[ActivityRead]],
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Missing, invalid or expired access token, or the user is deactivated",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ValidationErrorResponse,
            "description": "limit is not between 1 and 50",
        },
    },
)
def my_activity(query: Annotated[ActivityQuery, Query()], user: CurrentUser, services: AuthServicesDep):
    return services.my_activity(user, query)


@router.patch(
    "/me",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.update_me"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Missing, invalid or expired access token, or the user is deactivated",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ValidationErrorResponse,
            "description": "Name is not 2 to 150 characters, or the body has fields other than name",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected error updating the profile",
        },
    },
)
def update_me(payload: UpdateMeRequest, request: Request, user: AccountUser, services: AuthServicesDep):
    result = services.update_me(user, payload, request=request)
    raise_for(result, "auth.update_me")
    return result


@router.post(
    "/sign-in",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in"},
    dependencies=[Depends(rate_limit("auth.sign_in"))],
    responses={
        **TOO_MANY_ATTEMPTS,
        status.HTTP_404_NOT_FOUND: {
            "model": ValidationErrorResponse,
            "description": "Email not found",
        },
        status.HTTP_401_UNAUTHORIZED: {
            "model": ValidationErrorResponse,
            "description": "Incorrect password",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ValidationErrorResponse,
            "description": "Account is deactivated",
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
    raise_for(result, "auth.sign_in")
    return result


@router.post(
    "/sign-in/pin",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in.pin"},
    dependencies=[Depends(rate_limit("auth.sign_in.pin"))],
    responses={
        **TOO_MANY_ATTEMPTS,
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
    raise_for(result, "auth.sign_in.pin")
    return result


@router.post(
    "/sign-out",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "auth.sign_out"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Missing, invalid or expired refresh token, or the user is deactivated",
        },
    },
)
def sign_out(
    http_request: Request,
    services: AuthServicesDep,
    user: Users = Depends(get_refresh_user),
) -> AuthResponse:
    return services.sign_out(user, request=http_request)


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
    user: AccountUser,
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
    raise_for(result, "auth.change_password")
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
    user: AccountUser,
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
    raise_for(result, "auth.change_pin")
    return result