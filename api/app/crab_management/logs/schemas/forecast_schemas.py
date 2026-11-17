from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class CreateForecastRequest(BaseModel):
    """No crab_id forecasts every crab with enough logged days."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={"examples": [{}, {"crab_id": 1}]},
    )

    crab_id: int | None = Field(default=None, gt=0)


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
