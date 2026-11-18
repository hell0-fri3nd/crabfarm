from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum as SAEnum,
    Identity,
    UniqueConstraint,
)
from sqlmodel import Field, func

from app.core import Base

SCHEMA = "devices"


class WaterSensorName(str, Enum):
    TEMPERATURE = "temperature"
    PH          = "ph"
    SALINITY    = "salinity"
    AMMONIA     = "ammonia"
    TURBIDITY   = "turbidity"
    OXYGEN      = "oxygen"


class WaterSensorStatus(str, Enum):
    NORMAL  = "normal"
    WARNING = "warning"
    DANGER  = "danger"


class WaterSensorLogs(Base, table=True):
    """One sensor's value in one logging slot. The unique slot keeps a restarted worker from logging it twice."""

    __tablename__ = "water_sensor_logs"
    __table_args__ = (
        UniqueConstraint("sensor", "slot_at"),
        {"schema": SCHEMA},
    )

    id: int | None = Field(default=None, sa_column=Column(BigInteger, Identity(), primary_key=True))
    sensor: WaterSensorName = Field(
        index=True,
        sa_type=SAEnum(
            WaterSensorName,
            name="water_sensor_name",
            schema=SCHEMA,
            values_callable=lambda e: [m.value for m in e],
        ),
    )
    value: Decimal = Field(max_digits=10, decimal_places=3)
    status: WaterSensorStatus = Field(
        index=True,
        sa_type=SAEnum(
            WaterSensorStatus,
            name="water_sensor_status",
            schema=SCHEMA,
            values_callable=lambda e: [m.value for m in e],
        ),
    )
    measured_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False, index=True))
    slot_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
