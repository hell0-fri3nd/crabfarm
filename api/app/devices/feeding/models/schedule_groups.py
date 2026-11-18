from uuid import UUID

from sqlmodel import Field

from app.core import Base

SCHEMA = "devices"


class ScheduleGroups(Base, table=True):
    """One cage group a schedule feeds. `group_code` matches `Cages.group_code`."""

    __tablename__ = "schedule_groups"
    __table_args__ = {"schema": SCHEMA}

    schedule_id: UUID = Field(foreign_key="devices.schedules.id", ondelete="CASCADE", primary_key=True)
    group_code: str = Field(max_length=10, primary_key=True, index=True, schema_extra={"pattern": r"^[A-Z]$"})
