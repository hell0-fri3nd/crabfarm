from .dashboard import dashboard_router
from .events import events_router

ROUTERS = [
    dashboard_router,
    events_router,
]
