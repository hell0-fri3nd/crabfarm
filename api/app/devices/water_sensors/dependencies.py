from datetime import datetime
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)

from app.core import AnyRole, Provide
from app.infrastructure.streaming import StreamHub
from .services import (
    WaterSensorLogServices,
    WaterSensorStreamServices,
    WaterSensorThresholdServices,
)

RETRY_AFTER_SECONDS = "30"


class LiveWaterSensorStream:
    """Water sensor stream services on the process's hub, or 503 while the broker is off or unreachable."""

    def __call__(self, request: Request) -> WaterSensorStreamServices:
        hub: StreamHub | None = getattr(request.app.state, "hub", None)
        if hub is None or not hub.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Live readings are unavailable right now",
                headers={"Retry-After": RETRY_AFTER_SECONDS},
            )
        return WaterSensorStreamServices(hub)


class AccessTokenExpiry:
    """When the request's access token expires, so the stream ends with it."""

    def __call__(self, actor: AnyRole) -> datetime:
        return actor.expires_at


get_water_sensor_stream = LiveWaterSensorStream()
get_access_token_expiry = AccessTokenExpiry()


type WaterSensorStreamDep = Annotated[WaterSensorStreamServices, Depends(get_water_sensor_stream)]
type WaterSensorLogServicesDep = Annotated[WaterSensorLogServices, Depends(Provide(WaterSensorLogServices))]
type WaterSensorThresholdServicesDep = Annotated[WaterSensorThresholdServices, Depends(WaterSensorThresholdServices)]
type TokenExpiry =Annotated[datetime, Depends(get_access_token_expiry)]
