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
from .schemas import ModelStatus
from .services import (
    ForecastServices,
    LogServices,
    ModelStatusServices,
    ModelStatusStream,
    ModelTrainingServices,
)

RETRY_AFTER_SECONDS = "30"



type LogServicesDep = Annotated[LogServices, Depends(Provide(LogServices))]
type ForecastServicesDep = Annotated[ForecastServices, Depends(Provide(ForecastServices))]
type ModelStatusServicesDep = Annotated[ModelStatusServices, Depends(Provide(ModelStatusServices))]
type ModelTrainingServicesDep = Annotated[ModelTrainingServices, Depends(Provide(ModelTrainingServices))]


class LiveModelStatusStream:
    """The model status stream on the process's hub, or 503 while the broker is off or unreachable."""

    def __call__(self, request: Request) -> ModelStatusStream:
        hub: StreamHub | None = getattr(request.app.state, "hub", None)
        if hub is None or not hub.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Live updates are unavailable right now",
                headers={"Retry-After": RETRY_AFTER_SECONDS},
            )
        return ModelStatusStream(hub)


class CurrentModelStatus:
    """The stream's first event, read here because a plain `def` runs the DB query off the event loop."""

    def __call__(self, services: ModelStatusServicesDep) -> ModelStatus:
        return services.snapshot()


class AccessTokenExpiry:
    """When the request's access token expires, so the stream ends with it."""

    def __call__(self, actor: AnyRole) -> datetime:
        return actor.expires_at


type ModelStatusStreamDep = Annotated[ModelStatusStream, Depends(LiveModelStatusStream())]
type CurrentModelStatusDep = Annotated[ModelStatus, Depends(CurrentModelStatus())]
type TokenExpiry = Annotated[datetime, Depends(AccessTokenExpiry())]

__all__ = [
    "LogServicesDep",
    "ForecastServicesDep",
    "ModelStatusServicesDep",
    "ModelStatusStreamDep",
    "CurrentModelStatusDep",
    "TokenExpiry",
    "ModelTrainingServicesDep",
]
