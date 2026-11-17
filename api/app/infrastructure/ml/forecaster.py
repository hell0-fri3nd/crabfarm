from dataclasses import dataclass
from pathlib import Path
from typing import Self

import numpy as np
import torch

from .growth_lstm import GrowthLstm

SCALE_EPSILON = 1e-8


@dataclass(slots=True, frozen=True)
class GrowthScaling:
    """Min-max scaling fixed at training time, so inference scales exactly as the model learned."""

    low: np.ndarray
    high: np.ndarray

    @classmethod
    def fit(cls, rows: np.ndarray) -> Self:
        return cls(low=rows.min(axis=0), high=rows.max(axis=0))

    @property
    def span(self) -> np.ndarray:
        return self.high - self.low + SCALE_EPSILON

    def scale(self, rows: np.ndarray) -> np.ndarray:
        return ((rows - self.low) / self.span).astype(np.float32)

    def unscale(self, rows: np.ndarray) -> np.ndarray:
        return rows * self.span + self.low


class GrowthForecaster:
    """The trained growth LSTM, its scaling and the window it reads."""

    def __init__(self, model: GrowthLstm, scaling: GrowthScaling, window_days: int, version: str):
        self.model = model.eval()
        self.scaling = scaling
        self.window_days = window_days
        self.version = version

    def __repr__(self) -> str:
        return f"GrowthForecaster(version={self.version!r}, window_days={self.window_days})"

    def forecast(self, history: np.ndarray, horizon_days: int) -> np.ndarray:
        """Predicts `horizon_days` rows, feeding each predicted day back in as the newest day of the window."""
        window = torch.from_numpy(self.scaling.scale(history[-self.window_days:])).unsqueeze(0)
        predicted = []
        with torch.inference_mode():
            for _ in range(horizon_days):
                next_day = self.model(window)
                predicted.append(next_day[0])
                window = torch.cat((window[:, 1:], next_day.unsqueeze(1)), dim=1)
        return self.scaling.unscale(torch.stack(predicted).numpy())

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "state_dict": self.model.state_dict(),
                "hidden_size": self.model.lstm.hidden_size,
                "window_days": self.window_days,
                "low": torch.from_numpy(self.scaling.low),
                "high": torch.from_numpy(self.scaling.high),
                "version": self.version,
            },
            path,
        )

    @classmethod
    def load(cls, path: Path) -> Self:
        # weights_only: a checkpoint is data, so a tampered file can't run code on load
        checkpoint = torch.load(path, weights_only=True)
        model = GrowthLstm(hidden_size=checkpoint["hidden_size"])
        model.load_state_dict(checkpoint["state_dict"])
        scaling = GrowthScaling(low=checkpoint["low"].numpy(), high=checkpoint["high"].numpy())
        return cls(model, scaling, window_days=checkpoint["window_days"], version=checkpoint["version"])
