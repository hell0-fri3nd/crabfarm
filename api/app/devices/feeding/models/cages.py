from datetime import datetime
from typing import Self
from uuid import UUID, uuid4

from pydantic import model_validator
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    true,
)
from sqlmodel import Field, func

from app.core import Base

SCHEMA = "devices"


class Cages(Base, table=True):
    """A cage, named like its crab (`A1`…`E5`). `Cages(...)` skips validation, so new rows use `Cages.model_validate(...)`."""

    __tablename__ = "cages"
    __table_args__ = (
        CheckConstraint("left(cage_name, 1) = group_code", name="name_in_group"),
        {"schema": SCHEMA},
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    group_code: str = Field(max_length=10, index=True, schema_extra={"pattern": r"^[A-Z]$"})
    cage_name: str = Field(max_length=50, unique=True, schema_extra={"pattern": r"^[A-Z][1-9]\d*$"})
    is_active: bool = Field(default=True, sa_column_kwargs={"server_default": true()})

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()),
    )

    @model_validator(mode="after")
    def check_name_in_group(self) -> Self:
        if not self.cage_name.startswith(self.group_code):
            raise ValueError(f"Cage {self.cage_name} isn't in group {self.group_code}")
        return self
