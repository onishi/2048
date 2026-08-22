"""Neural AI (SPEC.md #17.6 相当の Python 研究環境版)。

探索を行わず、1回の推論で次の手を決定する。学習済みモデルが無効な手を
最上位に選んだ場合は、有効な手の中で最もロジットが高いものにフォールバックする。
"""

from __future__ import annotations

import torch

from .board import Board
from .features import board_to_input
from .model import DIRECTIONS, Game2048Net
from .move import Direction, get_valid_moves


class NeuralPlayer:
    def __init__(self, model: Game2048Net):
        self.model = model
        self.model.eval()

    def choose_move(self, board: Board) -> Direction:
        valid_moves = get_valid_moves(board)
        if not valid_moves:
            raise ValueError("No valid moves available")

        with torch.no_grad():
            x = torch.tensor([board_to_input(board)], dtype=torch.float32)
            logits = self.model(x)[0]

        for index in torch.argsort(logits, descending=True).tolist():
            direction = DIRECTIONS[index]
            if direction in valid_moves:
                return direction

        return valid_moves[0]
