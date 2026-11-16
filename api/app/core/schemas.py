from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .security import Role


class PageQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int

    def __len__(self) -> int:
        return len(self.items)


class Response[T](BaseModel):
    """The success envelope every endpoint returns (02 §4)."""

    success: bool
    message: str
    code: str | None
    details: T | None = None

    def __bool__(self) -> bool:
        return self.success


class ErrorResponse(BaseModel):
    detail: str


class AuthUser(BaseModel):
    """The signed-in user as the access token states it. Every domain gets this as `actor`."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    role: Role
    email: str | None = None
    expires_at: datetime
