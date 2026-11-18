import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from time import monotonic

from fastapi import Request
from pydantic import ValidationError
from sqlmodel import Session
from starlette.concurrency import run_in_threadpool

from app.core import Response, settings
from app.core.database import engine
from app.infrastructure.messaging import FORECAST_EVENTS, FORECAST_MODEL_STATUS, RabbitClient, publish
from app.infrastructure.ml import ModelRegistry, TrainingStatus, get_model_registry
from app.infrastructure.streaming import HubMessage, StreamHub, event_stream, format_event
from ..schemas import ModelStatus
from .forecast_services import ForecastServices
from .log_services import LogServices

logger = logging.getLogger(__name__)

ACTIVE_TRAINING = ("queued", "running")


class ModelStatusServices:
    def __init__(self, db: Session, registry: ModelRegistry | None = None):
        self.db = db
        self.registry = registry or get_model_registry()

    def __is_running(self, training: TrainingStatus | None) -> bool:
        if training is None or training.status not in ACTIVE_TRAINING:
            return False
        timeout = timedelta(minutes=settings.forecast_training_timeout_minutes)
        # A record left "running" by a process that died stops counting once its lock would be taken over
        is_recent = datetime.now(timezone.utc) - training.started_at < timeout
        return is_recent and self.registry.lock_owner() == training.training_id

    def __logged_days(self) -> int:
        """Counted exactly as the retrain counts them, so "due" here means a scheduled retrain would run."""
        days_by_crab = ForecastServices.build_features(LogServices(self.db).list_measured())
        return sum(len(days) for days in days_by_crab.values())

    def snapshot(self) -> ModelStatus:
        champion = self.registry.current_or_none()
        trainings = self.registry.list_trainings()
        latest = trainings[0] if trainings else None
        new_days = self.__logged_days() - champion.logged_days if champion else None

        if self.__is_running(latest):
            state = "training"
        elif champion is None:
            state = "missing"
        elif new_days is not None and new_days >= settings.forecast_retrain_min_new_days:
            state = "due"
        else:
            state = "ready"

        return ModelStatus(
            state=state,
            version=champion.version if champion else None,
            trained_at=champion.trained_at if champion else None,
            new_logged_days=new_days,
            retrain_after_days=settings.forecast_retrain_min_new_days,
            training=latest,
        )

    def get(self) -> Response[ModelStatus]:
        """Not audited: every Logs and Dashboard visit reads it."""
        return Response(success=True, message="Growth model status", code="FORECAST_MODEL_STATUS", details=self.snapshot())


class ModelStatusStream:
    """`forecast.model` events: the caller's snapshot first, then each change the watcher publishes."""

    def __init__(self, hub: StreamHub):
        self.hub = hub

    @staticmethod
    def __to_frame(message: HubMessage) -> str | None:
        try:
            status = ModelStatus.model_validate_json(message.body)
        except ValidationError:
            logger.warning("Dropped an invalid %s message", message.routing_key)
            return None
        return format_event(FORECAST_MODEL_STATUS, status.model_dump_json())

    async def stream(self, request: Request, first: ModelStatus, until: datetime | None) -> AsyncIterator[str]:
        async with self.hub.subscribe(FORECAST_EVENTS) as queue:
            frames = event_stream(queue, request, self.__to_frame, until=until)
            yield await anext(frames)
            yield format_event(FORECAST_MODEL_STATUS, first.model_dump_json())
            async for frame in frames:
                yield frame


class ModelStatusWatcher:
    """Publishes `forecast.model` when the model's status changes. The retrain process has no broker connection, so
    the API watches the files it writes, and recomputes now and then because new logs make a model due."""

    def __init__(self, client: RabbitClient, registry: ModelRegistry | None = None):
        self.client = client
        self.registry = registry or get_model_registry()
        self._task: asyncio.Task[None] | None = None
        self._published: ModelStatus | None = None

    def __repr__(self) -> str:
        return f"ModelStatusWatcher(running={self._task is not None and not self._task.done()})"

    def __snapshot(self) -> ModelStatus:
        with Session(engine) as db:
            return ModelStatusServices(db, self.registry).snapshot()

    async def __tick(self) -> None:
        status = await run_in_threadpool(self.__snapshot)
        if status != self._published:
            await publish(self.client, status, FORECAST_MODEL_STATUS)
            self._published = status

    async def __run(self) -> None:
        fingerprint, refreshed_at = None, float("-inf")
        while True:
            try:
                current = await run_in_threadpool(self.registry.fingerprint)
                if current != fingerprint or monotonic() - refreshed_at >= settings.forecast_status_refresh_seconds:
                    await self.__tick()
                    fingerprint, refreshed_at = current, monotonic()
            except Exception:
                logger.exception("Checking the growth model status failed; retrying")
            await asyncio.sleep(settings.forecast_status_poll_seconds)

    def start(self) -> None:
        self._task = asyncio.create_task(self.__run(), name="model-status-watcher")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None
