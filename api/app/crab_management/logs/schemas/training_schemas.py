from typing import Literal

from pydantic import ConfigDict

from app.core import PageQuery
from app.infrastructure.ml import TrainingState


class ListModelTrainingsQuery(PageQuery):
    model_config = ConfigDict(extra="ignore")

    status: TrainingState | None = None
    sort: Literal["started_at", "-started_at"] = "-started_at"
