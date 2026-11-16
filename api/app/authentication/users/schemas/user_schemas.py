from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    EmailStr,
    ConfigDict,
    Field,
    model_validator,
)

from app.core import PageQuery
from app.core.security import Role


type NormalizedEmail = Annotated[EmailStr, AfterValidator(str.lower)]


class CreateUserRequest(BaseModel):
    """New users get the default password and pin and must change both during onboarding."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "name": "Juan Dela Cruz",
                "email": "example@gmail.com",
                "role": Role.STAFF.value
            }
        }
    )
    name: str = Field(min_length=2, max_length=150, description="Name must be between 2 and 150 characters long.")
    email: NormalizedEmail = Field(max_length=254)
    role: Role = Field(default=Role.STAFF)


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "name": "Juan Dela Cruz",
                "email": "example@gmail.com",
                "role": Role.STAFF.value
            }
        }
    )
    name: str | None = Field(default=None, min_length=2, max_length=150)
    email: NormalizedEmail | None = Field(default=None, max_length=254)
    role: Role | None = None

    @model_validator(mode="after")
    def require_one_field(self) -> "UpdateUserRequest":
        if not self.model_dump(exclude_none=True):
            raise ValueError("Provide at least one field to update")
        return self


class UpdateMeRequest(BaseModel):
    """Self-service profile edit: only the name, so nobody can change their own email or role."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={"example": {"name": "Juan Dela Cruz"}},
    )
    name: str = Field(min_length=2, max_length=150)


class ListUsersQuery(PageQuery):
    q: str | None = Field(default=None, min_length=1, max_length=254, description="Search by name or email.")
    role: Role | None = None
    is_active: bool | None = None
    sort: Literal["name", "-name", "email", "-email", "created_at", "-created_at"] = "-created_at"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: Role
    is_active: bool
    needs_onboarding: bool
    created_at: datetime | None
    updated_at: datetime | None
    # Only GET /users fills this (newest successful audit event); other endpoints leave it null
    last_active_at: datetime | None = None
