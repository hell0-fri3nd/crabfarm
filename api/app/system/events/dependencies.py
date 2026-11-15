from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)

from app.authentication.users import get_current_user
from app.core import JwtManager
from app.infrastructure.streaming import StreamHub

RETRY_AFTER_SECONDS = "30"


class LiveStreamHub:
    """The process's stream hub, or 503 while the broker is unreachable."""

    def __call__(self, request: Request) -> StreamHub:
        hub: StreamHub | None = getattr(request.app.state, "hub", None)
        if hub is None or not hub.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Live updates are unavailable right now",
                headers={"Retry-After": RETRY_AFTER_SECONDS},
            )
        return hub


class AccessTokenExpiry:
    """When the request's access token expires, so a stream can end with it."""

    def __call__(self, request: Request, _: object = Depends(get_current_user)) -> datetime | None:
        token: str | None = getattr(request.state, "access_token", None)
        if token is None:
            return None
        return datetime.fromtimestamp(JwtManager().decode_token(token)["exp"], tz=timezone.utc)


get_stream_hub = LiveStreamHub()
get_access_token_expiry = AccessTokenExpiry()


type StreamHubDep = Annotated[StreamHub, Depends(get_stream_hub)]
type TokenExpiry = Annotated[datetime | None, Depends(get_access_token_expiry)]
