from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.infrastructure.ml import TrainingStatus

type ModelState = Literal["training", "missing", "due", "ready"]


class ModelStatus(BaseModel):
    """The growth model as the web should explain it. `training` is the latest training record, running or finished."""

    model_config = ConfigDict(frozen=True)

    state: ModelState
    version: str | None
    trained_at: datetime | None
    new_logged_days: int | None
    retrain_after_days: int
    training: TrainingStatus | None
