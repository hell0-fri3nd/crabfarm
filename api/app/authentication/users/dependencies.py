from typing import Annotated

from fastapi import Depends

from app.core import (
    Provide,
    Role,
    TokenAuth,
    bearer,
    require_roles,
)
from .models import Users
from .services import AuthServices, UserServices


get_current_user = TokenAuth("access", Users)
get_refresh_user = TokenAuth("refresh", Users)

type CurrentUser = Annotated[Users, Depends(get_current_user)]

type DeveloperOnly = Annotated[Users, Depends(require_roles(get_current_user, Role.DEVELOPER))]
type DeveloperOrAdmin = Annotated[Users, Depends(require_roles(get_current_user, Role.DEVELOPER, Role.ADMIN))]
type AnyRole = Annotated[Users, Depends(require_roles(get_current_user, *Role))]

type AuthServicesDep = Annotated[AuthServices, Depends(Provide(AuthServices))]
type UserServicesDep = Annotated[UserServices, Depends(Provide(UserServices))]

__all__ = [
    "bearer",
    "get_current_user",
    "get_refresh_user",
    "CurrentUser",
    "DeveloperOnly",
    "DeveloperOrAdmin",
    "AnyRole",
    "AuthServicesDep",
    "UserServicesDep",
]
