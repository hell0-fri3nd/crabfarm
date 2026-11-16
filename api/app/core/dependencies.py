from collections.abc import Callable
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

from .audit import Actor, AuditServices, Outcome
from .database import get_db
from .security import JwtManager, Role


type DbSession = Annotated[Session, Depends(get_db)]

audit = AuditServices()
bearer = HTTPBearer(auto_error=False)


class TokenAuth:
    """Resolves the `model` row named by a Bearer JWT of the given type ("access" or "refresh").
    The model is a parameter so core never imports the domain that owns it."""

    def __init__(self, token_type: str, model: type):
        self.token_type = token_type
        self.model = model

    def __reject(
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
            session_token=credentials.credentials if credentials and self.token_type == "access" else None,
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
        db: DbSession,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ):
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
        user = db.get(self.model, user_id)
        if not user:
            raise self.__reject(request, credentials, "User not found", "USER_NOT_FOUND")
        if not user.is_active:
            raise self.__reject(request, credentials, "User is deactivated", "USER_INACTIVE")

        # Later audit events in this request (e.g. a 422 on the body) use these as the actor
        request.state.user = user
        if self.token_type == "access":
            request.state.access_token = credentials.credentials

        return user


class Provide[T]:
    """Builds a service class with the request's DB session, so routers never construct services."""

    def __init__(self, service_cls: type[T]):
        self.service_cls = service_cls

    def __call__(self, db: DbSession) -> T:
        return self.service_cls(db)


def require_roles(current_user: Callable[..., Actor], *roles: Role) -> Callable[..., Actor]:
    """Ensures the user from `current_user` has one of the listed roles. The user dependency is a
    parameter because core can't import the authentication domain that loads it."""

    def guard(request: Request, actor: Annotated[Actor, Depends(current_user)]) -> Actor:
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
