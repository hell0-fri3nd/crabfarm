from typing import Self

import aio_pika
from aio_pika.abc import (
    AbstractChannel,
    AbstractExchange,
    AbstractRobustConnection,
)

from app.core import settings
from .topics import EVENTS_EXCHANGE


class RabbitClient:
    """One robust AMQP connection and channel for the process; reconnects on its own after drops."""

    def __init__(
        self,
        host: str = settings.rabbitmq_host,
        port: int = settings.rabbitmq_port,
        user: str = settings.rabbitmq_user,
        password: str = settings.rabbitmq_password,
        vhost: str = settings.rabbitmq_vhost,
    ):
        self._params = {"host": host, "port": port, "login": user, "password": password, "virtualhost": vhost}
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractChannel | None = None

    @property
    def channel(self) -> AbstractChannel:
        if self._channel is None:
            raise RuntimeError("RabbitClient is not connected")
        return self._channel

    async def connect(self) -> Self:
        self._connection = await aio_pika.connect_robust(**self._params)
        self._channel = await self._connection.channel()
        return self

    async def declare_events_exchange(self) -> AbstractExchange:
        return await self.channel.declare_exchange(EVENTS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)

    async def close(self) -> None:
        if self._connection is not None:
            await self._connection.close()
        self._connection = self._channel = None

    async def __aenter__(self) -> Self:
        return await self.connect()

    async def __aexit__(self, *_: object) -> None:
        await self.close()

    def __repr__(self) -> str:
        return f"RabbitClient(connected={self._channel is not None})"
