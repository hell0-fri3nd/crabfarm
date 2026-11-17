from typing import Self

from pydantic import model_validator
from sqlmodel import Field, SQLModel


class Crabs(SQLModel, table=True):
    """A crab is named by its group letter and a number (`A1`…`E5`). `Crabs(...)` skips validation,
    so new rows use `Crabs.model_validate(...)`."""

    __tablename__ = "crabs"
    __table_args__ = {"schema": "crab_management"}

    id: int | None = Field(default=None, primary_key=True)
    name: str      = Field(max_length=50, schema_extra={"pattern": r"^[A-Z][1-9]\d*$"}, unique=True)
    group_by: str  = Field(max_length=10, schema_extra={"pattern": r"^[A-Z]$"})

    @model_validator(mode="after")
    def check_name_in_group(self) -> Self:
        if not self.name.startswith(self.group_by):
            raise ValueError(f"Crab {self.name} isn't in group {self.group_by}")
        return self
