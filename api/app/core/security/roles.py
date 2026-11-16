from enum import Enum


class Role(str, Enum):
    DEVELOPER = "DEVELOPER"
    ADMIN     = "ADMIN"
    STAFF     = "STAFF"
