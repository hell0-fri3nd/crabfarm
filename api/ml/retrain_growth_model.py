"""Retrains the growth model and promotes it only if it beats both the served model and a straight-line baseline on
each scored crab's held-out last days (ADR-0004). The weekly schedule and the web's Retrain button both run this.
Run from api/: poetry run python -m ml.retrain_growth_model"""

import argparse
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import numpy as np

from app.core import settings
from app.crab_management.logs import ForecastServices, GrowthDay
from app.infrastructure.ml import (
    HoldoutScore,
    ModelRegistry,
    TrainingRunningError,
    TrainingStatus,
    get_model_registry,
)
from ml.train_growth_model import (
    TrainingConfig,
    fit_forecaster,
    load_days,
    manifest_for,
    new_version,
)

logger = logging.getLogger("retrain_growth_model")

CHALLENGER = "challenger"
CHAMPION = "champion"
BASELINE = "baseline"


@dataclass(slots=True, frozen=True)
class Holdout:
    history: np.ndarray
    actual: np.ndarray


def split_holdouts(days_by_crab: dict[int, list[GrowthDay]], window_days: int, horizon: int) -> tuple[list[np.ndarray], list[Holdout]]:
    """Training series, where each scored crab loses its last `horizon` days, and those held-out days to score on."""
    series, holdouts = [], []
    for days in days_by_crab.values():
        rows = ForecastServices.to_rows(days)
        if len(rows) < window_days + horizon:
            series.append(rows)
            continue
        series.append(rows[:-horizon])
        holdouts.append(Holdout(history=rows[:-horizon], actual=rows[-horizon:]))
    return series, holdouts


def straight_line(history: np.ndarray, horizon: int) -> np.ndarray:
    """Each crab's own linear trend over its window, extended `horizon` days: the yardstick a model must beat."""
    steps = np.arange(len(history))
    ahead = np.arange(len(history), len(history) + horizon)
    return np.column_stack([np.polyval(np.polyfit(steps, history[:, column], 1), ahead) for column in range(history.shape[1])])


def score(predict: Callable[[np.ndarray, int], np.ndarray], holdouts: list[Holdout]) -> HoldoutScore:
    errors = np.concatenate([np.abs(predict(holdout.history, len(holdout.actual)) - holdout.actual) for holdout in holdouts])
    actual = np.concatenate([holdout.actual for holdout in holdouts])
    mae_width_mm, mae_weight_g = errors.mean(axis=0)
    mape_pct = (errors / np.maximum(np.abs(actual), 1e-6)).mean() * 100
    return HoldoutScore(
        mae_width_mm=round(float(mae_width_mm), 3),
        mae_weight_g=round(float(mae_weight_g), 3),
        mape_pct=round(float(mape_pct), 3),
    )


def decide(scores: dict[str, HoldoutScore]) -> tuple[bool, str]:
    challenger, baseline = scores[CHALLENGER], scores[BASELINE]
    if challenger.mape_pct >= baseline.mape_pct:
        return False, f"New model is {challenger.mape_pct:.1f}% off, no better than the straight line's {baseline.mape_pct:.1f}%"
    if (champion := scores.get(CHAMPION)) and challenger.mape_pct > champion.mape_pct:
        return False, f"New model is {challenger.mape_pct:.1f}% off, worse than the current model's {champion.mape_pct:.1f}%"
    against_champion = f", current model {champion.mape_pct:.1f}%" if champion else ", no current model"
    return True, f"New model is {challenger.mape_pct:.1f}% off (straight line {baseline.mape_pct:.1f}%{against_champion})"


def retrain(registry: ModelRegistry, config: TrainingConfig, check_new_data: bool) -> dict[str, Any]:
    """The result fields of a TrainingStatus: status, outcome, reason, and the scores and version when there are any."""
    days_by_crab = load_days()
    champion = registry.current_or_none()
    logged_days = sum(len(days) for days in days_by_crab.values())
    if check_new_data and champion and (new_days := logged_days - champion.logged_days) < settings.forecast_retrain_min_new_days:
        return {
            "status": "succeeded",
            "outcome": "skipped",
            "reason": f"Only {new_days} new logged crab-days since {champion.version}; a scheduled retrain needs {settings.forecast_retrain_min_new_days}",
        }

    horizon = settings.forecast_horizon_days
    series, holdouts = split_holdouts(days_by_crab, config.window_days, horizon)
    if len(holdouts) < settings.forecast_retrain_min_scored_crabs:
        return {
            "status": "insufficient_data",
            "reason": f"Only {len(holdouts)} crabs have the {config.window_days + horizon} logged days needed to score a model; need {settings.forecast_retrain_min_scored_crabs}",
        }

    trained_at = datetime.now(timezone.utc)
    version = new_version(trained_at)
    challenger = fit_forecaster(series, config, version)
    scores = {
        CHALLENGER: score(challenger.forecast, holdouts),
        BASELINE: score(straight_line, holdouts),
    }
    if champion:
        scores[CHAMPION] = score(registry.load_current().forecast, holdouts)

    promote, reason = decide(scores)
    logger.info("%s: %s", "Promoting" if promote else "Keeping the current model", reason)
    if not promote:
        return {"status": "succeeded", "outcome": "rejected", "reason": reason, "scores": scores}

    # Scored on held-out days; served after learning from those days too
    served = fit_forecaster([ForecastServices.to_rows(days) for days in days_by_crab.values()], config, version)
    registry.save_and_promote(served, manifest_for(served, config, days_by_crab, trained_at, scores), settings.forecast_keep_models)
    return {"status": "succeeded", "outcome": "promoted", "reason": reason, "scores": scores, "version": version}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Retrain the crab growth model behind the holdout gate")
    parser.add_argument("--trigger", choices=["scheduled", "manual"], default="scheduled")
    parser.add_argument("--training-id", type=UUID, help="Set by the API, which already holds the training lock for this id")
    parser.add_argument("--started-by", type=UUID, help="The user id that pressed Retrain")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    registry = get_model_registry()
    training_id = args.training_id or uuid4()

    if args.training_id:
        if registry.lock_owner() != training_id:
            raise SystemExit(f"The training lock isn't held for {training_id}")
    else:
        try:
            registry.acquire_lock(training_id)
        except TrainingRunningError:
            logger.info("Another training is running; skipping this one")
            return

    status = TrainingStatus(
        training_id=training_id,
        status="running",
        trigger=args.trigger,
        started_by=args.started_by,
        started_at=datetime.now(timezone.utc),
    )
    try:
        registry.record_training(status)
        outcome = retrain(registry, TrainingConfig(), check_new_data=args.trigger == "scheduled")
    except Exception:
        logger.exception("Retraining %s failed", training_id)
        outcome = {"status": "failed", "reason": "The training crashed; see training.log next to the models"}
    logger.info("Training %s %s (%s): %s", training_id, outcome["status"], outcome.get("outcome"), outcome["reason"])
    try:
        registry.record_training(status.model_copy(update={**outcome, "finished_at": datetime.now(timezone.utc)}))
    finally:
        registry.release_lock(training_id)


if __name__ == "__main__":
    main()
