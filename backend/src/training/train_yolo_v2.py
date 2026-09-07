#!/usr/bin/env python3
"""Train and evaluate an isolated YOLO v2 detector.

This command never overwrites the current detector. It expects a separately
curated YOLO dataset and writes the new model beneath outputs/models/yolo_v2.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_WEIGHTS = ROOT / "yolov8n.pt"
OUTPUT_DIR = ROOT / "outputs" / "models" / "yolo_v2"


def validate_dataset(data_path: Path) -> dict[str, Any]:
    config = yaml.safe_load(data_path.read_text())
    if config.get("nc") != len(config.get("names", [])):
        raise ValueError("Dataset nc does not match names")
    if not config.get("names"):
        raise ValueError("Dataset must define at least one class")
    for split in ("train", "val", "test"):
        if split not in config:
            raise ValueError(f"Dataset is missing the {split} split")
    return config


def count_images(path: Path) -> int:
    return sum(1 for item in path.rglob("*") if item.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})


def main() -> None:
    parser = argparse.ArgumentParser(description="Train an isolated YOLO v2 model")
    parser.add_argument("--data", required=True, type=Path, help="Path to the curated YOLO v2 data.yaml")
    parser.add_argument("--weights", type=Path, default=DEFAULT_WEIGHTS)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    data_path = args.data.resolve()
    config = validate_dataset(data_path)
    print(json.dumps({"classes": config["names"], "dataset": str(data_path)}, indent=2))
    for split in ("train", "val", "test"):
        split_path = Path(config[split])
        if not split_path.is_absolute():
            split_path = data_path.parent / split_path
        print(f"{split}_images: {count_images(split_path)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = YOLO(str(args.weights))
    run = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=args.workers,
        project=str(OUTPUT_DIR),
        name="training",
        exist_ok=True,
        pretrained=True,
        plots=True,
        mosaic=1.0,
        mixup=0.0,
        copy_paste=0.0,
    )
    best_path = OUTPUT_DIR / "training" / "weights" / "best.pt"
    if not best_path.exists():
        raise FileNotFoundError(f"YOLO training did not produce {best_path}")

    trained = YOLO(str(best_path))
    metrics = trained.val(data=str(data_path), split="test", imgsz=args.imgsz, device=args.device)
    summary = {
        "model": str(best_path),
        "classes": config["names"],
        "metrics": {
            "precision": float(metrics.box.mp),
            "recall": float(metrics.box.mr),
            "map50": float(metrics.box.map50),
            "map50_95": float(metrics.box.map),
        },
    }
    (OUTPUT_DIR / "evaluation.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
