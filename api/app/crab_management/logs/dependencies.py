from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import ForecastServices, LogServices


type LogServicesDep = Annotated[LogServices, Depends(Provide(LogServices))]
type ForecastServicesDep = Annotated[ForecastServices, Depends(Provide(ForecastServices))]

__all__ = [
    "LogServicesDep",
    "ForecastServicesDep",
]
