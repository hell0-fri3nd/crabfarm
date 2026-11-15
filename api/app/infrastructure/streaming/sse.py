import asyncio
from collections.abc import AsyncIterator, Callable
from datetime import datetime, timezone

from fastapi import Request

from app.core import settings
from .hub import HubMessage

HEARTBEAT = ": ping\n\n"
RECONNECT_DELAY_MS = 5_000

type FrameBuilder = Callable[[HubMessage], str | None]


def format_event(name: str, data_json: str) -> str:
    return f"event: {name}\ndata: {data_json}\n\n"


def __seconds_until(until: datetime | None) -> float:
    if until is None:
        return float(settings.sse_heartbeat_seconds)
    return (until - datetime.now(timezone.utc)).total_seconds()


async def event_stream(
    queue: asyncio.Queue[HubMessage],
    request: Request,
    to_frame: FrameBuilder,
    until: datetime | None = None,
) -> AsyncIterator[str]:
    """Yields SSE frames until the client leaves or `until` passes (the access token's expiry)."""
    yield f"retry: {RECONNECT_DELAY_MS}\n\n"

    while (remaining := __seconds_until(until)) > 0:
        try:
            message = await asyncio.wait_for(queue.get(), timeout=min(remaining, settings.sse_heartbeat_seconds))
        except TimeoutError:
            if await request.is_disconnected():
                return
            yield HEARTBEAT
            continue

        if frame := to_frame(message):
            yield frame
