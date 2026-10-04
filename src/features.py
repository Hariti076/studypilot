"""features.py - shared preprocessing + inference helpers for StudyPilot.

Usage in the app:
    import features
    result = features.predict_student(one_row_dataframe, "models")
"""
import os, json
import pandas as pd

LEVEL_MAP    = {"Low": 0, "Medium": 1, "High": 2}
# raw numeric columns that get outlier-capping (bounds learned on training data)
CAP_COLS     = ["Hours_Studied", "Attendance", "Sleep_Hours", "Previous_Scores",
                "Tutoring_Sessions", "Physical_Activity"]
# habit columns used for learner personas (past scores deliberately excluded)
CLUSTER_COLS = ["Hours_Studied", "Attendance", "Sleep_Hours", "Motivation_Num",
                "Tutoring_Sessions", "Physical_Activity"]


def compute_caps(df, k=3.0):
    """Extreme-outlier bounds (Q1 - k*IQR, Q3 + k*IQR) from training data."""
    caps = {}
    for c in CAP_COLS:
        q1, q3 = df[c].quantile(0.25), df[c].quantile(0.75)
        iqr = q3 - q1
        caps[c] = (float(q1 - k * iqr), float(q3 + k * iqr))
    return caps


def apply_caps(df, caps):
    df = df.copy()
    for c, (lo, hi) in caps.items():
        if c in df.columns:
            df[c] = df[c].clip(lo, hi)
    return df


def add_features(df):
    """Create engineered features from raw student columns."""
    df = df.copy()
    df["Engagement_Index"] = df["Attendance"] * df["Hours_Studied"] / 100
    df["Sleep_Deficit"]    = (df["Sleep_Hours"] < 6).astype(int)
    df["Prior_x_Effort"]   = df["Previous_Scores"] * df["Hours_Studied"] / 100
    df["Motivation_Num"]   = df["Motivation_Level"].map(LEVEL_MAP).fillna(1)
    return df


def prepare(df, caps):
    """Full feature preparation: cap outliers, then engineer features."""
    return add_features(apply_caps(df, caps))


def predict_student(raw_df, models_dir="models"):
    """raw_df: DataFrame holding the columns listed in metadata['raw_input_columns'].
    Returns a list of dicts: predicted score + range, risk level + probabilities, persona."""
    import joblib
    meta = json.load(open(os.path.join(models_dir, "metadata.json")))
    reg  = joblib.load(os.path.join(models_dir, "score_regressor.joblib"))
    clf  = joblib.load(os.path.join(models_dir, "risk_classifier.joblib"))
    clu  = joblib.load(os.path.join(models_dir, "persona_clusterer.joblib"))

    P = prepare(raw_df, {k: tuple(v) for k, v in meta["caps"].items()})
    X = P[meta["feature_columns"]]
    scores   = reg.predict(X)
    risks    = clf.predict(X)
    probas   = clf.predict_proba(X)
    clusters = clu.predict(P[CLUSTER_COLS])

    out = []
    for i in range(len(P)):
        persona = meta["persona_map"][str(int(clusters[i]))]
        s = float(scores[i])
        out.append({
            "predicted_score": round(s, 1),
            "score_range": [round(s - meta["typical_error_90"], 1),
                            round(s + meta["typical_error_90"], 1)],
            "risk_level": str(risks[i]),
            "risk_probabilities": {c: round(float(p), 3)
                                   for c, p in zip(clf.classes_, probas[i])},
            "persona": persona,
            "persona_tip": meta["persona_tips"].get(persona, ""),
        })
    return out
