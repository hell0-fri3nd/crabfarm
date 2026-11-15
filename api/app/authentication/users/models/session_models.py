from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
)
from sqlmodel import Field, func

from app.core import Base


class SessionRevokedReason(str, Enum):
    SIGNED_OUT = "signed_out"
    ROTATED = "rotated"
    PIN_LOCKED = "pin_locked"
    REUSE_DETECTED = "reuse_detected"
    DEACTIVATED = "deactivated"
    CREDENTIALS_RESET = "credentials_reset"


class Sessions(Base, table=True):
    """One refresh token. Its id is the token's jti, so revoking the row kills the token."""

    __tablename__ = "sessions"
    __table_args__ = {"schema": "auth"}

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        sa_column=Column(ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    is_remembered: bool = Field(default=False)
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    failed_pin_attempts: int = Field(default=0, sa_column_kwargs={"server_default": "0"})
    revoked_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    revoked_reason: SessionRevokedReason | None = Field(
        default=None,
        sa_column=Column(
            SAEnum(
                SessionRevokedReason,
                name="session_revoked_reason",
                schema="auth",
                native_enum=True,
                values_callable=lambda e: [m.value for m in e],
            ),
            nullable=True,
        ),
    )

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()),
    )

    @property
    def is_usable(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.now(timezone.utc)

    def __repr__(self) -> str:
        return f"Sessions(id={self.id}, user_id={self.user_id}, revoked_reason={self.revoked_reason})"
