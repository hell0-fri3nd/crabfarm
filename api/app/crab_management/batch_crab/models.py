from datetime import datetime
from uuid import UUID

from sqlmodel import Field, SQLModel, func


class BatchCrabs(SQLModel, table=True):
    __tablename__ = "batch_crabs"
    __table_args__ = {"schema": "crab_management"}

    id: int | None = Field(default=None, primary_key=True)
    user_id: UUID  = Field(foreign_key="auth.users.id", index=True)

    created_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )
