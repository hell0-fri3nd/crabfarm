import json
import os
from datetime import (
    datetime,
    timedelta,
    timezone,
)
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from .forecaster import GrowthForecaster

CHECKPOINT_PREFIX = "growth-lstm-"
TRAININGS_KEPT = 100

type TrainingState = Literal["queued", "running", "succeeded", "failed", "insufficient_data"]
type TrainingOutcome = Literal["promoted", "rejected", "skipped"]
type TrainingTrigger = Literal["manual", "scheduled"]


class HoldoutScore(BaseModel):
    """Error on each scored crab's held-out last days; `mape_pct` (both targets) decides promotion."""

    mae_width_mm: float
    mae_weight_g: float
    mape_pct: float


class ModelManifest(BaseModel):
    """`current.json`: the served model, i.e. the champion."""

    version: str
    file: str
    trained_at: datetime
    window_days: int
    hidden_size: int
    crabs: int
    logged_days: int
    scores: dict[str, HoldoutScore] = Field(default_factory=dict)


class TrainingStatus(BaseModel):
    """One retrain (`trainings/<training_id>.json`). `outcome` is set once it has `succeeded`."""

    training_id: UUID
    status: TrainingState
    outcome: TrainingOutcome | None = None
    trigger: TrainingTrigger
    started_by: UUID | None = None
    started_at: datetime
    finished_at: datetime | None = None
    version: str | None = None
    scores: dict[str, HoldoutScore] = Field(default_factory=dict)
    reason: str | None = None


class TrainingRunningError(Exception):
    pass


class ModelRegistry:
    """Versioned growth checkpoints in one folder, `current.json` naming the served one, a record per training,
    and a one-training-at-a-time lock."""

    def __init__(self, directory: Path, lock_timeout: timedelta):
        self.directory = directory
        self.lock_timeout = lock_timeout

    def __repr__(self) -> str:
        return f"ModelRegistry(directory={str(self.directory)!r})"

    @property
    def current_path(self) -> Path:
        return self.directory / "current.json"

    @property
    def trainings_dir(self) -> Path:
        return self.directory / "trainings"

    @property
    def lock_path(self) -> Path:
        return self.directory / ".training.lock"

    @staticmethod
    def __write_atomically(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(content, encoding="utf-8")
        # os.replace swaps in one step, so a reader never sees half a file
        os.replace(temporary, path)

    def current(self) -> ModelManifest:
        """The served model's manifest. Raises FileNotFoundError until a model is promoted."""
        return ModelManifest.model_validate_json(self.current_path.read_text(encoding="utf-8"))

    def current_or_none(self) -> ModelManifest | None:
        try:
            return self.current()
        except FileNotFoundError:
            return None

    def load_current(self) -> GrowthForecaster:
        return GrowthForecaster.load(self.directory / self.current().file)

    def save_and_promote(self, forecaster: GrowthForecaster, manifest: ModelManifest, keep: int) -> None:
        forecaster.save(self.directory / manifest.file)
        self.__write_atomically(self.current_path, manifest.model_dump_json(indent=2))
        self.__prune_checkpoints(keep, served=manifest.file)

    def __prune_checkpoints(self, keep: int, served: str) -> None:
        checkpoints = sorted(self.directory.glob(f"{CHECKPOINT_PREFIX}*.pt"), key=lambda path: path.name, reverse=True)
        for stale in checkpoints[keep:]:
            if stale.name != served:
                stale.unlink(missing_ok=True)

    def fingerprint(self) -> tuple[int | None, int | None, int | None]:
        """Changes whenever a model is promoted, a training starts or ends, or a training record is rewritten."""

        def modified(path: Path) -> int | None:
            try:
                return path.stat().st_mtime_ns
            except FileNotFoundError:
                return None

        latest_record = max((modified(path) or 0 for path in self.trainings_dir.glob("*.json")), default=None)
        return modified(self.current_path), modified(self.lock_path), latest_record

    def record_training(self, training: TrainingStatus) -> None:
        self.__write_atomically(self.trainings_dir / f"{training.training_id}.json", training.model_dump_json(indent=2))
        for stale in self.list_trainings()[TRAININGS_KEPT:]:
            (self.trainings_dir / f"{stale.training_id}.json").unlink(missing_ok=True)

    def get_training(self, training_id: UUID) -> TrainingStatus:
        """Raises FileNotFoundError for an unknown training."""
        return TrainingStatus.model_validate_json((self.trainings_dir / f"{training_id}.json").read_text(encoding="utf-8"))

    def list_trainings(self) -> list[TrainingStatus]:
        """Every kept training, newest first."""
        trainings = [
            TrainingStatus.model_validate_json(path.read_text(encoding="utf-8"))
            for path in self.trainings_dir.glob("*.json")
        ]
        return sorted(trainings, key=lambda training: training.started_at, reverse=True)

    def __lock_is_stale(self) -> bool:
        try:
            taken_at = datetime.fromisoformat(json.loads(self.lock_path.read_text(encoding="utf-8"))["taken_at"])
        except (FileNotFoundError, ValueError, KeyError):
            return True
        return datetime.now(timezone.utc) - taken_at > self.lock_timeout

    def acquire_lock(self, training_id: UUID) -> None:
        """Raises TrainingRunningError while another training holds the lock. A lock older than the timeout is
        taken over, since its process died without releasing it."""
        self.directory.mkdir(parents=True, exist_ok=True)
        if self.lock_path.exists() and self.__lock_is_stale():
            self.lock_path.unlink(missing_ok=True)
        try:
            descriptor = os.open(self.lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError as error:
            raise TrainingRunningError from error
        with os.fdopen(descriptor, "w", encoding="utf-8") as lock:
            json.dump({"training_id": str(training_id), "taken_at": datetime.now(timezone.utc).isoformat()}, lock)

    def lock_owner(self) -> UUID | None:
        try:
            return UUID(json.loads(self.lock_path.read_text(encoding="utf-8"))["training_id"])
        except (FileNotFoundError, ValueError, KeyError):
            return None

    def release_lock(self, training_id: UUID) -> None:
        if self.lock_owner() == training_id:
            self.lock_path.unlink(missing_ok=True)
