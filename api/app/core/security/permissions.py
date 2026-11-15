from enum import Enum

from .roles import Role


class Permission(str, Enum):
    CRAB_READ           = "crab:read"
    CRAB_WRITE          = "crab:write"
    BATCH_READ          = "batch:read"
    BATCH_CREATE        = "batch:create"
    LOG_READ            = "log:read"
    USER_READ           = "user:read"
    USER_CREATE         = "user:create"
    USER_UPDATE         = "user:update"
    USER_DEACTIVATE     = "user:deactivate"
    USER_RESET_CREDENTIALS = "user:reset_credentials"
    USER_MANAGE_ADMINS  = "user:manage_admins"
    EVENTS_READ         = "events:read"


USER_MANAGEMENT = frozenset({
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DEACTIVATE,
    Permission.USER_RESET_CREDENTIALS,
})

ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.ADMIN: frozenset(Permission),
    Role.STAFF: frozenset({
        Permission.CRAB_READ,
        Permission.CRAB_WRITE,
        Permission.BATCH_READ,
        Permission.BATCH_CREATE,
        Permission.LOG_READ,
        Permission.EVENTS_READ,
    }),
    Role.USER: frozenset({
        Permission.CRAB_READ,
        Permission.BATCH_READ,
        Permission.EVENTS_READ,
    }) | USER_MANAGEMENT,
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
