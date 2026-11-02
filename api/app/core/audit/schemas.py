from enum import Enum


class Outcome(str, Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    DENIED  = "DENIED"
    ERROR   = "ERROR"


class Severity(str, Enum):
    INFO     = "INFO"
    WARNING  = "WARNING"
    ERROR    = "ERROR"
    CRITICAL = "CRITICAL"


class ActorType(str, Enum):
    DEVELOPER = "DEVELOPER"
    ADMIN     = "ADMIN"
    STAFF     = "STAFF"
    USER      = "USER"
    ANONYMOUS = "ANONYMOUS"
    SYSTEM    = "SYSTEM"
