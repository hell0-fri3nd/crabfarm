from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)

from app.core import (
    FieldException,
    Page,
    ValidationErrorResponse,
)
from app.core.exceptions import AUDIT_ACTION_KEY

from ..dependencies import (
    CanCreateUsers,
    CanDeactivateUsers,
    CanReadUsers,
    CanResetCredentials,
    CanUpdateUsers,
    UserServicesDep,
    get_current_user,
)
from ..schemas import (
    CreateUserRequest,
    ErrorResponse,
    ListUsersQuery,
    Response,
    UpdateUserRequest,
    UserRead,
)


router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)])

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}
NOT_FOUND = {"model": ValidationErrorResponse, "description": "User not found"}
ADMIN_REQUIRED = {"model": ValidationErrorResponse, "description": "Missing permission, or only an admin can manage admin accounts"}
INVALID = {"model": ValidationErrorResponse, "description": "Invalid request fields"}


def __raise_for(result: Response, action: str) -> None:
    """Maps a failed service code to its HTTP error (02 §6)."""
    if result:
        return None

    match result.code:
        case "USER_NOT_FOUND":
            raise FieldException(status.HTTP_404_NOT_FOUND, "path.user_id", result.message, "user_not_found", detail=result.message, action=action)
        case "EMAIL_ALREADY_EXISTS":
            raise FieldException(status.HTTP_409_CONFLICT, "email", result.message, "email_already_exists", detail=result.message, action=action)
        case "ADMIN_ROLE_REQUIRED":
            raise FieldException(status.HTTP_403_FORBIDDEN, "role", result.message, "admin_role_required", detail=result.message, action=action)
        case "CANNOT_DEACTIVATE_SELF":
            raise FieldException(status.HTTP_409_CONFLICT, "path.user_id", result.message, "cannot_deactivate_self", detail=result.message, action=action)
        case "CANNOT_RESET_OWN_CREDENTIALS":
            raise FieldException(status.HTTP_409_CONFLICT, "path.user_id", result.message, "cannot_reset_own_credentials", detail=result.message, action=action)
        case _:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.message)


@router.post(
    "",
    response_model=Response[UserRead],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "user.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ADMIN_REQUIRED,
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "Email already exists"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error creating the user"},
    },
)
def create_user(
    payload: CreateUserRequest,
    request: Request,
    actor: CanCreateUsers,
    services: UserServicesDep,
):
    result = services.create(payload, actor=actor, request=request)
    __raise_for(result, "user.create")
    return result


@router.get(
    "",
    response_model=Response[Page[UserRead]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "user.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse, "description": "Missing user:read permission"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing users"},
    },
)
def list_users(
    query: Annotated[ListUsersQuery, Query()],
    request: Request,
    actor: CanReadUsers,
    services: UserServicesDep,
):
    result = services.list(query, actor=actor, request=request)
    __raise_for(result, "user.list")
    return result


@router.get(
    "/{user_id}",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "user.get"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse, "description": "Missing user:read permission"},
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error retrieving the user"},
    },
)
def get_user(user_id: UUID, request: Request, actor: CanReadUsers, services: UserServicesDep):
    result = services.get(user_id, actor=actor, request=request)
    __raise_for(result, "user.get")
    return result


@router.patch(
    "/{user_id}",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "user.update"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ADMIN_REQUIRED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "Email already exists"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error updating the user"},
    },
)
def update_user(
    user_id: UUID,
    payload: UpdateUserRequest,
    request: Request,
    actor: CanUpdateUsers,
    services: UserServicesDep,
):
    result = services.update(user_id, payload, actor=actor, request=request)
    __raise_for(result, "user.update")
    return result


@router.delete(
    "/{user_id}",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "user.deactivate"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ADMIN_REQUIRED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "Cannot deactivate your own account"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error deactivating the user"},
    },
)
def deactivate_user(user_id: UUID, request: Request, actor: CanDeactivateUsers, services: UserServicesDep):
    result = services.deactivate(user_id, actor=actor, request=request)
    __raise_for(result, "user.deactivate")
    return result


@router.post(
    "/{user_id}/reactivate",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "user.reactivate"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ADMIN_REQUIRED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error reactivating the user"},
    },
)
def reactivate_user(user_id: UUID, request: Request, actor: CanDeactivateUsers, services: UserServicesDep):
    result = services.reactivate(user_id, actor=actor, request=request)
    __raise_for(result, "user.reactivate")
    return result


@router.post(
    "/{user_id}/reset-credentials",
    response_model=Response[UserRead],
    status_code=status.HTTP_200_OK,
    summary="Reset a user's password and pin to the defaults",
    openapi_extra={AUDIT_ACTION_KEY: "user.reset_credentials"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ADMIN_REQUIRED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "Use /auth/change-password and /auth/change-pin for your own account"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: INVALID,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error resetting the credentials"},
    },
)
def reset_user_credentials(user_id: UUID, request: Request, actor: CanResetCredentials, services: UserServicesDep):
    result = services.reset_credentials(user_id, actor=actor, request=request)
    __raise_for(result, "user.reset_credentials")
    return result
