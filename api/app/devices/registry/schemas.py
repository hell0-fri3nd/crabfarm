from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.devices.water_sensors import WaterSensorName, WaterSensorStatus

type DeviceName = Literal["scale", "water_sensors"]


class DeviceAlert(BaseModel):
    """One water sensor currently reading Warning or Danger."""

    model_config = ConfigDict(extra="forbid")

    sensor: WaterSensorName
    status: WaterSensorStatus
    value: float
    normal_range: str


class DeviceStatusEvent(BaseModel):
    """Data of every `device.status` SSE event: this device just sent a valid message."""

    model_config = ConfigDict(extra="forbid")

    device: DeviceName
    seen_at: datetime
    alerts: list[DeviceAlert] = []
