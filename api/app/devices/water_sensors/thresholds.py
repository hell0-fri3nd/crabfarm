from dataclasses import dataclass
from math import inf, isinf

from app.core import settings
from app.core.config import SensorThresholdConfig
from .models import WaterSensorName, WaterSensorStatus

type Band = tuple[float, float]


@dataclass(slots=True, frozen=True)
class SensorThresholds:
    warning: tuple[Band, ...]
    danger: tuple[Band, ...]

    @classmethod
    def from_config(cls, config: SensorThresholdConfig) -> "SensorThresholds":
        def to_bands(bands) -> tuple[Band, ...]:
            return tuple((-inf if low is None else low, inf if high is None else high) for low, high in bands)

        return cls(warning=to_bands(config.warning), danger=to_bands(config.danger))


# Read from the root .env (WATER_THRESHOLD_<SENSOR>), so the API and the worker always agree
SENSOR_THRESHOLDS = {
    WaterSensorName.TEMPERATURE: SensorThresholds.from_config(settings.water_threshold_temperature),
    WaterSensorName.PH: SensorThresholds.from_config(settings.water_threshold_ph),
    WaterSensorName.SALINITY: SensorThresholds.from_config(settings.water_threshold_salinity),
    WaterSensorName.AMMONIA: SensorThresholds.from_config(settings.water_threshold_ammonia),
    WaterSensorName.TURBIDITY: SensorThresholds.from_config(settings.water_threshold_turbidity),
    WaterSensorName.OXYGEN: SensorThresholds.from_config(settings.water_threshold_oxygen),
}


def __is_within(value: float, bands: tuple[Band, ...]) -> bool:
    return any(low <= value <= high for low, high in bands)


def classify_reading(sensor: WaterSensorName, value: float) -> WaterSensorStatus:
    """Bands share their edges, so Danger is checked first: a value exactly on the edge takes the safer reading."""
    thresholds = SENSOR_THRESHOLDS[sensor]
    if __is_within(value, thresholds.danger):
        return WaterSensorStatus.DANGER
    if __is_within(value, thresholds.warning):
        return WaterSensorStatus.WARNING
    return WaterSensorStatus.NORMAL


def __to_gaps(bands: tuple[Band, ...]) -> list[Band]:
    gaps: list[Band] = []
    covered_to = -inf
    for low, high in sorted(bands):
        if low > covered_to:
            gaps.append((covered_to, low))
        covered_to = max(covered_to, high)
    if covered_to < inf:
        gaps.append((covered_to, inf))
    return gaps


def normal_band(sensor: WaterSensorName) -> tuple[float | None, float | None]:
    """What the bands leave uncovered. A bounded gap wins, since an open one is often just below zero."""
    thresholds = SENSOR_THRESHOLDS[sensor]
    gaps = __to_gaps((*thresholds.warning, *thresholds.danger))
    bounded = [gap for gap in gaps if not isinf(gap[0]) and not isinf(gap[1])]
    candidates = bounded or gaps
    if not candidates:
        return None, None
    low, high = max(candidates, key=lambda gap: gap[1] - gap[0])
    return (None if isinf(low) else low, None if isinf(high) else high)


def normal_range_label(sensor: WaterSensorName) -> str:
    low, high = normal_band(sensor)
    if low is not None and high is not None:
        return f"{low:g}–{high:g}"
    if high is not None:
        return f"below {high:g}"
    return f"above {low:g}" if low is not None else "not set"
