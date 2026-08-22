"""train.py / export_onnx.py のロジックに対するテスト (Phase 8)。
torch が入っていない環境でも他のテストが動くよう importorskip で切り離す。"""

import json

import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("onnxruntime")

import export_onnx  # noqa: E402
import train  # noqa: E402
from game2048.model import DIRECTIONS, Game2048Net  # noqa: E402


def _write_synthetic_dataset(path, count: int) -> None:
    """board はダミーだが、bestAction と values は正しい形式の合成データセットを書く。"""
    with open(path, "w") as f:
        for i in range(count):
            direction = DIRECTIONS[i % len(DIRECTIONS)]
            record = {
                "board": [0] * 16,
                "bestAction": direction,
                "values": {direction: 100.0},
            }
            f.write(json.dumps(record) + "\n")


def test_imitation_dataset_reads_records(tmp_path):
    dataset_path = tmp_path / "dataset.jsonl"
    _write_synthetic_dataset(dataset_path, 8)

    dataset = train.ImitationDataset(str(dataset_path))
    assert len(dataset) == 8

    x, y = dataset[0]
    assert x.shape == (16,)
    assert y == DIRECTIONS.index("up")


def test_train_end_to_end_saves_model(tmp_path):
    dataset_path = tmp_path / "dataset.jsonl"
    _write_synthetic_dataset(dataset_path, 40)
    model_path = tmp_path / "model.pt"

    import sys

    old_argv = sys.argv
    try:
        sys.argv = [
            "train.py",
            "--dataset",
            str(dataset_path),
            "--epochs",
            "1",
            "--batch-size",
            "8",
            "--val-split",
            "0.2",
            "--output",
            str(model_path),
        ]
        train.main()
    finally:
        sys.argv = old_argv

    assert model_path.exists()

    # 保存された state_dict を実際にモデルへロードできることを確認する
    model = Game2048Net()
    model.load_state_dict(torch.load(str(model_path), map_location="cpu", weights_only=True))


def test_export_onnx_end_to_end(tmp_path):
    model_path = tmp_path / "model.pt"
    onnx_path = tmp_path / "model.onnx"

    model = Game2048Net()
    torch.save(model.state_dict(), model_path)

    import sys

    old_argv = sys.argv
    try:
        sys.argv = ["export_onnx.py", "--model", str(model_path), "--output", str(onnx_path)]
        export_onnx.main()  # 内部で PyTorch と ONNX Runtime の出力一致を検証し、不一致なら例外を投げる
    finally:
        sys.argv = old_argv

    assert onnx_path.exists()
