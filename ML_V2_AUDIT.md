# SIH25071 ML v2 Audit

## Scope

The production system remains intact. The current YOLO weights at `outputs/experiment_20250916_210441/weights/best.pt` were not replaced. The current tabular artifacts under `outputs/models` were not replaced. New experiments are isolated under `outputs/models/yolo_v2` and `outputs/models/risk_v2`.

## Current YOLO

- Ultralytics: 8.4.126
- Architecture: YOLOv8 nano initialized from `yolov8n.pt`
- Input/training size: 640
- Classes: one class, `Rock`
- Dataset: Roboflow-derived YOLO dataset, license metadata says CC BY 4.0
- Splits: 905 train images, 48 validation images, 12 test images
- Image dimensions: all audited images are 640x640
- Labels: 1,043 train boxes, 53 validation boxes, 12 test boxes; all class id 0
- Final recorded run metrics: precision 0.9424, recall 0.9811, mAP50 0.9471, mAP50-95 0.6200
- Training configuration: 50 epochs, batch 16, CPU, mosaic 1.0, mixup 0, copy-paste 0, early stopping patience 15

The dataset is internally clean in the audit (no corrupt images found), but it is narrow: fixed 640x640 imagery and no separately curated external deployment-domain test set. The supplied portrait image demonstrates domain/object-scale generalization risk. Tiled inference recovered genuine predictions on that image (`standard 0`, `tiled 2`, `final 2` at confidence 0.50), but tiling is not a substitute for representative training data.

## YOLO v2

`backend/src/training/train_yolo_v2.py` is a reproducible training/evaluation command. It requires a separately curated dataset YAML, validates train/val/test paths and class metadata, starts from pretrained weights, and writes only to `outputs/models/yolo_v2/training`. It does not automatically deploy or overwrite the current model.

No YOLO v2 weights were trained in this repository because no new diverse, licensed, annotated real-world dataset was available. Therefore YOLO v2 metrics are **not available**, and no improvement claim is made.

## Detection Pipeline

The upload API supports `inference_mode=standard|tiled|auto`, `tile_size`, and `tile_overlap`. Auto runs standard inference first and tiles only when standard has no detections. Tile boxes are translated to original-image coordinates, clipped, and deduplicated with class-aware NMS at IoU 0.45. The UI defaults to confidence 0.25 and displays the actual inference comparison diagnostics.

## Current Risk Model

The existing models were trained for binary `rockfall_event`, not four-class risk. Existing validation metadata reports:

| Model | Accuracy | AUC |
| --- | ---: | ---: |
| XGBoost | 0.629 | 0.650 |
| Random Forest | 0.639 | 0.675 |
| Neural network | 0.617 | 0.649 |
| Ensemble | 0.634 | 0.668 |

The neural network artifact is a state dictionary without its architecture, so the backend now skips it instead of reporting a false successful prediction. The concrete production bug was that XGBoost and Random Forest were trained on raw features but the API passed standardized features. That caused inverted scenario behavior. The fix passes raw features to tree models and reserves scaling for a callable neural model.

Measured after the fix:

| Scenario | Ensemble probability |
| --- | ---: |
| Low terrain/environment | 0.214 |
| Moderate terrain/environment | 0.571 |
| High terrain/environment | 0.782 |

The risk endpoint still maps the existing binary probability to its existing LOW/MEDIUM/HIGH contract. It does not fabricate CRITICAL.

## Risk v2

`backend/src/prediction/train_risk_v2.py` creates a separate four-class Random Forest experiment using score bands: LOW <= 0.30, MEDIUM <= 0.60, HIGH <= 0.80, CRITICAL > 0.80. These bands are documented development assumptions because the source CSV does not contain a real Critical label.

Source data is synthetic only: 5,000 rows. Distribution is LOW 1,650, MEDIUM 1,282, HIGH 962, CRITICAL 1,106. Risk v2 test metrics:

- Accuracy: 0.462
- Macro-F1: 0.411
- High recall: 0.104
- Critical recall: 0.579

This is not suitable for production deployment. The poor High recall confirms that synthetic score-derived labels do not establish a defensible field risk classifier.

## Reproduction

```powershell
python backend/src/prediction/train_risk_v2.py
python backend/src/training/train_yolo_v2.py --data <path-to-curated-yolo-v2-data.yaml> --epochs 100 --imgsz 640 --batch 8 --device cpu
```

## Remaining Work

Collect and license diverse real imagery and risk observations from the intended mine environments. Keep a site-separated held-out test set. Train YOLO v2 only after annotation and leakage checks; deploy only if it beats the current model on the same held-out test set. Train risk v2 on real labeled outcomes and calibrate four-level thresholds from validation data rather than selecting thresholds for dashboard colors.
