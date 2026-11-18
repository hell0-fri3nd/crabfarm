from typing import Annotated

from fastapi import Depends

from app.core import Provide
from .services import ScheduleServices


type ScheduleServicesDep = Annotated[ScheduleServices, Depends(Provide(ScheduleServices))]
