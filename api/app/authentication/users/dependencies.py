from typing import Annotated
from uuid import UUID

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlmodel import Session

from app.core import (
    get_db,
    JwtManager,
    Permission,
    Provide,
    has_permission,
)
from .models import Users
from .services import (
    AuditServices,
    AuthServices,
    UserServices,
)


bearer = HTTPBearer(auto_error=False)
audit = AuditServices()


class TokenAuth:
    """Resolves the user from a Bearer JWT of the given type ("access" or "refresh")."""

    def __init__(self, token_type: str):
        self.token_type = token_type

    def __reject(
        self,
        request: Request,
        credentials: HTTPAuthorizationCredentials | None,
        detail: str,
        reason: str,
    ) -> HTTPException:
        # session_hash is only ever an access token; a rejected refresh token is not hashed
        audit.token_rejected(
            request,
            self.token_type,
            reason,
            message=detail,
            access_token=credentials.credentials if credentials and self.token_type == "access" else None,
        )
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    def __call__(
        self,
        request: Request,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
        db: Session = Depends(get_db),
    ) -> Users:
        if credentials is None:
            raise self.__reject(request, credentials, "Not authenticated", "NOT_AUTHENTICATED")

        try:
            payload = JwtManager().decode_token(credentials.credentials)
        except ExpiredSignatureError:
            raise self.__reject(request, credentials, "Token expired", "TOKEN_EXPIRED")
        except InvalidTokenError:
            raise self.__reject(request, credentials, "Invalid token", "INVALID_TOKEN")

        if payload.get("type") != self.token_type:
            raise self.__reject(request, credentials, "Invalid token type", "INVALID_TOKEN_TYPE")

        try:
            user_id = UUID(payload.get("sub", ""))
        except ValueError:
            raise self.__reject(request, credentials, "Invalid token subject", "INVALID_TOKEN_SUBJECT")

        # Role is read from the DB, not the token, so role changes apply immediately
        user = db.get(Users, user_id)
        if not user:
            raise self.__reject(request, credentials, "User not found", "USER_NOT_FOUND")
        if not user.is_active:
            raise self.__reject(request, credentials, "User is deactivated", "USER_INACTIVE")

        # Later audit events in this request (e.g. a 422 on the body) use these as the actor
        request.state.user = user
        if self.token_type == "access":
            request.state.access_token = credentials.credentials

        return user


get_current_user = TokenAuth("access")
get_refresh_user = TokenAuth("refresh")


class RequirePermissions:
    """Ensures the access-token user's role grants every listed permission."""

    def __init__(self, *permissions: Permission):
        self.permissions = permissions

    def __call__(self, request: Request, user: Users = Depends(get_current_user)) -> Users:
        missing = [p.value for p in self.permissions if not has_permission(user.role, p)]
        if missing:
            audit.permission_denied(
                request,
                user,
                missing,
                access_token=getattr(request.state, "access_token", None),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission(s): {', '.join(missing)}",
            )
        return user


require_permissions = RequirePermissions


type CurrentUser = Annotated[Users, Depends(get_current_user)]
type CanReadUsers = Annotated[Users, Depends(require_permissions(Permission.USER_READ))]
type CanCreateUsers = Annotated[Users, Depends(require_permissions(Permission.USER_CREATE))]
type CanUpdateUsers = Annotated[Users, Depends(require_permissions(Permission.USER_UPDATE))]
type CanDeactivateUsers = Annotated[Users, Depends(require_permissions(Permission.USER_DEACTIVATE))]
type CanResetCredentials = Annotated[Users, Depends(require_permissions(Permission.USER_RESET_CREDENTIALS))]
type AuthServicesDep = Annotated[AuthServices, Depends(Provide(AuthServices))]
type UserServicesDep = Annotated[UserServices, Depends(Provide(UserServices))]
