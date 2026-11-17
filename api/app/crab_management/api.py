from .batches import batches_router
from .crab import crab_router
from .logs import (
    forecasts_router,
    logs_router,
)

ROUTERS = [
    crab_router,
    batches_router,
    logs_router,
    forecasts_router,
]
