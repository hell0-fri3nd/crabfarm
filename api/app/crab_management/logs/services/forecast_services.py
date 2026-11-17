import logging
from collections.abc import Iterable
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
    ForecastResult,
    GrowthDay,
    PredictedDay,
)
from .log_services import LogServices

logger = logging.getLogger(__name__)


FORECAST_OUTCOMES = {
    "FORECAST_READY":              (Outcome.SUCCESS, status.HTTP_200_OK),
    "FORECAST_CREATED":            (Outcome.SUCCESS, status.HTTP_201_CREATED),
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

    @classmethod
    def __forecast_crab(cls, forecaster: GrowthForecaster, crab_id: int, batch_id: int | None, days: list[GrowthDay]) -> CrabForecast:
        predicted = forecaster.forecast(cls.to_rows(days), settings.forecast_horizon_days)
        last_day = days[-1].day
        points = [
            PredictedDay(
                day_offset=offset,
                day=last_day + timedelta(days=offset),
                predicted_width_mm=round(float(width_mm), 2),
                predicted_weight_g=round(float(weight_g), 2),
            )
            for offset, (width_mm, weight_g) in enumerate(predicted, start=1)
        ]
        return CrabForecast(crab_id=crab_id, batch_id=batch_id, window_start=days[0].day, window_end=last_day, points=points)

    def forecast(self, crab_id: int | None = None) -> Response[ForecastResult]:
        """The next days of every crab with enough recent logged days (or only `crab_id`). Stores nothing."""
        try:
            forecaster = self.forecaster
        except FileNotFoundError:
            logger.error("No growth model promoted in %s; train one with ml.train_growth_model", settings.forecast_model_dir)
            return self.__failed("FORECAST_MODEL_UNAVAILABLE")

        try:
            since = datetime.now(timezone.utc) - timedelta(days=settings.forecast_history_days)
            logs = self.logs.list_measured(crab_id=crab_id, since=since)
            latest_batch = {log.crab_id: log.batch_id for log in logs}
            min_days = max(settings.forecast_min_logged_days, forecaster.window_days)
            days_by_crab = self.build_features(logs)
            eligible = {crab: days for crab, days in days_by_crab.items() if len(days) >= min_days}
            if not eligible:
                return self.__failed("FORECAST_INSUFFICIENT_DATA")

            # A new forecast starts the day after the crab's last logged day; an earlier forecast reaching that day overlaps it
            last_predicted = self.logs.last_predicted_days(eligible)
            already_forecast = sorted(
                crab for crab, days in eligible.items()
                if crab in last_predicted and last_predicted[crab] > days[-1].day
            )
            if len(already_forecast) == len(eligible):
                return self.__failed("FORECAST_ALREADY_EXISTS")

            result = ForecastResult(
                model_version=forecaster.version,
                forecasts=[
                    self.__forecast_crab(forecaster, crab, latest_batch[crab], days)
                    for crab, days in eligible.items()
                    if crab not in already_forecast
                ],
                skipped_crab_ids=[crab for crab, days in days_by_crab.items() if len(days) < min_days],
                already_forecast_crab_ids=already_forecast,
            )
            return Response(success=True, message="Forecast ready", code="FORECAST_READY", details=result)

        except Exception:
            logger.exception("Forecast failed (crab %s)", crab_id or "all")
            return self.__failed("FORECAST_FAILED")

    def create(self, payload: CreateForecastRequest, actor: Actor, request: Request | None = None) -> Response[ForecastResult]:
        """Forecasts and inserts each predicted day as a prediction log."""
        action = "forecast.create"
        target_label = f"crab {payload.crab_id}" if payload.crab_id else "all crabs"
        result = self.forecast(payload.crab_id)
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
                    "predicted_logs": len(predictions),
                }
            },
        )
        return Response(success=True, message="Forecast saved", code="FORECAST_CREATED", details=result.details)
