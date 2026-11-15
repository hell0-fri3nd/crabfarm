from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SystemEvent(BaseModel):
    """Data of every `system.<type>` SSE event; the routing key's last word is the type."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["announcement", "test"]
    message: str = Field(min_length=1, max_length=500)
    occurred_at: datetime


class ErrorResponse(BaseModel):
    detail: str
