from datetime import date, datetime, time
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import CHAR, Column, Computed, Date, DateTime, Text, text
from sqlalchemy.dialects.postgresql import INET, JSONB, TIME
from sqlmodel import Field, SQLModel, func

LOCAL_TZ = "Asia/Manila"


class AuditEvents(SQLModel, table=True):
    __tablename__ = "audit_events"
    __table_args__ = {"schema": "audit"}

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        sa_column_kwargs={"server_default": text("gen_random_uuid()")},
    )

    # When
    occurred_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    )
    recorded_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    occurred_date: date | None = Field(
        default=None,
        sa_column=Column(
            Date,
            Computed(f"((occurred_at AT TIME ZONE '{LOCAL_TZ}')::DATE)", persisted=True),
        ),
    )
    occurred_time: time | None = Field(
        default=None,
        sa_column=Column(
            TIME(precision=0),
            Computed(f"((occurred_at AT TIME ZONE '{LOCAL_TZ}')::TIME(0))", persisted=True),
        ),
    )

    # Who
    actor_id: UUID | None     = Field(default=None, index=True)
    actor_type: str           = Field(max_length=16)
    actor_role: str | None    = Field(default=None, max_length=32)
    actor_email: str | None   = Field(default=None, max_length=320)
    session_hash: str | None  = Field(default=None, sa_column=Column(CHAR(64)))

    # Where (client)
    source_ip: str | None     = Field(default=None, sa_column=Column(INET))
    user_agent: str | None    = Field(default=None, sa_column=Column(Text))
    geo_country: str | None   = Field(default=None, max_length=64)
    geo_city: str | None      = Field(default=None, max_length=128)
    page_path: str | None     = Field(default=None, sa_column=Column(Text))

    # Where (system)
    service: str              = Field(max_length=32)
    source: str | None        = Field(default=None, max_length=16)
    version: str | None       = Field(default=None, max_length=32)
    environment: str | None   = Field(default=None, max_length=16)
    http_method: str | None   = Field(default=None, max_length=8)
    http_path: str | None     = Field(default=None, sa_column=Column(Text))
    request_id: UUID | None   = Field(default=None)

    # What
    action: str               = Field(max_length=48, index=True)
    target_type: str | None   = Field(default=None, max_length=48)
    target_id: UUID | None    = Field(default=None)
    target_label: str | None  = Field(default=None, sa_column=Column(Text))

    # Result
    outcome: str              = Field(max_length=16)
    severity: str             = Field(max_length=16)
    http_status: int | None   = Field(default=None)
    reason: str | None        = Field(default=None, sa_column=Column(Text))
    changes: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
