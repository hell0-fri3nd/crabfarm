import asyncio
import logging
import time
from datetime import datetime, timezone

from aio_pika.abc import AbstractIncomingMessage
from pydantic import ValidationError

from app.core import settings
from app.core.database import SessionFactory
from app.devices.water_sensors import WaterSensorLogServices, WaterSensorMessage
from app.infrastructure.messaging import CRAB_SENSORS, RabbitClient

logger = logging.getLogger(__name__)

TICK_SECONDS = 1.0
SAVE_RETRY_SECONDS = 30.0


class WaterSensorMonitor:
    """Saves the current water reading once per logging slot, around the clock."""

    def __init__(self, broker: RabbitClient):
        self._broker = broker
        self._offline_after = settings.device_offline_seconds
        self._slot_seconds = settings.water_sensor_log_interval_minutes * 60
        self._latest: WaterSensorMessage | None = None
        self._latest_at: datetime | None = None
        self._latest_clock: float | None = None
        self._saved_slot: datetime | None = None
        self._next_save_clock = 0.0

    async def run(self, stop: asyncio.Event) -> None:
        exchange = await self._broker.get_device_exchange()
        # Exclusive: a reading only matters while it's current, so nothing should queue up while the worker is down
        queue = await self._broker.channel.declare_queue(exclusive=True, auto_delete=True)
        await queue.bind(exchange, routing_key=CRAB_SENSORS)
        await queue.consume(self.__on_message, no_ack=True)
        logger.info("Water sensor monitor started, logging every %s s", self._slot_seconds)

        while not stop.is_set():
            await self.__tick()
            try:
                await asyncio.wait_for(stop.wait(), timeout=TICK_SECONDS)
            except TimeoutError:
                continue

    async def __on_message(self, message: AbstractIncomingMessage) -> None:
        try:
            self._latest = WaterSensorMessage.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", CRAB_SENSORS)
            return
        self._latest_at = datetime.now(timezone.utc)
        self._latest_clock = time.monotonic()

    async def __tick(self) -> None:
        now = time.monotonic()
        if self._latest_clock is not None and now - self._latest_clock < self._offline_after:
            await self.__save_current_slot(now)

    def __current_slot(self) -> datetime:
        timestamp = int(datetime.now(timezone.utc).timestamp())
        return datetime.fromtimestamp(timestamp - timestamp % self._slot_seconds, timezone.utc)

    async def __save_current_slot(self, now: float) -> None:
        slot = self.__current_slot()
        if slot == self._saved_slot or now < self._next_save_clock or self._latest is None or self._latest_at is None:
            return
        try:
            saved = await asyncio.to_thread(self.__save, self._latest, self._latest_at, slot)
        except Exception:
            # The reading stays in memory, so a database outage only delays this slot's log
            logger.exception("Could not save the water sensor logs for %s", slot)
            self._next_save_clock = now + SAVE_RETRY_SECONDS
            return
        self._saved_slot = slot
        logger.info("Saved %s water sensor logs for %s", saved, slot)

    @staticmethod
    def __save(message: WaterSensorMessage, measured_at: datetime, slot: datetime) -> int:
        with SessionFactory() as db:
            return WaterSensorLogServices(db).save_snapshot(message, measured_at, slot)
