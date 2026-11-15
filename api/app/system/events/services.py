import logging
from collections.abc import AsyncIterator
from datetime import datetime

from fastapi import Request
from pydantic import ValidationError

from app.infrastructure.messaging import SYSTEM_EVENTS
from app.infrastructure.streaming import (
    HubMessage,
    StreamHub,
    event_stream,
    format_event,
)
from .schemas import SystemEvent

logger = logging.getLogger(__name__)


class EventStreamServices:
    def __init__(self, hub: StreamHub):
        self.hub = hub

    @staticmethod
    def __to_frame(message: HubMessage) -> str | None:
        try:
            event = SystemEvent.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", message.routing_key)
            return None
        return format_event(message.routing_key, event.model_dump_json())

    async def stream(self, request: Request, until: datetime | None) -> AsyncIterator[str]:
        async with self.hub.subscribe(SYSTEM_EVENTS) as queue:
            async for frame in event_stream(queue, request, self.__to_frame, until=until):
                yield frame
