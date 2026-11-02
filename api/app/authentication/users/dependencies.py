from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlmodel import Session

from app.core import get_db, JwtManager, Permission, has_permission
from .models import Users


bearer = HTTPBearer(auto_error=False)


class TokenAuth:
    """Resolves the user from a Bearer JWT of the given type ("access" or "refresh")."""

    def __init__(self, token_type: str):
        self.token_type = token_type

    @staticmethod
    def _unauthorized(detail: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    def __call__(
        self,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
        db: Session = Depends(get_db),
    ) -> Users:
        if credentials is None:
            raise self._unauthorized("Not authenticated")

        try:
            payload = JwtManager().decode_token(credentials.credentials)
        except ExpiredSignatureError:
            raise self._unauthorized("Token expired")
        except InvalidTokenError:
            raise self._unauthorized("Invalid token")

        if payload.get("type") != self.token_type:
            raise self._unauthorized("Invalid token type")

        try:
            user_id = UUID(payload.get("sub", ""))
        except ValueError:
            raise self._unauthorized("Invalid token subject")

        # Role is read from the DB, not the token, so role changes apply immediately
        user = db.get(Users, user_id)
        if not user:
            raise self._unauthorized("User not found")

        return user


get_current_user = TokenAuth("access")
get_refresh_user = TokenAuth("refresh")


class RequirePermissions:
    """Ensures the access-token user's role grants every listed permission."""

    def __init__(self, *permissions: Permission):
        self.permissions = permissions

    def __call__(self, user: Users = Depends(get_current_user)) -> Users:
        missing = [p.value for p in self.permissions if not has_permission(user.role, p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission(s): {', '.join(missing)}",
            )
        return user


require_permissions = RequirePermissions
