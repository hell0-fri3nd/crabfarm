import logging
from collections.abc import AsyncIterator, Callable
from datetime import datetime, timezone

from fastapi import Request
from pydantic import ValidationError

from app.infrastructure.messaging import CRAB_WEIGHT
from app.infrastructure.streaming import (
    HubMessage,
    StreamHub,
    event_stream,
    format_event,
)
from .schemas import (
    CrabWeightMessage,
    SensorReadingEvent,
    SensorStreamQuery,
)

logger = logging.getLogger(__name__)

SENSOR_READING_EVENT = "sensor.reading"


class SensorStreamServices:
    def __init__(self, hub: StreamHub):
        self.hub = hub

    @staticmethod
    def __to_reading(message: HubMessage) -> SensorReadingEvent | None:
        if message.routing_key != CRAB_WEIGHT:
            return None
        try:
            weight = CrabWeightMessage.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", message.routing_key)
            return None
        # The scale sends no clock of its own, so the reading is stamped when it reaches the API
        return SensorReadingEvent(
            sensor_type="weight",
            value=weight.grams,
            unit="g",
            received_at=datetime.now(timezone.utc),
        )

    @classmethod
    def __frame_builder(cls, query: SensorStreamQuery) -> Callable[[HubMessage], str | None]:
        def to_frame(message: HubMessage) -> str | None:
            reading = cls.__to_reading(message)
            if reading is None or (query.sensor_type and reading.sensor_type != query.sensor_type):
                return None
            return format_event(SENSOR_READING_EVENT, reading.model_dump_json())

        return to_frame

    async def stream(self, request: Request, until: datetime | None, query: SensorStreamQuery) -> AsyncIterator[str]:
        async with self.hub.subscribe(CRAB_WEIGHT) as queue:
            async for frame in event_stream(queue, request, self.__frame_builder(query), until=until):
                yield frame
