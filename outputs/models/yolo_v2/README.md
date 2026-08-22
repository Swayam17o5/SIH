# YOLO v2 Experiment

This directory is reserved for a separately trained detector. The production model remains at `outputs/experiment_20250916_210441/weights/best.pt` and is not overwritten.

YOLO v2 requires a unified dataset containing real deployment-domain images, existing valid images, and synthetic images only as a documented supplement. Run `python backend/src/training/train_yolo_v2.py --data <dataset.yaml>` after adding and validating those images. The script writes training output under this directory and evaluates the held-out test split before any deployment decision.

The repository currently contains one Roboflow-derived class (`Rock`) with 905 train, 48 validation, and 12 test images, all 640x640. No external real-world evaluation set is included, so this experiment is not automatically trainable as a defensible generalization upgrade yet.
