from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class CreateForecastRequest(BaseModel):
    """No crab_id forecasts every crab with enough logged days. `include_old_logs` also forecasts crabs without
    enough recent days. Either way a forecast reads the crab's latest logged days and covers the coming days."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={"examples": [{}, {"crab_id": 1}, {"include_old_logs": True}]},
    )

    crab_id: int | None = Field(default=None, gt=0)
    include_old_logs: bool = False


class GrowthDay(BaseModel):
    """One crab's width and weight on one logged day, from that day's latest log."""

    model_config = ConfigDict(frozen=True)

    day: date
    width_mm: float
    weight_g: float


class PredictedDay(BaseModel):
    model_config = ConfigDict(frozen=True)

    day_offset: int = Field(ge=1)
    day: date
    predicted_width_mm: float
    predicted_weight_g: float


class CrabForecast(BaseModel):
    crab_id: int
    batch_id: int | None
    window_start: date
    window_end: date
    points: list[PredictedDay]


class ForecastResult(BaseModel):
    """`skipped_crab_ids` have logs in the window but too few logged days to forecast. `already_forecast_crab_ids`
    still have predictions from an earlier forecast covering the coming days, so they aren't forecast again yet."""

    model_version: str
    forecasts: list[CrabForecast]
    skipped_crab_ids: list[int]
    already_forecast_crab_ids: list[int] = []
    old_log_crab_ids: list[int] = []


class ForecastReadiness(BaseModel):
    """What a forecast would do now. `old_log_crabs` can only be forecast with `include_old_logs`; the two days bound
    their last logged days."""

    model_config = ConfigDict(frozen=True)

    recent_crabs: int
    old_log_crabs: int
    already_forecast_crabs: int
    skipped_crabs: int
    oldest_last_log: date | None
    newest_last_log: date | None
