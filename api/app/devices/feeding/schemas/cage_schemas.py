from pydantic import BaseModel, ConfigDict, Field

from app.core import PageQuery


class ListCagesQuery(PageQuery):
    size: int = Field(default=100, ge=1, le=100)


class UpdateCageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={"example": {"is_active": False}})

    is_active: bool
