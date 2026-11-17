"""Trains the growth model on every crab's actual logs and promotes it WITHOUT the holdout gate: for the first model,
or a deliberate manual override. Scheduled and button retrains use ml.retrain_growth_model instead (ADR-0004).
Run from api/: poetry run python -m ml.train_growth_model"""

import argparse
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

import numpy as np
import torch
from sqlmodel import Session
from torch import nn

from app.core import engine, settings
from app.crab_management.logs import (
    ForecastServices,
    GrowthDay,
    LogServices,
)
from app.infrastructure.ml import (
    CHECKPOINT_PREFIX,
    GrowthForecaster,
    GrowthLstm,
    GrowthScaling,
    HoldoutScore,
    ModelManifest,
    TrainingRunningError,
    get_model_registry,
)

logger = logging.getLogger("train_growth_model")


@dataclass(slots=True, frozen=True)
class TrainingConfig:
    window_days: int = 5
    hidden_size: int = 16
    epochs: int = 200
    learning_rate: float = 0.01


def load_days() -> dict[int, list[GrowthDay]]:
    with Session(engine) as db:
        return ForecastServices.build_features(LogServices(db).list_measured())


def build_training_set(series: list[np.ndarray], window_days: int) -> tuple[torch.Tensor, torch.Tensor]:
    """Every `window_days` run of one crab's days and the day after it. A window never spans two crabs."""
    pairs = [
        (rows[start:start + window_days], rows[start + window_days])
        for rows in series
        for start in range(len(rows) - window_days)
    ]
    if not pairs:
        raise ValueError(f"No crab has more than {window_days} logged days yet, so there's nothing to train on")
    windows, targets = zip(*pairs)
    return torch.from_numpy(np.stack(windows)), torch.from_numpy(np.stack(targets))


def train(windows: torch.Tensor, targets: torch.Tensor, config: TrainingConfig) -> GrowthLstm:
    model = GrowthLstm(config.hidden_size)
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    criterion = nn.MSELoss()
    model.train()
    for epoch in range(config.epochs):
        optimizer.zero_grad()
        loss = criterion(model(windows), targets)
        loss.backward()
        optimizer.step()
        if epoch % 20 == 0:
            logger.info("Epoch %d, loss %.6f", epoch, loss.item())
    return model


def fit_forecaster(series: list[np.ndarray], config: TrainingConfig, version: str) -> GrowthForecaster:
    scaling = GrowthScaling.fit(np.concatenate(series))
    windows, targets = build_training_set([scaling.scale(rows) for rows in series], config.window_days)
    logger.info("Training %s on %d windows from %d crabs", version, len(windows), len(series))
    return GrowthForecaster(train(windows, targets, config), scaling, config.window_days, version)


def new_version(trained_at: datetime) -> str:
    return f"{CHECKPOINT_PREFIX}{trained_at:%Y%m%d-%H%M%S}"


def manifest_for(
    forecaster: GrowthForecaster,
    config: TrainingConfig,
    days_by_crab: dict[int, list[GrowthDay]],
    trained_at: datetime,
    scores: dict[str, HoldoutScore],
) -> ModelManifest:
    return ModelManifest(
        version=forecaster.version,
        file=f"{forecaster.version}.pt",
        trained_at=trained_at,
        window_days=config.window_days,
        hidden_size=config.hidden_size,
        crabs=len(days_by_crab),
        logged_days=sum(len(days) for days in days_by_crab.values()),
        scores=scores,
    )


def parse_args() -> argparse.Namespace:
    defaults = TrainingConfig()
    parser = argparse.ArgumentParser(description="Train the crab growth model and promote it without the holdout gate")
    parser.add_argument("--window-days", type=int, default=defaults.window_days)
    parser.add_argument("--hidden-size", type=int, default=defaults.hidden_size)
    parser.add_argument("--epochs", type=int, default=defaults.epochs)
    parser.add_argument("--learning-rate", type=float, default=defaults.learning_rate)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    config = TrainingConfig(args.window_days, args.hidden_size, args.epochs, args.learning_rate)
    registry = get_model_registry()
    training_id = uuid4().hex
    try:
        registry.acquire_lock(training_id)
    except TrainingRunningError:
        raise SystemExit("Another training is running; try again when it finishes")

    try:
        days_by_crab = load_days()
        if not days_by_crab:
            raise SystemExit("No actual logs with both width and weight yet")
        trained_at = datetime.now(timezone.utc)
        series = [ForecastServices.to_rows(days) for days in days_by_crab.values()]
        try:
            forecaster = fit_forecaster(series, config, new_version(trained_at))
        except ValueError as error:
            raise SystemExit(str(error))
        registry.save_and_promote(forecaster, manifest_for(forecaster, config, days_by_crab, trained_at, {}), settings.forecast_keep_models)
        logger.info("Promoted %s to %s", forecaster.version, registry.current_path)
    finally:
        registry.release_lock(training_id)


if __name__ == "__main__":
    main()
