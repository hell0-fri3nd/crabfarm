from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Self
from uuid import UUID

from pydantic import model_validator
from sqlalchemy import Enum as SAEnum
from sqlmodel import (
    Field,
    SQLModel,
    func,
)


class LogType(str, Enum):
    PREDICTION = "prediction"
    ACTUAL     = "actual"


class Logs(SQLModel, table=True):
    """The bounds match CreateLogRequest. A table model skips validation in `Logs(...)`, so rows built in code
    (prediction logs) go through `Logs.model_validate(...)` to be checked."""

    __tablename__ = "logs"
    __table_args__ = {"schema": "crab_management"}

    id: int | None       = Field(default=None, primary_key=True)
    batch_id: int | None = Field(default=None, gt=0, foreign_key="crab_management.batches.id", index=True)
    crab_id: int         = Field(gt=0, foreign_key="crab_management.crabs.id", index=True)
    user_id: UUID        = Field(nullable=False, index=True)
    log_type: LogType    = Field(
                            index=True,
                            sa_type=SAEnum(
                                LogType,
                                name="log_type",
                                schema="crab_management",
                                values_callable=lambda e: [m.value for m in e],
                            ),
                        )
    width_mm: Decimal | None = Field(default=None, gt=0, le=300, max_digits=10, decimal_places=2)
    weight_g: Decimal | None = Field(default=None, gt=0, le=5000, max_digits=10, decimal_places=2)

    created_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )

    @model_validator(mode="after")
    def check_has_measurement(self) -> Self:
        if self.width_mm is None and self.weight_g is None:
            raise ValueError("A log needs width_mm, weight_g or both")
        return self
