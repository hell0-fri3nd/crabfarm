from .feeding import schedules_router
from .registry import devices_router
from .scales import scales_router
from .water_sensors import water_sensors_router

ROUTERS = [
    devices_router,
    scales_router,
    schedules_router,
    water_sensors_router,
]
