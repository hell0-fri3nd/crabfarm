from fastapi import APIRouter

from .crab import router as crab_router


ROUTERS = [
    crab_router
]
