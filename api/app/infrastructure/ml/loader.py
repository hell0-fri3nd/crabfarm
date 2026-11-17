from datetime import timedelta
from functools import cache
from pathlib import Path
from threading import Lock
from time import monotonic

from app.core import settings
from .forecaster import GrowthForecaster
from .registry import ModelRegistry

API_DIR = Path(__file__).resolve().parents[3]


@cache
def get_model_registry() -> ModelRegistry:
    directory = Path(settings.forecast_model_dir)
    return ModelRegistry(
        directory if directory.is_absolute() else API_DIR / directory,
        lock_timeout=timedelta(minutes=settings.forecast_training_timeout_minutes),
    )


class ServedForecaster:
    """The promoted growth model, reloaded when `current.json` names a new version (checked every few seconds at most)."""

    def __init__(self, check_every_seconds: float):
        self.check_every_seconds = check_every_seconds
        self._forecaster: GrowthForecaster | None = None
        self._checked_at = float("-inf")
        self._lock = Lock()

    def __call__(self) -> GrowthForecaster:
        """Raises FileNotFoundError until a model is promoted."""
        with self._lock:
            if self._forecaster and monotonic() - self._checked_at < self.check_every_seconds:
                return self._forecaster
            registry = get_model_registry()
            if self._forecaster is None or registry.current().version != self._forecaster.version:
                self._forecaster = registry.load_current()
            self._checked_at = monotonic()
            return self._forecaster


load_growth_forecaster = ServedForecaster(check_every_seconds=settings.forecast_reload_seconds)
