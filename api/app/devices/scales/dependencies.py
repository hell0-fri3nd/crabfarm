from datetime import datetime
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)

from app.core import AnyRole
from app.infrastructure.streaming import StreamHub
from .services import ScaleStreamServices

RETRY_AFTER_SECONDS = "30"


class LiveScaleStream:
    """Scale stream services on the process's hub, or 503 while the broker is off or unreachable."""

    def __call__(self, request: Request) -> ScaleStreamServices:
        hub: StreamHub | None = getattr(request.app.state, "hub", None)
        if hub is None or not hub.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Live readings are unavailable right now",
                headers={"Retry-After": RETRY_AFTER_SECONDS},
            )
        return ScaleStreamServices(hub)


class AccessTokenExpiry:
    """When the request's access token expires, so the stream ends with it."""

    def __call__(self, actor: AnyRole) -> datetime:
        return actor.expires_at


get_scale_stream = LiveScaleStream()
get_access_token_expiry = AccessTokenExpiry()


type ScaleStreamDep = Annotated[ScaleStreamServices, Depends(get_scale_stream)]
type TokenExpiry = Annotated[datetime, Depends(get_access_token_expiry)]
