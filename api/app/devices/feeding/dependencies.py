from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import CageServices, ScheduleServices


type CageServicesDep = Annotated[CageServices, Depends(Provide(CageServices))]
type ScheduleServicesDep = Annotated[ScheduleServices, Depends(Provide(ScheduleServices))]
