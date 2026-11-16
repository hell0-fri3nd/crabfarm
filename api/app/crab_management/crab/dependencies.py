from typing import Annotated

from fastapi import Depends

from app.core import AnyRole, DeveloperOrAdmin
from app.core import Provide
from .services import CrabServices


type CrabServicesDep = Annotated[CrabServices, Depends(Provide(CrabServices))]

__all__ = [
    "AnyRole", 
    "DeveloperOrAdmin", 
    "CrabServicesDep"
]
