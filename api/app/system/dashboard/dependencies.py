from datetime import datetime
from typing import Annotated

from fastapi import Depends

from app.core import AnyRole, Provide
from .services import DashboardServices, DashboardStreamServices


class AccessTokenExpiry:
    """When the request's access token expires, so the stream ends with it."""

    def __call__(self, actor: AnyRole) -> datetime:
        return actor.expires_at


get_access_token_expiry = AccessTokenExpiry()


type DashboardServicesDep = Annotated[DashboardServices, Depends(Provide(DashboardServices))]
type DashboardStreamDep = Annotated[DashboardStreamServices, Depends(DashboardStreamServices)]
type TokenExpiry = Annotated[datetime, Depends(get_access_token_expiry)]
