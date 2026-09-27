from fastapi import APIRouter

from .users import user_router


ROUTERS = [
    user_router
]
