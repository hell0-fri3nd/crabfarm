from .forecasts import router as forecasts_router
from .logs import router as logs_router
from .model_trainings import router as model_trainings_router

__all__ = [
    "forecasts_router",
    "logs_router",
    "model_trainings_router",
]
