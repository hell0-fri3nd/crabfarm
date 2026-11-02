from enum import Enum


class Role(str, Enum):
    ADMIN   = "DEVELOPER"
    USER    = "USER"
    STAFF   = "STAFF"
