# Detection Validation

Validation used the unchanged custom model at `outputs/experiment_20250916_210441/weights/best.pt` and the 12 annotated test images in `data/rockfall_training_data/test/images`.

| Image | Actual rock present | Predicted rocks at 0.50 | Average confidence |
| --- | --- | ---: | ---: |
| R-102 | Yes | 1 | 0.864 |
| R-127 | Yes | 1 | 0.771 |
| R-151 | Yes | 1 | 0.752 |
| R-157 | Yes | 1 | 0.918 |
| R-165 | Yes | 1 | 0.583 |
| R-180 | Yes | 1 | 0.889 |
| R-237 | Yes | 1 | 0.830 |
| R-47 | Yes | 1 | 0.753 |
| R-56 | Yes | 1 | 0.909 |
| R-76 | Yes | 1 | 0.832 |
| R-83 | Yes | 1 | 0.843 |
| R-85 | Yes | 1 | 0.903 |

The live API was also tested with three JPEGs at thresholds `0.10` and `0.50`, plus RGB PNG, WEBP, grayscale PNG, invalid bytes, and wide, 4:3, portrait, and square images. Threshold `0.10` exposed lower-confidence boxes that were correctly absent at `0.50`; invalid bytes returned HTTP 400 with `Unable to decode uploaded image.`

## Tiled Inference

The API now accepts `inference_mode=standard|tiled|auto`, `tile_size`, and `tile_overlap`. Auto runs standard inference first and uses tiled inference only when standard returns no detections. Tiled boxes are translated to original-image coordinates and deduplicated with class-aware NMS at IoU `0.45`.

For the supplied portrait image (`558 x 692`), at confidence `0.50` and tile size `448`:

| Standard | Tiled candidates | Final after NMS | Confidence values |
| ---: | ---: | ---: | --- |
| 0 | 2 | 2 | 0.669, 0.520 |

The ten-image comparison at confidence `0.25` and tile size `448` was:

| Image | Standard | Tiled | Final | Highest confidence |
| --- | ---: | ---: | ---: | ---: |
| R-102 | 2 | 2 | 2 | 0.482 |
| R-127 | 4 | 1 | 1 | 0.532 |
| R-151 | 2 | 1 | 1 | 0.608 |
| R-157 | 1 | 1 | 1 | 0.268 |
| R-165 | 3 | 1 | 1 | 0.487 |
| R-180 | 1 | 2 | 2 | 0.766 |
| R-237 | 0 | 1 | 1 | 0.301 |
| R-47 | 1 | 3 | 3 | 0.727 |
| R-56 | 3 | 3 | 3 | 0.729 |
| R-76 | 2 | 2 | 2 | 0.386 |

This is a pipeline validation set, not a claim of universal model accuracy. The training dataset contains one class (`Rock`), 905 train images, 48 validation images, and 12 test images. New mine domains, lighting, scale, and camera viewpoints require separately annotated evaluation images before retraining is justified.
