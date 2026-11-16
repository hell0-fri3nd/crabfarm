from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import BatchServices


type BatchServicesDep = Annotated[BatchServices, Depends(Provide(BatchServices))]

# list: every role; create: DEVELOPER and ADMIN
__all__ = [
    "BatchServicesDep",
]
