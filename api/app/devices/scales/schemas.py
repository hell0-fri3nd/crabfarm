from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GRAMS_PER_UNIT = {"grams": 1.0, "g": 1.0, "kilograms": 1000.0, "kg": 1000.0}


class CrabWeightMessage(BaseModel):
    """What the crab scale publishes on MQTT topic crab/scale, e.g. {"weight": 554.00, "unit": "grams"}."""

    model_config = ConfigDict(extra="ignore")

    weight: float = Field(ge=0, le=100_000)
    unit: Literal["grams", "g", "kilograms", "kg"] = "grams"

    @property
    def grams(self) -> float:
        return self.weight * GRAMS_PER_UNIT[self.unit]


class ScaleReadingEvent(BaseModel):
    """Data of every `scale.reading` SSE event. Live only: readings aren't stored."""

    model_config = ConfigDict(extra="forbid")

    device_id: str | None = None
    weight_g: float
    received_at: datetime
