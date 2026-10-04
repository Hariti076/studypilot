"""Score the shipped models on the stratified hold-out split.

    python -m src.evaluate --data data/StudentPerformanceFactors.csv

Prints MAE, RMSE, R2, classification metrics, and silhouette, then compares
them with models/metadata.json. Exits with status 1 when any compared metric
differs by more than 0.02. Does not modify models/.
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score

from api.ml.compat import install_unpickle_compat, patch_loaded_estimator
from src.features import CLUSTER_COLS
from src.train import (
    FEATURES,
    classification_report,
    load_dataset,
    prepare_frames,
    regression_report,
    risk_labels,
    split_dataset,
    target_band,
)

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

TOLERANCE = 0.02


def _load(path: Path):
    install_unpickle_compat()
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")
        estimator = joblib.load(path)
    patch_loaded_estimator(estimator)
    return estimator


def score_saved_models(data: Path, models: Path) -> dict:
    frame = load_dataset(data)
    train, test = split_dataset(frame)
    _caps, train_p, test_p = prepare_frames(train, test)
    band = target_band(train["Exam_Score"])
    regressor = _load(models / "score_regressor.joblib")
    classifier = _load(models / "risk_classifier.joblib")
    clusterer = _load(models / "persona_clusterer.joblib")
    predicted = regressor.predict(test_p[FEATURES])
    regression = regression_report(test_p["Exam_Score"], predicted, band)
    risk_true = risk_labels(test_p["Exam_Score"])
    risk_pred = classifier.predict(test_p[FEATURES])
    proba = classifier.predict_proba(test_p[FEATURES])
    classes = list(classifier.named_steps["model"].classes_)
    classification = classification_report(risk_true, risk_pred, proba, classes)
    # The shipped clusterer was fit on every cleaned row, so silhouette uses that matrix.
    full = pd.concat([train_p, test_p], axis=0)
    labels = clusterer.predict(full[CLUSTER_COLS])
    transformed = clusterer.named_steps["scaler"].transform(clusterer.named_steps["imp"].transform(full[CLUSTER_COLS]))
    silhouette = float(silhouette_score(transformed, labels)) if len(set(labels)) > 1 else float("nan")
    return {
        "regression_all_rows": {"MAE": regression["MAE"], "RMSE": regression["RMSE"], "R2": regression["R2"]},
        "regression_typical_rows": {"RMSE": regression["Typ_RMSE"], "R2": regression["Typ_R2"]},
        "classification": {
            "Accuracy": classification["Accuracy"],
            "Precision": classification["Precision"],
            "Recall": classification["Recall"],
            "F1_macro": classification["F1_macro"],
            "ROC_AUC": classification["ROC_AUC"],
            "High_Risk_Recall": classification["High_Risk_Recall"],
        },
        "score_range_coverage": {"all_rows": regression["coverage_all"], "typical_rows": regression["coverage_typical"]},
        "clustering_silhouette": silhouette,
        "n_outliers": regression["n_outliers"],
    }


def compare(actual: dict, expected: dict, tolerance: float = TOLERANCE) -> list[str]:
    """Return lines describing metrics that differ by more than ``tolerance``."""
    pairs = {
        "regression_all_rows.MAE": (actual["regression_all_rows"]["MAE"], expected["regression_all_rows"]["MAE"]),
        "regression_all_rows.RMSE": (actual["regression_all_rows"]["RMSE"], expected["regression_all_rows"]["RMSE"]),
        "regression_all_rows.R2": (actual["regression_all_rows"]["R2"], expected["regression_all_rows"]["R2"]),
        "regression_typical_rows.RMSE": (actual["regression_typical_rows"]["RMSE"], expected["regression_typical_rows"]["RMSE"]),
        "regression_typical_rows.R2": (actual["regression_typical_rows"]["R2"], expected["regression_typical_rows"]["R2"]),
        "classification.Accuracy": (actual["classification"]["Accuracy"], expected["classification"]["Accuracy"]),
        "classification.F1_macro": (actual["classification"]["F1_macro"], expected["classification"]["F1_macro"]),
        "classification.ROC_AUC": (actual["classification"]["ROC_AUC"], expected["classification"]["ROC_AUC"]),
        "classification.High_Risk_Recall": (actual["classification"]["High_Risk_Recall"], expected["classification"]["High_Risk_Recall"]),
        "clustering_silhouette": (actual["clustering_silhouette"], expected["clustering_silhouette"]),
    }
    gaps = []
    for name, (got, want) in pairs.items():
        if want is None or (isinstance(got, float) and np.isnan(got)):
            gaps.append(f"{name}: could not recompute (metadata {want})")
            continue
        delta = abs(float(got) - float(want))
        if delta > tolerance:
            gaps.append(f"{name}: recomputed {float(got):.6f}, metadata {float(want):.6f}, difference {delta:.6f}")
    return gaps


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate the shipped StudyPilot models.")
    parser.add_argument("--data", required=True)
    parser.add_argument("--models", default="models")
    args = parser.parse_args(argv)
    models = Path(args.models)
    actual = score_saved_models(Path(args.data), models)
    expected = json.loads((models / "metadata.json").read_text(encoding="utf-8"))["test_metrics"]
    print("Recomputed")
    print(json.dumps(actual, indent=2))
    gaps = compare(actual, expected)
    if gaps:
        print("Differences greater than 0.02:")
        for line in gaps:
            print(" ", line)
        return 1
    print("All compared metrics are within 0.02 of models/metadata.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
