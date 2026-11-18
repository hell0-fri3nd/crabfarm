import logging
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import (
    date,
    datetime,
    time,
    timedelta,
    timezone,
)
from decimal import Decimal
from itertools import groupby
from operator import attrgetter
from zoneinfo import ZoneInfo

import numpy as np
from fastapi import Request, status
from pydantic import ValidationError
from sqlmodel import Session

from app.core import Response, settings
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from app.infrastructure.ml import GrowthForecaster, load_growth_forecaster
from ..models import Logs, LogType
from ..schemas import (
    CrabForecast,
    CreateForecastRequest,
    ForecastReadiness,
    ForecastResult,
    GrowthDay,
    PredictedDay,
)
from .log_services import LogServices

logger = logging.getLogger(__name__)


FORECAST_OUTCOMES = {
    "FORECAST_READY":              (Outcome.SUCCESS, status.HTTP_200_OK),
    "FORECAST_CREATED":            (Outcome.SUCCESS, status.HTTP_201_CREATED),
    "FORECAST_READINESS":          (Outcome.SUCCESS, status.HTTP_200_OK),
    "FORECAST_INSUFFICIENT_DATA":  (Outcome.FAILURE, status.HTTP_400_BAD_REQUEST),
    "FORECAST_ALREADY_EXISTS":     (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "FORECAST_MODEL_UNAVAILABLE":  (Outcome.ERROR,   status.HTTP_503_SERVICE_UNAVAILABLE),
    "FORECAST_FAILED":             (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

FORECAST_ERRORS = {
    "FORECAST_INSUFFICIENT_DATA": ("crab_id", "Not enough logged days with both width and weight to forecast this crab"),
    "FORECAST_ALREADY_EXISTS":    ("crab_id", "This crab's last forecast still covers the coming days; forecast again after its last predicted day"),
    "FORECAST_MODEL_UNAVAILABLE": ("server", "The growth model isn't trained yet"),
    "FORECAST_FAILED":            ("server", "Unable to forecast right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in FORECAST_ERRORS.items()}


@dataclass(slots=True, frozen=True)
class ForecastPlan:
    """Who can be forecast now, each with their latest logged days. `old` crabs lack enough recent days."""

    recent: dict[int, list[GrowthDay]]
    old: dict[int, list[GrowthDay]]
    already_forecast: frozenset[int]
    too_few_recent: list[int]
    too_few_ever: list[int]
    latest_batch: dict[int, int | None]


class ForecastServices:
    def __init__(
        self,
        db: Session,
        logs: LogServices | None = None,
        forecaster: GrowthForecaster | None = None,
        audit: AuditServices | None = None,
    ):
        self.logs = logs or LogServices(db)
        self._forecaster = forecaster
        self.audit = audit or AuditServices(outcomes=FORECAST_OUTCOMES, errors=FORECAST_ERRORS)

    @property
    def forecaster(self) -> GrowthForecaster:
        return self._forecaster or load_growth_forecaster()

    @staticmethod
    def __failed(code: str) -> Response:
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    @staticmethod
    def __today() -> date:
        return datetime.now(ZoneInfo(settings.farm_time_zone)).date()

    @staticmethod
    def __start_of(day: date) -> datetime:
        return datetime.combine(day, time(), tzinfo=timezone.utc)

    @staticmethod
    def __daily(crab_logs: Iterable[Logs]) -> list[GrowthDay]:
        latest_per_day = [
            max(same_day, key=attrgetter("created_at"))
            for _, same_day in groupby(crab_logs, key=lambda log: log.created_at.date())
        ]
        return [
            GrowthDay(day=log.created_at.date(), width_mm=float(log.width_mm), weight_g=float(log.weight_g))
            for log in latest_per_day
        ]

    @classmethod
    def build_features(cls, logs: Iterable[Logs]) -> dict[int, list[GrowthDay]]:
        """Each crab's measured logs as one row per logged day (the day's latest log), oldest first.
        Training and inference both use this, so they never disagree on what a day's measurement is."""
        ordered = sorted(logs, key=attrgetter("crab_id", "created_at"))
        return {crab_id: cls.__daily(crab_logs) for crab_id, crab_logs in groupby(ordered, key=attrgetter("crab_id"))}

    @staticmethod
    def to_rows(days: list[GrowthDay]) -> np.ndarray:
        return np.array([(day.width_mm, day.weight_g) for day in days], dtype=np.float32)

    @staticmethod
    def __first_day(days: list[GrowthDay], today: date) -> date:
        """Today, or tomorrow when the crab was already measured today."""
        return max(days[-1].day + timedelta(days=1), today)

    @classmethod
    def __forecast_crab(
        cls,
        forecaster: GrowthForecaster,
        crab_id: int,
        batch_id: int | None,
        days: list[GrowthDay],
        today: date,
    ) -> CrabForecast:
        predicted = forecaster.forecast(cls.to_rows(days), settings.forecast_horizon_days)
        first_day = cls.__first_day(days, today)
        points = [
            PredictedDay(
                day_offset=offset,
                day=first_day + timedelta(days=offset - 1),
                predicted_width_mm=round(float(width_mm), 2),
                predicted_weight_g=round(float(weight_g), 2),
            )
            for offset, (width_mm, weight_g) in enumerate(predicted, start=1)
        ]
        return CrabForecast(crab_id=crab_id, batch_id=batch_id, window_start=days[0].day, window_end=days[-1].day, points=points)

    def __plan(self, forecaster: GrowthForecaster, crab_id: int | None, today: date) -> ForecastPlan:
        since = datetime.now(timezone.utc) - timedelta(days=settings.forecast_history_days)
        logs = self.logs.list_measured(crab_id=crab_id)
        min_days = max(settings.forecast_min_logged_days, forecaster.window_days)
        history = self.build_features(logs)
        recent_days = self.build_features(log for log in logs if log.created_at >= since)

        # The input is each crab's latest logged days, even from earlier months; only the forecast dates follow today
        latest_days = {crab: days[-settings.forecast_history_days:] for crab, days in history.items()}
        has_recent_days = {crab for crab, days in recent_days.items() if len(days) >= min_days}
        recent = {crab: latest_days[crab] for crab in has_recent_days}
        old = {
            crab: days
            for crab, days in latest_days.items()
            if crab not in has_recent_days and len(days) >= min_days
        }

        # An earlier forecast still reaching this one's first day would overlap it
        last_predicted = self.logs.last_predicted_days([*recent, *old])
        already_forecast = frozenset(
            crab
            for crab, days in (recent | old).items()
            if crab in last_predicted and last_predicted[crab] >= self.__first_day(days, today)
        )
        return ForecastPlan(
            recent=recent,
            old=old,
            already_forecast=already_forecast,
            too_few_recent=[crab for crab in recent_days if crab not in recent],
            too_few_ever=[crab for crab in history if crab not in recent and crab not in old],
            latest_batch={log.crab_id: log.batch_id for log in logs},
        )

    def readiness(self) -> Response[ForecastReadiness]:
        """Lets the web warn before forecasting from old logs. Stores nothing and isn't audited."""
        try:
            forecaster = self.forecaster
        except FileNotFoundError:
            return self.__failed("FORECAST_MODEL_UNAVAILABLE")

        try:
            plan = self.__plan(forecaster, None, self.__today())
            old = [days[-1].day for crab, days in plan.old.items() if crab not in plan.already_forecast]
            details = ForecastReadiness(
                recent_crabs=len(plan.recent.keys() - plan.already_forecast),
                old_log_crabs=len(old),
                already_forecast_crabs=len(plan.already_forecast),
                skipped_crabs=len(plan.too_few_ever),
                oldest_last_log=min(old, default=None),
                newest_last_log=max(old, default=None),
            )
            return Response(success=True, message="Forecast readiness", code="FORECAST_READINESS", details=details)

        except Exception:
            logger.exception("Checking forecast readiness failed")
            return self.__failed("FORECAST_FAILED")

    def forecast(self, crab_id: int | None = None, include_old_logs: bool = False) -> Response[ForecastResult]:
        """The coming days of every crab with enough recent logged days (or only `crab_id`). With `include_old_logs`,
        also crabs whose latest logged days are older. Stores nothing."""
        try:
            forecaster = self.forecaster
        except FileNotFoundError:
            logger.error("No growth model promoted in %s; train one with ml.train_growth_model", settings.forecast_model_dir)
            return self.__failed("FORECAST_MODEL_UNAVAILABLE")

        try:
            today = self.__today()
            plan = self.__plan(forecaster, crab_id, today)
            eligible = plan.recent | plan.old if include_old_logs else plan.recent
            if not eligible:
                return self.__failed("FORECAST_INSUFFICIENT_DATA")

            already_forecast = sorted(crab for crab in eligible if crab in plan.already_forecast)
            if len(already_forecast) == len(eligible):
                return self.__failed("FORECAST_ALREADY_EXISTS")

            forecasts = [
                self.__forecast_crab(forecaster, crab, plan.latest_batch[crab], days, today)
                for crab, days in eligible.items()
                if crab not in plan.already_forecast
            ]
            result = ForecastResult(
                model_version=forecaster.version,
                forecasts=forecasts,
                skipped_crab_ids=plan.too_few_ever if include_old_logs else plan.too_few_recent,
                already_forecast_crab_ids=already_forecast,
                old_log_crab_ids=[forecast.crab_id for forecast in forecasts if forecast.crab_id in plan.old],
            )
            return Response(success=True, message="Forecast ready", code="FORECAST_READY", details=result)

        except Exception:
            logger.exception("Forecast failed (crab %s)", crab_id or "all")
            return self.__failed("FORECAST_FAILED")

    def create(self, payload: CreateForecastRequest, actor: Actor, request: Request | None = None) -> Response[ForecastResult]:
        """Forecasts and inserts each predicted day as a prediction log."""
        action = "forecast.create"
        target_label = f"crab {payload.crab_id}" if payload.crab_id else "all crabs"
        result = self.forecast(payload.crab_id, payload.include_old_logs)
        if not result:
            self.audit.record_target(action, result.code, request, actor, target_type="crab", target_label=target_label)
            return result

        try:
            predictions = [
                Logs.model_validate(
                    {
                        "crab_id": forecast.crab_id,
                        "batch_id": forecast.batch_id,
                        "user_id": actor.id,
                        "log_type": LogType.PREDICTION,
                        "width_mm": Decimal(f"{point.predicted_width_mm:.2f}"),
                        "weight_g": Decimal(f"{point.predicted_weight_g:.2f}"),
                        "created_at": self.__start_of(point.day),
                    }
                )
                for forecast in result.details.forecasts
                for point in forecast.points
            ]
        except ValidationError:
            logger.exception("A predicted width or weight is outside a log's bounds (%s)", target_label)
            self.audit.record_target(action, "FORECAST_FAILED", request, actor, target_type="crab", target_label=target_label)
            return self.__failed("FORECAST_FAILED")

        if not self.logs.create_many(predictions):
            logger.error("Saving the prediction logs failed (%s)", target_label)
            self.audit.record_target(action, "FORECAST_FAILED", request, actor, target_type="crab", target_label=target_label)
            return self.__failed("FORECAST_FAILED")

        self.audit.record_target(
            action,
            "FORECAST_CREATED",
            request,
            actor,
            target_type="crab",
            target_label=target_label,
            changes={
                "after": {
                    "model_version": result.details.model_version,
                    "crab_ids": [forecast.crab_id for forecast in result.details.forecasts],
                    "skipped_crab_ids": result.details.skipped_crab_ids,
                    "already_forecast_crab_ids": result.details.already_forecast_crab_ids,
                    "old_log_crab_ids": result.details.old_log_crab_ids,
                    "predicted_logs": len(predictions),
                }
            },
        )
        return Response(success=True, message="Forecast saved", code="FORECAST_CREATED", details=result.details)
