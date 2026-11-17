from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GRAMS_PER_UNIT = {"grams": 1.0, "g": 1.0, "kilograms": 1000.0, "kg": 1000.0}


class CrabWeightMessage(BaseModel):
    """What the crab scale publishes on MQTT topic crab/weight, e.g. {"weight": 554.00, "unit": "grams"}."""

    model_config = ConfigDict(extra="ignore")

    weight: float = Field(ge=0, le=100_000)
    unit: Literal["grams", "g", "kilograms", "kg"] = "grams"

    @property
    def grams(self) -> float:
        return self.weight * GRAMS_PER_UNIT[self.unit]


class SensorStreamQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sensor_type: Literal["weight"] | None = None


class SensorReadingEvent(BaseModel):
    """Data of every `sensor.reading` SSE event. Live only: readings aren't stored yet."""

    model_config = ConfigDict(extra="forbid")

    sensor_type: Literal["weight"]
    device_id: str | None = None
    value: float
    unit: Literal["g"]
    received_at: datetime
