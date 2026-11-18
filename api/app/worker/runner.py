import asyncio
import logging
import signal

from aio_pika.exceptions import AMQPError
from sqlalchemy.exc import SQLAlchemyError

from app.infrastructure.messaging import RabbitClient
from .jobs import DevicePresenceMonitor, WaterSensorMonitor

logger = logging.getLogger(__name__)

RESTART_DELAY_SECONDS = 5.0


async def __wait_or_stop(stop: asyncio.Event, seconds: float) -> None:
    try:
        await asyncio.wait_for(stop.wait(), timeout=seconds)
    except TimeoutError:
        pass


async def run_worker() -> None:
    """Runs every job until stopped, and starts over whenever RabbitMQ or PostgreSQL is unavailable."""
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for stop_signal in (signal.SIGINT, signal.SIGTERM):
        signal.signal(stop_signal, lambda *_: loop.call_soon_threadsafe(stop.set))

    while not stop.is_set():
        broker = RabbitClient()
        try:
            await broker.connect()
            async with asyncio.TaskGroup() as jobs:
                jobs.create_task(DevicePresenceMonitor(broker).run(stop))
                jobs.create_task(WaterSensorMonitor(broker).run(stop))
        except* (AMQPError, OSError, SQLAlchemyError):
            logger.exception("Worker lost a dependency; retrying in %s s", RESTART_DELAY_SECONDS)
            await __wait_or_stop(stop, RESTART_DELAY_SECONDS)
        finally:
            await broker.close()
