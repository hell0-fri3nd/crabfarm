from datetime import datetime, time
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SAEnum,
    Time,
    true,
)
from sqlmodel import Field, func

from app.core import Base

SCHEMA = "devices"


class ScheduleDays(str, Enum):
    EVERY_DAY       = "every-day"
    WEEKDAYS        = "weekdays"
    WEEKENDS        = "weekends"
    MON_WED_FRI_SUN = "mon-wed-fri-sun"


class Schedules(Base, table=True):
    """A repeating feed. `feed_time` is farm-clock time, and `ScheduleGroups` lists the groups it feeds."""

    __tablename__ = "schedules"
    __table_args__ = {"schema": SCHEMA}

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=40)
    feed_time: time = Field(sa_column=Column(Time(timezone=False), nullable=False))
    days: ScheduleDays = Field(
        default=ScheduleDays.EVERY_DAY,
        sa_column=Column(
            SAEnum(
                ScheduleDays,
                name="schedule_days",
                schema=SCHEMA,
                values_callable=lambda e: [m.value for m in e],
            ),
            nullable=False,
            server_default=ScheduleDays.EVERY_DAY.value,
        ),
    )
    is_enabled: bool = Field(default=True, index=True, sa_column_kwargs={"server_default": true()})
    user_id: UUID = Field(index=True)

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()),
    )
    deleted_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
