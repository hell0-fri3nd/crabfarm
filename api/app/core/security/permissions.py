from enum import Enum

from .roles import Role


class Permission(str, Enum):
    CRAB_READ       = "crab:read"
    CRAB_WRITE      = "crab:write"
    BATCH_READ      = "batch:read"
    BATCH_CREATE    = "batch:create"
    LOG_READ        = "log:read"
    USER_MANAGE     = "user:manage"

ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.ADMIN: frozenset(Permission),
    Role.STAFF: frozenset({
        Permission.CRAB_READ,
        Permission.CRAB_WRITE,
        Permission.BATCH_READ,
        Permission.BATCH_CREATE,
        Permission.LOG_READ,
    }),
    Role.USER: frozenset({
        Permission.CRAB_READ,
        Permission.BATCH_READ,
    }),
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
