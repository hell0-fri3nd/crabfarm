import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from pydantic import ValidationError

from app.core import settings
from app.devices.registry import (
    DEVICES,
    DeviceName,
    DevicePresenceServices,
)
from app.infrastructure.messaging import RabbitClient

logger = logging.getLogger(__name__)

TICK_SECONDS = 1.0


@dataclass(slots=True)
class DevicePresence:
    is_connected: bool | None
    last_seen_at: datetime | None = None
    last_seen_clock: float | None = None


class DevicePresenceMonitor:
    """Audits every device connecting and disconnecting, around the clock."""

    def __init__(self, broker: RabbitClient, presence: DevicePresenceServices | None = None):
        self._broker = broker
        self._presence = presence or DevicePresenceServices()
        self._offline_after = settings.device_offline_seconds
        self._devices: dict[DeviceName, DevicePresence] = {}
        self._started_clock = 0.0

    async def run(self, stop: asyncio.Event) -> None:
        for device, _ in DEVICES.values():
            is_connected = await asyncio.to_thread(self._presence.last_known_connection, device)
            self._devices[device] = DevicePresence(is_connected=is_connected)
        self._started_clock = time.monotonic()

        exchange = await self._broker.get_device_exchange()
        # Exclusive: only messages arriving now say a device is connected, so none should wait for a restart
        queue = await self._broker.channel.declare_queue(exclusive=True, auto_delete=True)
        for routing_key in DEVICES:
            await queue.bind(exchange, routing_key=routing_key)
        await queue.consume(self.__on_message, no_ack=True)
        logger.info("Device presence monitor started")

        while not stop.is_set():
            await self.__tick()
            try:
                await asyncio.wait_for(stop.wait(), timeout=TICK_SECONDS)
            except TimeoutError:
                continue

    async def __on_message(self, message: AbstractIncomingMessage) -> None:
        if message.routing_key not in DEVICES:
            return
        device, message_schema = DEVICES[message.routing_key]
        try:
            message_schema.model_validate_json(message.body)
        except ValidationError:
            return
        presence = self._devices[device]
        presence.last_seen_at = datetime.now(timezone.utc)
        presence.last_seen_clock = time.monotonic()

    async def __tick(self) -> None:
        now = time.monotonic()
        for device, presence in self._devices.items():
            seen_clock = presence.last_seen_clock
            is_fresh = seen_clock is not None and now - seen_clock < self._offline_after
            has_waited = seen_clock is not None or now - self._started_clock >= self._offline_after

            if is_fresh and presence.is_connected is not True:
                await self.__record(device, presence, True)
            elif not is_fresh and has_waited and presence.is_connected is not False:
                await self.__record(device, presence, False)

    async def __record(self, device: DeviceName, presence: DevicePresence, is_connected: bool) -> None:
        presence.is_connected = is_connected
        await asyncio.to_thread(self._presence.record, device, is_connected, presence.last_seen_at)
        logger.info("%s %s", device, "connected" if is_connected else "disconnected")
