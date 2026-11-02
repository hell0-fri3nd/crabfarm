from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, func, SQLModel
from sqlalchemy import Column, Enum as SAEnum
from app.core.security import Role

class Users(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id: UUID        = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str       = Field(max_length=150)
    email: str      = Field(max_length=254, unique=True, index=True)
    password: str   = Field(max_length=255)
    pin: str        = Field(max_length=4, nullable=True, default=None)
    role: Role      = Field(
                        default=Role.USER,
                        sa_column=Column(
                            SAEnum(
                                Role,
                                name="user_role",
                                schema="auth",
                                native_enum=True,
                            ),
                            nullable=False,
                            default=Role.USER,
                            server_default=Role.USER.value,
                        )
                    )

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
