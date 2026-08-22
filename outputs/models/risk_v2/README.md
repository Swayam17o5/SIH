# Risk v2 Experiment

Risk v2 is an isolated multiclass experiment. It uses the existing synthetic CSV only as a development baseline; it is not real mine-safety data. Critical is derived from the documented continuous score band (`>= 0.80`) because the source CSV labels only Low/Medium/High.

The production binary models under `outputs/models` are unchanged. Do not copy this experiment into production until it is evaluated on real held-out mine data and its calibration is reviewed.
