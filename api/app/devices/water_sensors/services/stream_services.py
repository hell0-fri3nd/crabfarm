import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import Request
from pydantic import ValidationError

from app.infrastructure.messaging import CRAB_SENSORS
from app.infrastructure.streaming import (
    HubMessage,
    StreamHub,
    event_stream,
    format_event,
)
from ..schemas import WaterSensorMessage, WaterSensorReadingEvent

logger = logging.getLogger(__name__)

WATER_SENSOR_READING_EVENT = "water_sensor.reading"


class WaterSensorStreamServices:
    def __init__(self, hub: StreamHub):
        self.hub = hub

    @staticmethod
    def __to_reading(message: HubMessage) -> WaterSensorReadingEvent | None:
        if message.routing_key != CRAB_SENSORS:
            return None
        try:
            sensors = WaterSensorMessage.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", message.routing_key)
            return None
        # The sensors send no clock of their own, so the reading is stamped when it reaches the API
        return WaterSensorReadingEvent(
            temperature_c=sensors.temperature,
            ph=sensors.ph,
            salinity_ppt=sensors.salinity,
            ammonia_mg_l=sensors.ammonia,
            turbidity_ntu=sensors.turbidity,
            do_mg_l=sensors.dissolved_oxygen,
            statuses=sensors.statuses,
            received_at=datetime.now(timezone.utc),
        )

    @classmethod
    def __to_frame(cls, message: HubMessage) -> str | None:
        reading = cls.__to_reading(message)
        return None if reading is None else format_event(WATER_SENSOR_READING_EVENT, reading.model_dump_json())

    async def stream(self, request: Request, until: datetime | None) -> AsyncIterator[str]:
        async with self.hub.subscribe(CRAB_SENSORS) as queue:
            async for frame in event_stream(queue, request, self.__to_frame, until=until):
                yield frame
