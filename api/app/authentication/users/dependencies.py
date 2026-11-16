from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request

from app.core import (
    AuthUser,
    CurrentUser,
    DbSession,
    DeveloperOrAdmin,
    Provide,
    TokenAuth,
    bearer,
    get_current_user,
)
from .models import Users
from .services import AuthServices, UserServices


def load_user(token: TokenAuth) -> Callable[..., Users]:
    """Loads the row of the user `token` names and refuses deactivated accounts. Core's guards trust
    the token, so this is where a deactivation or role change is enforced: at refresh, and on the
    endpoints that change the user's own account."""

    def loader(
        request: Request,
        db: DbSession,
        actor: Annotated[AuthUser, Depends(token)],
    ) -> Users:
        user = db.get(Users, actor.id)
        if not user:
            raise token.reject(request, None, "User not found", "USER_NOT_FOUND")
        if not user.is_active:
            raise token.reject(request, None, "User is deactivated", "USER_INACTIVE")
        request.state.user = user
        return user

    return loader


get_refresh_user = load_user(TokenAuth("refresh"))

type AccountUser = Annotated[Users, Depends(load_user(get_current_user))]

type AuthServicesDep = Annotated[AuthServices, Depends(Provide(AuthServices))]
type UserServicesDep = Annotated[UserServices, Depends(Provide(UserServices))]

__all__ = [
    "bearer",
    "get_current_user",
    "get_refresh_user",
    "AccountUser",
    "CurrentUser",
    "DeveloperOrAdmin",
    "AuthServicesDep",
    "UserServicesDep",
]
