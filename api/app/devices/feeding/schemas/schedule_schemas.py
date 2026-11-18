from datetime import datetime, time
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.core import PageQuery
from ..models import ScheduleDays

FEED_MINUTES = (0, 30)


def __check_farm_clock_time(value: time) -> time:
    if value.tzinfo is not None:
        raise ValueError("Send the farm clock time without a time zone")
    if value.minute not in FEED_MINUTES:
        raise ValueError("Pick a time on the hour or half hour")
    return value.replace(second=0, microsecond=0)


def __drop_repeated_groups(value: list[str]) -> list[str]:
    return sorted(set(value))


type GroupCode = Annotated[str, Field(pattern=r"^[A-Z]$")]
type ScheduleName = Annotated[str, Field(min_length=1, max_length=40)]
type FeedTime = Annotated[time, AfterValidator(__check_farm_clock_time)]
type GroupCodes = Annotated[list[GroupCode], Field(min_length=1, max_length=26), AfterValidator(__drop_repeated_groups)]


class CreateScheduleRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {"name": "Morning", "feed_time": "06:00", "days": "every-day", "group_codes": ["A", "B"]},
        },
    )

    name: ScheduleName
    feed_time: FeedTime
    days: ScheduleDays = ScheduleDays.EVERY_DAY
    group_codes: GroupCodes


class UpdateScheduleRequest(BaseModel):
    """Only the sent fields change. Every role may send `is_enabled`; the rest are for DEVELOPER and ADMIN."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={"example": {"name": "Morning", "feed_time": "06:30", "group_codes": ["A", "B"]}},
    )

    name: ScheduleName | None = None
    feed_time: FeedTime | None = None
    days: ScheduleDays | None = None
    group_codes: GroupCodes | None = None
    is_enabled: bool | None = None

    @model_validator(mode="after")
    def check_has_values(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Send at least one field to change")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Schedule fields can't be null")
        return self


class ListSchedulesQuery(PageQuery):
    pass


class NextFeedRead(BaseModel):
    schedule_name: str
    feed_time: time
    at: datetime
    day_offset: int = Field(ge=0)


class ScheduleRead(BaseModel):
    id: UUID
    name: str
    feed_time: time
    days: ScheduleDays
    group_codes: list[str]
    is_enabled: bool
    user_id: UUID
    created_at: datetime
    updated_at: datetime
