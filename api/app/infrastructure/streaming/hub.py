import asyncio
import logging
from collections.abc import AsyncIterator, Iterable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from aio_pika.abc import AbstractIncomingMessage, AbstractQueue

from app.core import settings
from app.infrastructure.messaging import RabbitClient

logger = logging.getLogger(__name__)


@dataclass(slots=True, frozen=True)
class HubMessage:
    routing_key: str
    body: bytes


def matches(pattern: str, routing_key: str) -> bool:
    """AMQP topic matching: `*` is exactly one word, `#` is zero or more words."""

    def match(pattern_words: list[str], key_words: list[str]) -> bool:
        if not pattern_words:
            return not key_words
        head, *rest = pattern_words
        if head == "#":
            return any(match(rest, key_words[i:]) for i in range(len(key_words) + 1))
        if not key_words:
            return False
        return (head in ("*", key_words[0])) and match(rest, key_words[1:])

    return match(pattern.split("."), routing_key.split("."))


@dataclass(slots=True, eq=False)
class _Subscriber:
    patterns: tuple[str, ...]
    queue: asyncio.Queue[HubMessage] = field(default_factory=lambda: asyncio.Queue(settings.sse_client_queue_size))

    def offer(self, message: HubMessage) -> None:
        if not any(matches(pattern, message.routing_key) for pattern in self.patterns):
            return
        # A slow client loses its oldest event instead of blocking every other client
        if self.queue.full():
            self.queue.get_nowait()
        self.queue.put_nowait(message)


class StreamHub:
    """One exclusive broker queue per API process, fanned out to every connected SSE client."""

    def __init__(self, client: RabbitClient, bindings: Iterable[str]):
        self._client = client
        self._bindings = tuple(bindings)
        self._subscribers: set[_Subscriber] = set()
        self._queue: AbstractQueue | None = None
        self._consumer_tag: str | None = None

    @property
    def is_ready(self) -> bool:
        return self._consumer_tag is not None

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    async def start(self) -> None:
        exchange = await self._client.declare_events_exchange()
        self._queue = await self._client.channel.declare_queue(exclusive=True, auto_delete=True)
        for binding in self._bindings:
            await self._queue.bind(exchange, routing_key=binding)
        self._consumer_tag = await self._queue.consume(self.__dispatch, no_ack=True)
        logger.info("Stream hub consuming %s", ", ".join(self._bindings))

    async def stop(self) -> None:
        if self._queue is not None and self._consumer_tag is not None:
            await self._queue.cancel(self._consumer_tag)
        self._queue = self._consumer_tag = None
        self._subscribers.clear()

    async def __dispatch(self, message: AbstractIncomingMessage) -> None:
        hub_message = HubMessage(routing_key=message.routing_key or "", body=message.body)
        for subscriber in tuple(self._subscribers):
            subscriber.offer(hub_message)

    @asynccontextmanager
    async def subscribe(self, *patterns: str) -> AsyncIterator[asyncio.Queue[HubMessage]]:
        subscriber = _Subscriber(patterns=patterns)
        self._subscribers.add(subscriber)
        try:
            yield subscriber.queue
        finally:
            self._subscribers.discard(subscriber)

    def __repr__(self) -> str:
        return f"StreamHub(ready={self.is_ready}, bindings={self._bindings}, subscribers={self.subscriber_count})"
