#!/usr/bin/env python3
"""
Multi-Class Rockfall Risk Model Training & Calibration Engine (risk_v2)
========================================================================
Trains and calibrates multi-model ensemble (XGBoost, Random Forest)
on domain-informed geological and meteorological triggers across 4 risk tiers:
- LOW
- MEDIUM
- HIGH
- CRITICAL

Saves models, scalers, metadata, feature importance, and performance evaluation.
"""

from __future__ import annotations

import sys
import json
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import xgboost as xgb

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_PATH = ROOT / "outputs" / "synthetic_training_data.csv"
OUT_MODELS = ROOT / "outputs" / "models"
OUT_RISK_V2 = ROOT / "outputs" / "models" / "risk_v2"

FEATURES = [
    "slope",
    "elevation",
    "fracture_density",
    "roughness",
    "slope_variability",
    "instability_index",
    "wetness_index",
    "month",
    "day_of_year",
    "season",
    "rainfall",
    "temperature",
    "temperature_variation",
    "freeze_thaw_cycles",
    "seismic_activity",
    "wind_speed",
    "precipitation_intensity",
    "humidity"
]

LABELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LABEL_MAP = {label: i for i, label in enumerate(LABELS)}
INV_LABEL_MAP = {i: label for i, label in enumerate(LABELS)}


def train_and_calibrate():
    print("=" * 70)
    print("🚀 TRAINING CALIBRATED 4-CLASS ROCKFALL RISK MODELS")
    print("=" * 70)

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded {len(df):,} samples with {len(df.columns)} features.")

    # 4-tier risk categories based on physical risk scores
    # LOW: < 0.28, MEDIUM: 0.28-0.58, HIGH: 0.58-0.80, CRITICAL: >= 0.80
    df["risk_label"] = pd.cut(
        df["risk_score"],
        bins=[-np.inf, 0.28, 0.58, 0.80, np.inf],
        labels=LABELS,
        include_lowest=True
    )
    df["target_class"] = df["risk_label"].map(LABEL_MAP)

    print("\n📊 Class Distribution:")
    for label in LABELS:
        count = (df["risk_label"] == label).sum()
        pct = count / len(df) * 100
        print(f"   {label:<10}: {count:>5} samples ({pct:>5.1f}%)")

    X = df[FEATURES].copy()
    y = df["target_class"].copy()

    # Stratified Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 1. Fit StandardScaler on Training data
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Compute class weights for imbalanced handling
    from sklearn.utils.class_weight import compute_sample_weight
    sample_weights_train = compute_sample_weight("balanced", y_train)

    print("\n1. Training Multi-Class XGBoost Model...")
    xgb_model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=4,
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric="mlogloss"
    )
    xgb_model.fit(X_train_scaled, y_train, sample_weight=sample_weights_train)
    xgb_preds = xgb_model.predict(X_test_scaled)
    xgb_acc = accuracy_score(y_test, xgb_preds)
    xgb_f1 = f1_score(y_test, xgb_preds, average="macro")
    print(f"   ✅ XGBoost Accuracy: {xgb_acc * 100:.2f}%, Macro F1: {xgb_f1:.4f}")

    print("\n2. Training Balanced Random Forest Model...")
    rf_model = RandomForestClassifier(
        n_estimators=250,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train_scaled, y_train)
    rf_preds = rf_model.predict(X_test_scaled)
    rf_acc = accuracy_score(y_test, rf_preds)
    rf_f1 = f1_score(y_test, rf_preds, average="macro")
    print(f"   ✅ Random Forest Accuracy: {rf_acc * 100:.2f}%, Macro F1: {rf_f1:.4f}")

    # 3. Ensemble evaluation (Average of probabilities)
    print("\n3. Evaluating Multi-Model Ensemble...")
    xgb_proba = xgb_model.predict_proba(X_test_scaled)
    rf_proba = rf_model.predict_proba(X_test_scaled)
    ensemble_proba = (xgb_proba * 0.55 + rf_proba * 0.45)
    ensemble_preds = np.argmax(ensemble_proba, axis=1)
    ens_acc = accuracy_score(y_test, ensemble_preds)
    ens_f1 = f1_score(y_test, ensemble_preds, average="macro")
    print(f"   ✅ Ensemble Accuracy: {ens_acc * 100:.2f}%, Macro F1: {ens_f1:.4f}")

    y_test_labels = [INV_LABEL_MAP[i] for i in y_test]
    ens_pred_labels = [INV_LABEL_MAP[i] for i in ensemble_preds]

    report = classification_report(y_test_labels, ens_pred_labels, labels=LABELS, output_dict=True)
    c_matrix = confusion_matrix(y_test_labels, ens_pred_labels, labels=LABELS)

    print("\n📈 Classification Report (Ensemble):")
    for label in LABELS:
        metrics = report[label]
        print(f"   {label:<10} | Precision: {metrics['precision']:.3f} | Recall: {metrics['recall']:.3f} | F1: {metrics['f1-score']:.3f} | Support: {int(metrics['support'])}")

    print("\n🔢 Confusion Matrix (Rows=True, Cols=Predicted):")
    print(f"{'':>10} " + " ".join([f"{l:>10}" for l in LABELS]))
    for idx, row in enumerate(c_matrix):
        print(f"{LABELS[idx]:>10} " + " ".join([f"{val:>10}" for val in row]))

    # Feature Importance
    feature_importances = {}
    for name, val in zip(FEATURES, xgb_model.feature_importances_):
        feature_importances[name] = float(val)

    metadata = {
        "version": "2.0-calibrated-4tier",
        "labels": LABELS,
        "feature_names": FEATURES,
        "feature_count": len(FEATURES),
        "thresholds": {
            "low_max": 0.28,
            "medium_max": 0.58,
            "high_max": 0.80
        },
        "models": {
            "xgboost": {"accuracy": float(xgb_acc), "macro_f1": float(xgb_f1)},
            "random_forest": {"accuracy": float(rf_acc), "macro_f1": float(rf_f1)},
            "ensemble": {"accuracy": float(ens_acc), "macro_f1": float(ens_f1)}
        },
        "feature_importances": feature_importances,
        "classification_report": report,
        "confusion_matrix": c_matrix.tolist()
    }

    # Save to model directories
    for target_dir in [OUT_MODELS, OUT_RISK_V2]:
        target_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(xgb_model, target_dir / "xgboost_model.joblib")
        joblib.dump(rf_model, target_dir / "random_forest_model.joblib")
        joblib.dump(scaler, target_dir / "main_scaler.joblib")
        joblib.dump(metadata, target_dir / "model_metadata.joblib")
        with open(target_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    print(f"\n💾 Calibrated models and scalers saved successfully to:\n   - {OUT_MODELS}\n   - {OUT_RISK_V2}")
    print("=" * 70)
    return metadata


if __name__ == "__main__":
    train_and_calibrate()
