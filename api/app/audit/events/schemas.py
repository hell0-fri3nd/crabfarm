from datetime import date, datetime
from ipaddress import IPv4Address, IPv6Address
from typing import (
    Annotated,
    Any,
    Literal,
    Self,
)
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.core import PageQuery, Role
from app.core.audit import Outcome, Severity


type ActionName = Annotated[str, StringConstraints(pattern=r"^[a-z_]+(\.[a-z_]+)*$", max_length=48)]
type ResourceName = Annotated[str, StringConstraints(pattern=r"^[a-z_]+$", max_length=48)]

type AuditEventSort = Literal[
    "occurred_at",
    "-occurred_at",
    "action",
    "-action",
    "actor_email",
    "-actor_email",
    "outcome",
    "-outcome",
]


class ListAuditEventsQuery(PageQuery):
    model_config = ConfigDict(extra="ignore", populate_by_name=True, str_strip_whitespace=True)

    size: int = Field(default=7, ge=1, le=100)
    mine: bool = Field(default=False, description="Only the caller's own events.")
    actor_id: UUID | None = Field(default=None, description="Only this user's events. STAFF may only pass their own id.")
    actor_role: Role | None = None
    action: list[ActionName] = Field(default_factory=list, description="Exact actions, e.g. log.create.")
    resource: list[ResourceName] = Field(
        default_factory=list,
        description="The part of the action before the first dot, e.g. log matches log.list and log.create.",
    )
    outcome: list[Outcome] = Field(default_factory=list)
    severity: list[Severity] = Field(default_factory=list)
    target_type: ResourceName | None = None
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    q: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Search the actor email, action, target label, path and reason.",
    )
    sort: AuditEventSort = "-occurred_at"

    @model_validator(mode="after")
    def check_filters(self) -> Self:
        if self.from_ and self.to and self.from_ >= self.to:
            raise ValueError("from must be before to")
        if self.mine and self.actor_id:
            raise ValueError("Send mine or actor_id, not both")
        return self


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    occurred_at: datetime
    occurred_date: date | None
    actor_id: UUID | None
    actor_type: str
    actor_role: str | None
    actor_email: str | None
    source_ip: IPv4Address | IPv6Address | None
    user_agent: str | None
    http_method: str | None
    http_path: str | None
    action: str
    target_type: str | None
    target_id: UUID | None
    target_label: str | None
    outcome: Outcome
    severity: Severity
    http_status: int | None
    reason: str | None
    changes: dict[str, Any] | None
