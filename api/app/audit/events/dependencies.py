from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import AuditEventServices


type AuditEventServicesDep = Annotated[AuditEventServices, Depends(Provide(AuditEventServices))]

__all__ = [
    "AuditEventServicesDep",
]
