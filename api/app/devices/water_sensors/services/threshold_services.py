from math import isinf

from app.core import Response
from ..models import WaterSensorName
from ..schemas import WaterSensorThresholdRead
from ..thresholds import (
    SENSOR_THRESHOLDS,
    Band,
    normal_band,
    normal_range_label,
)


class WaterSensorThresholdServices:
    @staticmethod
    def __to_limits(bands: tuple[Band, ...]) -> list[tuple[float | None, float | None]]:
        return [(None if isinf(low) else low, None if isinf(high) else high) for low, high in bands]

    def __to_read(self, sensor: WaterSensorName) -> WaterSensorThresholdRead:
        thresholds = SENSOR_THRESHOLDS[sensor]
        normal_min, normal_max = normal_band(sensor)
        return WaterSensorThresholdRead(
            sensor=sensor,
            warning=self.__to_limits(thresholds.warning),
            danger=self.__to_limits(thresholds.danger),
            normal_min=normal_min,
            normal_max=normal_max,
            normal_range=normal_range_label(sensor),
        )

    def list(self) -> Response[list[WaterSensorThresholdRead]]:
        return Response(
            success=True,
            message="Water sensor thresholds retrieved",
            code="WATER_SENSOR_THRESHOLDS_LISTED",
            details=[self.__to_read(sensor) for sensor in WaterSensorName],
        )
