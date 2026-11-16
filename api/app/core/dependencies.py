from collections.abc import Callable
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from .audit import AuditServices, Outcome
from .database import get_db
from .schemas import AuthUser
from .security import JwtManager, Role


type DbSession = Annotated[Session, Depends(get_db)]

audit = AuditServices()
bearer = HTTPBearer(auto_error=False)


class TokenAuth:
    """Validates a Bearer JWT of the given type ("access" or "refresh") and returns the user named in
    its claims. Nothing is read from the DB, so a role change or deactivation applies once the access
    token expires; `authentication` loads the row where it must be fresh (refresh, own account)."""

    def __init__(self, token_type: str):
        self.token_type = token_type

    def __session_token(self, request: Request, credentials: HTTPAuthorizationCredentials | None) -> str | None:
        if self.token_type != "access":
            return None
        return credentials.credentials if credentials else getattr(request.state, "access_token", None)

    def reject(
        self,
        request: Request,
        credentials: HTTPAuthorizationCredentials | None,
        detail: str,
        reason: str,
    ) -> HTTPException:
        # session_hash is only ever an access token; a rejected refresh token is not hashed
        audit.record(
            action=f"auth.{self.token_type}_token_rejected",
            outcome=Outcome.FAILURE,
            request=request,
            session_token=self.__session_token(request, credentials),
            http_status=status.HTTP_401_UNAUTHORIZED,
            reason=reason,
            changes=audit.build_errors(("authorization", detail, reason.lower())),
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
    ) -> AuthUser:
        if credentials is None:
            raise self.reject(request, credentials, "Not authenticated", "NOT_AUTHENTICATED")

        try:
            payload = JwtManager().decode_token(credentials.credentials)
        except ExpiredSignatureError:
            raise self.reject(request, credentials, "Token expired", "TOKEN_EXPIRED")
        except InvalidTokenError:
            raise self.reject(request, credentials, "Invalid token", "INVALID_TOKEN")

        if payload.get("type") != self.token_type:
            raise self.reject(request, credentials, "Invalid token type", "INVALID_TOKEN_TYPE")

        try:
            user = AuthUser(
                id=payload.get("sub"),
                role=payload.get("role"),
                email=payload.get("email"),
                expires_at=payload.get("exp"),
            )
        except ValidationError:
            raise self.reject(request, credentials, "Invalid token claims", "INVALID_TOKEN_CLAIMS")

        # Later audit events in this request (e.g. a 422 on the body) use these as the actor
        request.state.user = user
        if self.token_type == "access":
            request.state.access_token = credentials.credentials

        return user


get_current_user = TokenAuth("access")


class Provide[T]:
    """Builds a service class with the request's DB session, so routers never construct services."""

    def __init__(self, service_cls: type[T]):
        self.service_cls = service_cls

    def __call__(self, db: DbSession) -> T:
        return self.service_cls(db)


def require_roles(*roles: Role) -> Callable[..., AuthUser]:
    """Ensures the current user has one of the listed roles."""

    def guard(request: Request, actor: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
        if actor.role not in roles:
            detail = "Your role can't do this"
            audit.record(
                action="auth.role_denied",
                outcome=Outcome.DENIED,
                request=request,
                actor=actor,
                session_token=getattr(request.state, "access_token", None),
                http_status=status.HTTP_403_FORBIDDEN,
                reason=f"Role {actor.role.name} not in {', '.join(r.name for r in roles)}",
                changes=audit.build_errors(("role", detail, "role_denied")),
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
        return actor

    return guard


type CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
type DeveloperOnly = Annotated[AuthUser, Depends(require_roles(Role.DEVELOPER))]
type DeveloperOrAdmin = Annotated[AuthUser, Depends(require_roles(Role.DEVELOPER, Role.ADMIN))]
type AnyRole = Annotated[AuthUser, Depends(require_roles(*Role))]
