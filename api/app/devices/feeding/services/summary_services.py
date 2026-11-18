from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlmodel import Session, col, select

from app.core import settings
from ..models import (
    Cages,
    ScheduleDays,
    ScheduleGroups,
    Schedules,
)
from ..schemas import NextFeedRead

# Python weekdays: Monday is 0
SCHEDULE_WEEKDAYS = {
    ScheduleDays.EVERY_DAY:       frozenset(range(7)),
    ScheduleDays.WEEKDAYS:        frozenset(range(5)),
    ScheduleDays.WEEKENDS:        frozenset({5, 6}),
    ScheduleDays.MON_WED_FRI_SUN: frozenset({0, 2, 4, 6}),
}
DAYS_TO_SEARCH = 8


class FeedingSummaryServices:
    """Read-only feeding figures for the dashboard. Not audited, because a live stream repeats them every few seconds."""

    def __init__(self, db: Session):
        self.db = db

    def __runnable_schedules(self) -> list[Schedules]:
        """Enabled schedules with at least one active cage in their groups."""
        return list(
            self.db.exec(
                select(Schedules)
                .join(ScheduleGroups, col(ScheduleGroups.schedule_id) == col(Schedules.id))
                .join(Cages, col(Cages.group_code) == col(ScheduleGroups.group_code))
                .where(col(Schedules.is_enabled), col(Schedules.deleted_at).is_(None), col(Cages.is_active))
                .distinct()
            ).all()
        )

    @staticmethod
    def __next_run(schedule: Schedules, now: datetime) -> datetime | None:
        today = now.date()
        for offset in range(DAYS_TO_SEARCH):
            day = today + timedelta(days=offset)
            run_at = datetime.combine(day, schedule.feed_time, now.tzinfo)
            if day.weekday() in SCHEDULE_WEEKDAYS[schedule.days] and run_at > now:
                return run_at
        return None

    def next_feed(self, now: datetime) -> NextFeedRead | None:
        farm_now = now.astimezone(ZoneInfo(settings.farm_time_zone))
        runs = [
            (run_at, schedule.name, schedule)
            for schedule in self.__runnable_schedules()
            if (run_at := self.__next_run(schedule, farm_now))
        ]
        if not runs:
            return None

        run_at, _, schedule = min(runs, key=lambda run: run[:2])
        return NextFeedRead(
            schedule_name=schedule.name,
            feed_time=schedule.feed_time,
            at=run_at,
            day_offset=(run_at.date() - farm_now.date()).days,
        )
