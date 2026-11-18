import asyncio
import logging
import time
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.core import Response, settings
from app.core.audit import Outcome
from app.core.database import SessionFactory
from app.crab_management.crab import CrabServices
from app.crab_management.logs import LogServices
from app.devices.feeding import FeedingSummaryServices
from app.infrastructure.streaming.sse import (
    HEARTBEAT,
    RECONNECT_DELAY_MS,
    format_event,
)
from .schemas import DashboardSummary

logger = logging.getLogger(__name__)

SUMMARY_EVENT = "dashboard.summary"

DASHBOARD_OUTCOMES = {
    "DASHBOARD_SUMMARY_READY":  (Outcome.SUCCESS, status.HTTP_200_OK),
    "DASHBOARD_SUMMARY_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

DASHBOARD_ERRORS = {
    "DASHBOARD_SUMMARY_FAILED": ("server", "Unable to load the dashboard summary right now"),
}


class DashboardServices:
    def __init__(self, db: Session):
        self.db = db

    def read(self) -> DashboardSummary:
        now = datetime.now(timezone.utc)
        farm_day_start = now.astimezone(ZoneInfo(settings.farm_time_zone)).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return DashboardSummary(
            crabs_logged_today=LogServices(self.db).count_crabs_since(farm_day_start),
            crabs_total=CrabServices(self.db).count(),
            next_feed=FeedingSummaryServices(self.db).next_feed(now),
        )

    def summary(self) -> Response[DashboardSummary]:
        try:
            return Response(
                success=True,
                message="Dashboard summary ready",
                code="DASHBOARD_SUMMARY_READY",
                details=self.read(),
            )
        except Exception:
            logger.exception("Dashboard summary failed")
            _, message = DASHBOARD_ERRORS["DASHBOARD_SUMMARY_FAILED"]
            return Response(success=False, message=message, code="DASHBOARD_SUMMARY_FAILED")


class DashboardStreamServices:
    """Sends the summary first, then again whenever it changes. It reads PostgreSQL, so it works with the broker off."""

    @staticmethod
    def __read() -> DashboardSummary:
        with SessionFactory() as db:
            return DashboardServices(db).read()

    async def stream(self, request: Request, until: datetime) -> AsyncIterator[str]:
        yield f"retry: {RECONNECT_DELAY_MS}\n\n"

        last_summary: DashboardSummary | None = None
        last_sent = time.monotonic()

        while (remaining := (until - datetime.now(timezone.utc)).total_seconds()) > 0:
            if await request.is_disconnected():
                return

            try:
                summary = await run_in_threadpool(self.__read)
            except SQLAlchemyError:
                logger.exception("Dashboard stream could not read the summary")
                summary = last_summary

            if summary is not None and summary != last_summary:
                last_summary = summary
                last_sent = time.monotonic()
                yield format_event(SUMMARY_EVENT, summary.model_dump_json())
            elif time.monotonic() - last_sent >= settings.sse_heartbeat_seconds:
                last_sent = time.monotonic()
                yield HEARTBEAT

            await asyncio.sleep(min(remaining, settings.dashboard_poll_seconds))
