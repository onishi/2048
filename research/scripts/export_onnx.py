#!/usr/bin/env python3
"""ONNX変換スクリプト (SPEC.md #17.5)。

    python research/scripts/export_onnx.py --model model.pt --output model.onnx

学習済みモデルを ONNX 形式へ変換し、ONNX Runtime でロードして
PyTorch 版と出力が一致することを検証する。変換後のモデルは
Web アプリの Static Assets として配信する想定 (/public/models/2048-ai.onnx)。
"""

from __future__ import annotations

import argparse

import numpy as np
import onnxruntime as ort
import torch

from game2048.features import INPUT_SIZE
from game2048.model import Game2048Net


def main() -> None:
    parser = argparse.ArgumentParser(description="学習済みモデルを ONNX へ変換する (SPEC.md #17.5)")
    parser.add_argument("--model", required=True, help="train.py の出力 (state_dict, .pt)")
    parser.add_argument("--output", default="model.onnx")
    parser.add_argument("--atol", type=float, default=1e-4, help="PyTorch/ONNX 出力差の許容誤差")
    args = parser.parse_args()

    model = Game2048Net()
    model.load_state_dict(torch.load(args.model, map_location="cpu", weights_only=True))
    model.eval()

    dummy_input = torch.randn(1, INPUT_SIZE)
    torch.onnx.export(
        model,
        dummy_input,
        args.output,
        input_names=["board"],
        output_names=["action_logits"],
        dynamic_axes={"board": {0: "batch"}, "action_logits": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported to {args.output}")

    # 検証: 同じ入力に対して PyTorch と ONNX Runtime の出力が一致することを確認する
    test_input = torch.randn(8, INPUT_SIZE)
    with torch.no_grad():
        torch_output = model(test_input).numpy()

    session = ort.InferenceSession(args.output, providers=["CPUExecutionProvider"])
    onnx_output = session.run(None, {"board": test_input.numpy()})[0]

    max_diff = float(np.abs(torch_output - onnx_output).max())
    print(f"Max difference between PyTorch and ONNX Runtime outputs: {max_diff:.2e}")
    if max_diff > args.atol:
        raise SystemExit(f"ONNX export verification failed: max diff {max_diff:.2e} > atol {args.atol:.2e}")
    print("ONNX export verified: outputs match")


if __name__ == "__main__":
    main()
