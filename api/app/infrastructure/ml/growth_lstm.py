import torch
from torch import nn

GROWTH_FEATURES = 2


class GrowthLstm(nn.Module):
    """Reads a window of daily (width_mm, weight_g) rows and predicts the next day's row."""

    def __init__(self, hidden_size: int = 16):
        super().__init__()
        self.lstm = nn.LSTM(GROWTH_FEATURES, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, GROWTH_FEATURES)

    def forward(self, window: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(window)
        return self.fc(output[:, -1, :])
