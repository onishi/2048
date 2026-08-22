"""ニューラルネットモデル定義 (SPEC.md #17.3)。

Input 16
  -> Linear 128 -> ReLU
  -> Linear 128 -> ReLU
  -> Linear 64  -> ReLU
  -> Linear 4   (UP / DOWN / LEFT / RIGHT)
"""

from __future__ import annotations

import torch
from torch import nn

from .features import INPUT_SIZE

DIRECTIONS = ["up", "down", "left", "right"]


class Game2048Net(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(INPUT_SIZE, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, len(DIRECTIONS)),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layers(x)
