import time
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import Request
from pydantic import BaseModel, ValidationError

from app.devices.scales import CrabWeightMessage
from app.devices.water_sensors import (
    WaterSensorMessage,
    WaterSensorStatus,
    normal_range_label,
)
from app.infrastructure.messaging import CRAB_SCALES, CRAB_SENSORS
from app.infrastructure.streaming import (
    HubMessage,
    StreamHub,
    event_stream,
    format_event,
)
from ..schemas import (
    DeviceAlert,
    DeviceName,
    DeviceStatusEvent,
)

DEVICE_STATUS_EVENT = "device.status"
MIN_SECONDS_BETWEEN_EVENTS = 2.0

DEVICES: dict[str, tuple[DeviceName, type[BaseModel]]] = {
    CRAB_SCALES: ("scale", CrabWeightMessage),
    CRAB_SENSORS: ("water_sensors", WaterSensorMessage),
}


class DeviceStatusFrames:
    """Turns one client's device messages into `device.status` frames, at most one per device every 2 s."""

    def __init__(self) -> None:
        self._sent_at: dict[DeviceName, float] = {}

    @staticmethod
    def __to_alerts(reading: BaseModel) -> list[DeviceAlert]:
        if not isinstance(reading, WaterSensorMessage):
            return []
        values = reading.readings
        return [
            DeviceAlert(
                sensor=sensor,
                status=sensor_status,
                value=values[sensor],
                normal_range=normal_range_label(sensor),
            )
            for sensor, sensor_status in reading.statuses.items()
            if sensor_status is not WaterSensorStatus.NORMAL
        ]

    def __call__(self, message: HubMessage) -> str | None:
        if message.routing_key not in DEVICES:
            return None
        device, message_schema = DEVICES[message.routing_key]
        now = time.monotonic()
        if now - self._sent_at.get(device, -MIN_SECONDS_BETWEEN_EVENTS) < MIN_SECONDS_BETWEEN_EVENTS:
            return None
        try:
            reading = message_schema.model_validate_json(message.body)
        except ValidationError:
            return None
        self._sent_at[device] = now
        event = DeviceStatusEvent(device=device, seen_at=datetime.now(timezone.utc), alerts=self.__to_alerts(reading))
        return format_event(DEVICE_STATUS_EVENT, event.model_dump_json())


class DeviceStatusStreamServices:
    def __init__(self, hub: StreamHub):
        self.hub = hub

    async def stream(self, request: Request, until: datetime | None) -> AsyncIterator[str]:
        async with self.hub.subscribe(*DEVICES) as queue:
            async for frame in event_stream(queue, request, DeviceStatusFrames(), until=until):
                yield frame
