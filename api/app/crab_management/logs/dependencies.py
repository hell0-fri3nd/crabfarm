from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import (
    ForecastServices,
    LogServices,
    ModelTrainingServices,
)


type LogServicesDep = Annotated[LogServices, Depends(Provide(LogServices))]
type ForecastServicesDep = Annotated[ForecastServices, Depends(Provide(ForecastServices))]
type ModelTrainingServicesDep = Annotated[ModelTrainingServices, Depends(Provide(ModelTrainingServices))]

__all__ = [
    "LogServicesDep",
    "ForecastServicesDep",
    "ModelTrainingServicesDep",
]
