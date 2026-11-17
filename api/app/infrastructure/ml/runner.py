import subprocess
import sys
from uuid import UUID

from .loader import API_DIR, get_model_registry


class TrainingRunner:
    """Starts `ml.retrain_growth_model` as its own process, so training never runs inside the API."""

    def start(self, training_id: UUID, started_by: UUID) -> None:
        registry = get_model_registry()
        log_file = (registry.directory / "training.log").open("a", encoding="utf-8")
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "ml.retrain_growth_model",
                "--trigger",
                "manual",
                "--training-id",
                str(training_id),
                "--started-by",
                str(started_by),
            ],
            cwd=API_DIR,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
        )
        log_file.close()
