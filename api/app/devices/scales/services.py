import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import Request
from pydantic import ValidationError

from app.infrastructure.messaging import CRAB_SCALES
from app.infrastructure.streaming import (
    HubMessage,
    StreamHub,
    event_stream,
    format_event,
)
from .schemas import CrabWeightMessage, ScaleReadingEvent

logger = logging.getLogger(__name__)

SCALE_READING_EVENT = "scale.reading"


class ScaleStreamServices:
    def __init__(self, hub: StreamHub):
        self.hub = hub

    @staticmethod
    def __to_reading(message: HubMessage) -> ScaleReadingEvent | None:
        if message.routing_key != CRAB_SCALES:
            return None
        try:
            weight = CrabWeightMessage.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", message.routing_key)
            return None
        # The scale sends no clock of its own, so the reading is stamped when it reaches the API
        return ScaleReadingEvent(weight_g=weight.grams, received_at=datetime.now(timezone.utc))

    @classmethod
    def __to_frame(cls, message: HubMessage) -> str | None:
        reading = cls.__to_reading(message)
        return None if reading is None else format_event(SCALE_READING_EVENT, reading.model_dump_json())

    async def stream(self, request: Request, until: datetime | None) -> AsyncIterator[str]:
        async with self.hub.subscribe(CRAB_SCALES) as queue:
            async for frame in event_stream(queue, request, self.__to_frame, until=until):
                yield frame
