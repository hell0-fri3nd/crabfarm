from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, func, SQLModel

from enum import Enum

class Role(str, Enum):
    ADMIN   = "DEVELOPER"
    USER    = "USER"
    STAFF   = "STAFF"

class Users(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id: UUID        = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str       = Field(max_length=150)
    email: str      = Field(max_length=254, unique=True, index=True)
    password: str   = Field(max_length=255)
    pin: str        = Field(max_length=255)
    role: Role      = Field(default=Role.USER)

    created_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )
    updated_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
    )
