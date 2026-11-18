from datetime import datetime
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.core import PageQuery
from .models import WaterSensorName, WaterSensorStatus
from .thresholds import classify_reading

type WaterSensorLogSort = Literal["measured_at", "-measured_at"]


class WaterSensorMessage(BaseModel):
    """What the water sensors publish on MQTT topic crab/sensor."""

    model_config = ConfigDict(extra="ignore")

    temperature: float = Field(ge=-5, le=60)
    ph: float = Field(ge=0, le=14)
    salinity: float = Field(ge=0, le=70)
    ammonia: float = Field(ge=0, le=100)
    turbidity: float = Field(ge=0, le=4000)
    dissolved_oxygen: float = Field(ge=0, le=30)

    @property
    def readings(self) -> dict[WaterSensorName, float]:
        return {
            WaterSensorName.TEMPERATURE: self.temperature,
            WaterSensorName.PH: self.ph,
            WaterSensorName.SALINITY: self.salinity,
            WaterSensorName.AMMONIA: self.ammonia,
            WaterSensorName.TURBIDITY: self.turbidity,
            WaterSensorName.OXYGEN: self.dissolved_oxygen,
        }

    @property
    def statuses(self) -> dict[WaterSensorName, WaterSensorStatus]:
        return {sensor: classify_reading(sensor, value) for sensor, value in self.readings.items()}


class WaterSensorReadingEvent(BaseModel):
    """Data of every `water_sensor.reading` SSE event. The stream itself stores nothing."""

    model_config = ConfigDict(extra="forbid")

    device_id: str | None = None
    temperature_c: float
    ph: float
    salinity_ppt: float
    ammonia_mg_l: float
    turbidity_ntu: float
    do_mg_l: float
    statuses: dict[WaterSensorName, WaterSensorStatus]
    received_at: datetime


class WaterSensorLogFilters(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    sensor: list[WaterSensorName] | None = None
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None

    @model_validator(mode="after")
    def check_range(self) -> Self:
        if self.from_ and self.to and self.from_ >= self.to:
            raise ValueError("from must be before to")
        return self


class ListWaterSensorLogsQuery(WaterSensorLogFilters, PageQuery):
    size: int = Field(default=7, ge=1, le=100)
    status: WaterSensorStatus | None = None
    sort: WaterSensorLogSort = "-measured_at"


class WaterSensorThresholdRead(BaseModel):
    """One sensor's configured bands; null means no limit on that side."""

    sensor: WaterSensorName
    warning: list[tuple[float | None, float | None]]
    danger: list[tuple[float | None, float | None]]
    normal_min: float | None
    normal_max: float | None
    normal_range: str


class WaterSensorStatusCounts(BaseModel):
    normal: int = 0
    warning: int = 0
    danger: int = 0
