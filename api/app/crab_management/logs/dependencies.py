from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import LogServices


type LogServicesDep = Annotated[LogServices, Depends(Provide(LogServices))]

__all__ = [
    "LogServicesDep",
]
