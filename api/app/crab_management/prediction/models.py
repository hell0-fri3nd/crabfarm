from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel, func


class Type(str, Enum):
    PREDICTION = "prediction"
    ACTUAL     = "actual"


class CrabLogs(SQLModel, table=True):
    __tablename__ = "crab_logs"
    __table_args__ = {"schema": "crab_management"}

    id: int | None       = Field(default=None, primary_key=True)
    batch_id: int | None = Field(default=None, foreign_key="crab_management.batch_crabs.id", index=True)
    crab_id: int         = Field(foreign_key="crab_management.crabs.id", index=True)
    user_id: UUID        = Field(nullable=False, index=True)
    type: Type    = Field(
        index=True,
        sa_type=SAEnum(
            Type,
            name="crab_logs_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
    )
    width: Decimal | None  = Field(default=None, max_digits=10, decimal_places=2)
    weight: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)

    created_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )
