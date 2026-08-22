#!/usr/bin/env python3
"""模倣学習スクリプト (SPEC.md #17.4)。

    python research/scripts/train.py --dataset dataset.jsonl --epochs 20 --output model.pt

generate_dataset.py で生成した JSON Lines (board / bestAction / values) を読み込み、
Expectimax の bestAction を教師ラベルとして Cross Entropy で学習する。
"""

from __future__ import annotations

import argparse
import json

import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset, random_split

from game2048.features import board_to_input
from game2048.model import DIRECTIONS, Game2048Net


class ImitationDataset(Dataset):
    def __init__(self, path: str):
        self.records: list[dict] = []
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    self.records.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        record = self.records[index]
        x = torch.tensor(board_to_input(record["board"]), dtype=torch.float32)
        y = DIRECTIONS.index(record["bestAction"])
        return x, y


def evaluate_accuracy(model: Game2048Net, loader: DataLoader) -> float:
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in loader:
            preds = model(x).argmax(dim=1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    return correct / total if total else 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Expectimax を教師にした模倣学習 (SPEC.md #17.4)")
    parser.add_argument("--dataset", required=True, help="generate_dataset.py の出力 (JSON Lines)")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--val-split", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--output", default="model.pt")
    args = parser.parse_args()

    torch.manual_seed(args.seed)

    dataset = ImitationDataset(args.dataset)
    val_size = int(len(dataset) * args.val_split)
    train_size = len(dataset) - val_size
    train_ds, val_ds = random_split(
        dataset, [train_size, val_size], generator=torch.Generator().manual_seed(args.seed)
    )
    print(f"dataset: {len(dataset)} records ({train_size} train / {val_size} val)")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    model = Game2048Net()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(args.epochs):
        model.train()
        total_loss = 0.0
        for x, y in train_loader:
            optimizer.zero_grad()
            logits = model(x)
            loss = loss_fn(logits, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * x.size(0)

        train_loss = total_loss / train_size if train_size else 0.0
        val_accuracy = evaluate_accuracy(model, val_loader) if val_size else float("nan")
        print(f"epoch {epoch + 1}/{args.epochs}: train_loss={train_loss:.4f} val_accuracy={val_accuracy:.3f}")

    torch.save(model.state_dict(), args.output)
    print(f"\nSaved model to {args.output}")


if __name__ == "__main__":
    main()
