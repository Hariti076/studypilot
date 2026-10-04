"""Load the trained pipelines once and score student rows.

Feature preparation is the artifacts' own ``features.py`` (caps, then
Engagement_Index, Sleep_Deficit, Prior_x_Effort, Motivation_Num). Nothing
here refits or edits the estimators.
"""
from __future__ import annotations

import importlib.util
import json
import warnings
from functools import lru_cache

import joblib
import pandas as pd

from api.config import FEATURES_PATH, MODELS_DIR
from api.ml.compat import install_unpickle_compat, patch_loaded_estimator

# Habit columns the K-Means persona model was fit on. Previous scores are excluded.
CLUSTER_COLS = [
    "Hours_Studied",
    "Attendance",
    "Sleep_Hours",
    "Motivation_Num",
    "Tutoring_Sessions",
    "Physical_Activity",
]


def _load_features_module():
    if not FEATURES_PATH.is_file():
        raise FileNotFoundError(f"Preprocessing module not found: {FEATURES_PATH}")
    spec = importlib.util.spec_from_file_location("study_planner_features", FEATURES_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not import {FEATURES_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_pipeline(path):
    install_unpickle_compat()
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning)
        warnings.filterwarnings("ignore", message="Trying to unpickle")
        estimator = joblib.load(path)
    patch_loaded_estimator(estimator)
    return estimator


class ModelService:
    """Score, risk, and persona inference over raw student rows."""

    def __init__(self) -> None:
        if not MODELS_DIR.is_dir():
            raise FileNotFoundError(f"Models directory not found: {MODELS_DIR}")
        meta_path = MODELS_DIR / "metadata.json"
        self.meta = json.loads(meta_path.read_text(encoding="utf-8"))
        self.features = _load_features_module()
        self.regressor = _load_pipeline(MODELS_DIR / "score_regressor.joblib")
        self.classifier = _load_pipeline(MODELS_DIR / "risk_classifier.joblib")
        self.clusterer = _load_pipeline(MODELS_DIR / "persona_clusterer.joblib")
        self.caps = {key: tuple(bounds) for key, bounds in self.meta["caps"].items()}
        self.raw_columns = list(self.meta["raw_input_columns"])
        self.feature_columns = list(self.meta["feature_columns"])
        self.error_margin = float(self.meta["typical_error_90"])

    def predict(self, rows: list[dict]) -> list[dict]:
        """Score each raw row. ``rows`` must contain ``raw_input_columns``."""
        if not rows:
            return []
        frame = pd.DataFrame(rows)
        missing = [col for col in self.raw_columns if col not in frame.columns]
        if missing:
            raise ValueError(f"Missing model inputs: {', '.join(missing)}")

        prepared = self.features.prepare(frame[self.raw_columns], self.caps)
        matrix = prepared[self.feature_columns]
        scores = self.regressor.predict(matrix)
        risks = self.classifier.predict(matrix)
        probabilities = self.classifier.predict_proba(matrix)
        clusters = self.clusterer.predict(prepared[CLUSTER_COLS])
        classes = list(self.classifier.named_steps["model"].classes_)

        results = []
        for index in range(len(prepared)):
            persona = self.meta["persona_map"][str(int(clusters[index]))]
            score = float(scores[index])
            results.append(
                {
                    "predicted_score": score,
                    "score_range": [
                        round(score - self.error_margin, 1),
                        round(score + self.error_margin, 1),
                    ],
                    "risk_level": str(risks[index]),
                    "risk_probabilities": {
                        label: round(float(prob), 3)
                        for label, prob in zip(classes, probabilities[index])
                    },
                    "persona": persona,
                    "persona_tip": self.meta["persona_tips"].get(persona, ""),
                }
            )
        return results

    def explain(self, row: dict) -> dict:
        """Rank the linear model's own feature contributions for one student row.

        Coefficients come from the saved Linear Regression and Logistic Regression
        pipelines. Nothing is refit.
        """
        frame = pd.DataFrame([row])
        prepared = self.features.prepare(frame[self.raw_columns], self.caps)
        matrix = prepared[self.feature_columns]
        names = list(self.regressor.named_steps["prep"].get_feature_names_out())

        score_values = _dense(self.regressor.named_steps["prep"].transform(matrix))[0]
        score_coef = self.regressor.named_steps["model"].coef_.ravel()
        score_factors = _top_factors(names, score_values, score_coef, limit=4)

        risk_model = self.classifier.named_steps["model"]
        classes = list(risk_model.classes_)
        predicted = str(self.classifier.predict(matrix)[0])
        class_index = classes.index(predicted)
        risk_values = _dense(self.classifier.named_steps["prep"].transform(matrix))[0]
        risk_factors = _top_factors(names, risk_values, risk_model.coef_[class_index], limit=3, toward=predicted)

        downward = [factor["label"] for factor in score_factors if factor["direction"] == "down"][:2]
        if len(downward) == 0:
            summary = "No single habit is pulling the predicted score down."
        elif len(downward) == 1:
            summary = f"{downward[0]} is the strongest downward pull on the predicted score."
        else:
            summary = f"{downward[0]} and {downward[1]} are the strongest downward pulls on the predicted score."

        return {
            "summary": summary,
            "scoreFactors": score_factors,
            "riskFactors": risk_factors,
            "riskLevel": predicted,
        }


def _dense(matrix):
    if hasattr(matrix, "toarray"):
        return matrix.toarray()
    return matrix


def _friendly(raw_name: str) -> str:
    name = raw_name.split("__", 1)[-1]
    groups = (
        "Parental_Involvement",
        "Access_to_Resources",
        "Extracurricular_Activities",
        "Motivation_Level",
        "Internet_Access",
        "Teacher_Quality",
        "Peer_Influence",
    )
    for prefix in groups:
        token = prefix + "_"
        if name.startswith(token):
            value = name[len(token) :].replace("_", " ")
            if prefix == "Internet_Access":
                return "Internet access" if value == "Yes" else "No internet access"
            if prefix == "Extracurricular_Activities":
                return "Extracurricular activities" if value == "Yes" else "No extracurricular activities"
            return f"{value} {prefix.replace('_', ' ').lower()}"
    labels = {
        "Hours_Studied": "Study hours",
        "Attendance": "Attendance",
        "Sleep_Hours": "Sleep",
        "Previous_Scores": "Previous scores",
        "Tutoring_Sessions": "Tutoring sessions",
        "Physical_Activity": "Physical activity",
        "Engagement_Index": "Engagement (attendance and hours together)",
        "Sleep_Deficit": "Sleep under 6 hours",
        "Prior_x_Effort": "Past scores combined with study hours",
        "Motivation_Num": "Motivation",
    }
    return labels.get(name, name.replace("_", " "))


def _top_factors(names, values, coefficients, limit: int, toward: str | None = None) -> list[dict]:
    ranked = []
    for name, value, coefficient in zip(names, values, coefficients):
        if abs(float(value)) < 1e-8:
            continue
        contribution = float(value) * float(coefficient)
        if abs(contribution) < 1e-4:
            continue
        ranked.append((abs(contribution), contribution, _friendly(name)))
    ranked.sort(key=lambda item: item[0], reverse=True)

    factors = []
    seen = set()
    for _magnitude, contribution, label in ranked:
        if label in seen:
            continue
        seen.add(label)
        if toward:
            text = f"{label} pushes the risk label toward {toward}."
            direction = "toward"
        elif contribution < 0:
            text = f"{label} pulls the predicted score down."
            direction = "down"
        else:
            text = f"{label} lifts the predicted score."
            direction = "up"
        factors.append({"label": label, "direction": direction, "text": text})
        if len(factors) >= limit:
            break
    return factors


@lru_cache(maxsize=1)
def get_model_service() -> ModelService:
    return ModelService()
