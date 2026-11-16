from enum import Enum
from typing import Protocol
from uuid import UUID


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


class Actor(Protocol):
    """Who did it, as audit sees it. Lets any module audit the current user without importing auth's Users."""

    id: UUID
    email: str
    role: Enum
