from datetime import datetime
from decimal import Decimal
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.core import PageQuery
from ..models import LogType


type LogSort = Literal["created_at", "-created_at", "width_mm", "-width_mm", "weight_g", "-weight_g"]


class CreateLogRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={"example": {"crab_id": 1, "batch_id": 1, "log_type": "actual", "width_mm": 85.5, "weight_g": 210.25}},
    )

    crab_id: int = Field(gt=0)
    batch_id: int | None = Field(default=None, gt=0)
    log_type: LogType = LogType.ACTUAL
    width_mm: Decimal | None = Field(default=None, gt=0, le=300, max_digits=10, decimal_places=2)
    weight_g: Decimal | None = Field(default=None, gt=0, le=5000, max_digits=10, decimal_places=2)

    @model_validator(mode="after")
    def check_has_measurement(self) -> Self:
        if self.width_mm is None and self.weight_g is None:
            raise ValueError("Send width_mm, weight_g or both")
        return self


class ListCrabLogsQuery(PageQuery):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    size: int = Field(default=7, ge=1, le=100)
    batch_id: int | None = Field(default=None, gt=0)
    log_type: LogType | None = None
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    sort: LogSort = "-created_at"

    @model_validator(mode="after")
    def check_range(self) -> Self:
        if self.from_ and self.to and self.from_ >= self.to:
            raise ValueError("from must be before to")
        return self


class ListLogsQuery(ListCrabLogsQuery):
    crab_id: int | None = Field(default=None, gt=0)
