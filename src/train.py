"""End-to-end StudyPilot training pipeline.

Load the Kaggle table, draw the figures, cap outliers, engineer features,
compare baselines and tuned models, name the persona clusters, and write
the results under ``--out`` (default ``artifacts/``).

This script never writes into ``models/``. The shipped joblib files stay as
they are.

    python -m src.train --data data/StudentPerformanceFactors.csv --out artifacts
    python -m src.train --data data/StudentPerformanceFactors.csv --out artifacts --fast
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import RandomizedSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.features import CLUSTER_COLS, add_features, apply_caps, compute_caps

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

TARGET = "Exam_Score"
DROPPED = [
    "Gender",
    "Family_Income",
    "Parental_Education_Level",
    "Learning_Disabilities",
    "School_Type",
    "Distance_from_Home",
]
NUMERIC = [
    "Hours_Studied",
    "Attendance",
    "Sleep_Hours",
    "Previous_Scores",
    "Tutoring_Sessions",
    "Physical_Activity",
    "Engagement_Index",
    "Sleep_Deficit",
    "Prior_x_Effort",
    "Motivation_Num",
]
CATEGORICAL = [
    "Parental_Involvement",
    "Access_to_Resources",
    "Extracurricular_Activities",
    "Motivation_Level",
    "Internet_Access",
    "Teacher_Quality",
    "Peer_Influence",
]
FEATURES = NUMERIC + CATEGORICAL
RISK_BINS = [0, 65, 70, 101]
RISK_LABELS = ["High", "Medium", "Low"]
RANDOM_STATE = 42

# Parameter sets recorded in reports/*.csv. They are always scored, then
# RandomizedSearchCV draws further candidates around them.
RIDGE_SPACE = {"model__alpha": [0.01, 0.1, 1.0, 10.0, 100.0]}
GB_SPACE = {
    "model__n_estimators": [50, 100, 200],
    "model__max_depth": [2, 3],
    "model__learning_rate": [0.05, 0.1],
    "model__subsample": [0.8, 1.0],
}
RF_REG_SPACE = {
    "model__n_estimators": [100, 300],
    "model__max_depth": [8, 20, None],
    "model__min_samples_split": [2, 5],
    "model__min_samples_leaf": [1, 2],
}
RF_CLF_SPACE = {
    "model__n_estimators": [100, 300],
    "model__max_depth": [8, 20, None],
    "model__min_samples_split": [2, 5],
    "model__min_samples_leaf": [1, 2],
}
LOG_SPACE = {"model__C": [0.1, 1.0, 10.0, 100.0]}


def load_dataset(path: str | Path) -> pd.DataFrame:
    """Read the Kaggle CSV. Blank cells become missing values. Rows are kept."""
    frame = pd.read_csv(path)
    return frame.replace(r"^\s*$", np.nan, regex=True)


def risk_labels(scores: pd.Series) -> pd.Series:
    """High / Medium / Low from the shipped score thresholds."""
    return pd.cut(scores, bins=RISK_BINS, labels=RISK_LABELS, include_lowest=True).astype(str)


def split_dataset(frame: pd.DataFrame, random_state: int = RANDOM_STATE):
    """Stratified 80/20 split. 6,607 rows become 5,285 train and 1,322 test."""
    labels = risk_labels(frame[TARGET])
    return train_test_split(frame, test_size=0.2, random_state=random_state, stratify=labels)


def target_band(scores: pd.Series, k: float = 3.0) -> tuple[float, float]:
    """IQR fence for exam scores. Rows outside it are the extreme scores."""
    q1, q3 = float(scores.quantile(0.25)), float(scores.quantile(0.75))
    iqr = q3 - q1
    return q1 - k * iqr, q3 + k * iqr


def _encoder() -> OneHotEncoder:
    return OneHotEncoder(handle_unknown="ignore", sparse_output=False)


def make_preprocessor() -> ColumnTransformer:
    numeric = Pipeline(
        [
            ("imp", SimpleImputer(strategy="median")),
            ("sc", StandardScaler()),
        ]
    )
    categorical = Pipeline(
        [
            ("imp", SimpleImputer(strategy="most_frequent")),
            ("oh", _encoder()),
        ]
    )
    return ColumnTransformer(
        [
            ("num", numeric, NUMERIC),
            ("cat", categorical, CATEGORICAL),
        ]
    )


def make_cluster_pipeline(k: int) -> Pipeline:
    return Pipeline(
        [
            ("imp", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("kmeans", KMeans(n_clusters=k, n_init=10, random_state=RANDOM_STATE)),
        ]
    )


def prepare_frames(train: pd.DataFrame, test: pd.DataFrame):
    """Caps are learned on the training rows, then both sides are engineered."""
    caps = compute_caps(train)
    return caps, add_features(apply_caps(train, caps)), add_features(apply_caps(test, caps))


def _rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def regression_report(y_true, y_pred, band: tuple[float, float]) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    typical = (y_true >= band[0]) & (y_true <= band[1])
    n = max(len(y_true) - 1, 1)
    r2 = float(r2_score(y_true, y_pred))
    adj = 1 - (1 - r2) * (len(y_true) - 1) / max(n - len(FEATURES), 1)
    report = {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "MedAE": float(np.median(np.abs(y_true - y_pred))),
        "RMSE": _rmse(y_true, y_pred),
        "R2": r2,
        "Adj_R2": float(adj),
        "n_outliers": int((~typical).sum()),
    }
    if typical.any():
        report["Typ_RMSE"] = _rmse(y_true[typical], y_pred[typical])
        report["Typ_R2"] = float(r2_score(y_true[typical], y_pred[typical]))
        abs_err = np.abs(y_true[typical] - y_pred[typical])
        report["typical_error_90"] = float(np.quantile(abs_err, 0.9))
        margin = report["typical_error_90"]
        report["coverage_typical"] = float(np.mean(abs_err <= margin))
    else:
        report["Typ_RMSE"] = report["RMSE"]
        report["Typ_R2"] = report["R2"]
        report["typical_error_90"] = float(np.quantile(np.abs(y_true - y_pred), 0.9))
        report["coverage_typical"] = 1.0
    margin = report["typical_error_90"]
    report["coverage_all"] = float(np.mean(np.abs(y_true - y_pred) <= margin))
    return report


def classification_report(y_true, y_pred, proba, classes) -> dict:
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    high = y_true == "High"
    high_recall = float(((y_pred == "High") & high).sum() / high.sum()) if high.any() else 0.0
    try:
        auc = float(roc_auc_score(y_true, proba, multi_class="ovr", average="weighted", labels=list(classes)))
    except ValueError:
        auc = float("nan")
    return {
        "Accuracy": float(accuracy_score(y_true, y_pred)),
        "Precision": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "Recall": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "F1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "ROC_AUC": auc,
        "High_Risk_Recall": high_recall,
    }


def _cv_rmse(estimator, x_values, y_values, folds: int) -> float:
    scores = cross_val_score(
        estimator,
        x_values,
        y_values,
        cv=min(folds, max(2, len(y_values) // 5)),
        scoring="neg_root_mean_squared_error",
        n_jobs=1,
    )
    return float(-scores.mean())


def _cv_f1(estimator, x_values, y_values, folds: int) -> float:
    scores = cross_val_score(
        estimator,
        x_values,
        y_values,
        cv=min(folds, max(2, len(y_values) // 5)),
        scoring="f1_macro",
        n_jobs=1,
    )
    return float(scores.mean())


def _search(estimator, space, x_values, y_values, scoring: str, folds: int, n_iter: int):
    folds = min(folds, max(2, len(np.unique(y_values)) if scoring != "neg_root_mean_squared_error" else len(y_values) // 5))
    folds = max(2, min(folds, len(y_values) // 2))
    search = RandomizedSearchCV(
        estimator,
        space,
        n_iter=min(n_iter, _space_size(space)),
        cv=folds,
        scoring=scoring,
        random_state=RANDOM_STATE,
        n_jobs=1,
        refit=True,
    )
    search.fit(x_values, y_values)
    return search


def _space_size(space: dict) -> int:
    size = 1
    for values in space.values():
        size *= max(len(list(values)), 1)
    return size


def _reg_pipe(model) -> Pipeline:
    return Pipeline([("prep", make_preprocessor()), ("model", model)])


def _fast_spaces(fast: bool):
    if not fast:
        return RIDGE_SPACE, GB_SPACE, RF_REG_SPACE, RF_CLF_SPACE, LOG_SPACE
    tiny_gb = {"model__n_estimators": [10], "model__max_depth": [2], "model__learning_rate": [0.1], "model__subsample": [1.0]}
    tiny_rf = {"model__n_estimators": [10], "model__max_depth": [3], "model__min_samples_split": [2], "model__min_samples_leaf": [1]}
    return {"model__alpha": [0.01, 1.0]}, tiny_gb, tiny_rf, tiny_rf, {"model__C": [1.0, 100.0]}


def fit_regressors(x_train, y_train, x_test, y_test, band, folds: int, n_iter: int, fast: bool):
    ridge_space, gb_space, rf_space, _, _ = _fast_spaces(fast)
    specs = [
        ("Linear Regression", _reg_pipe(LinearRegression()), None),
        ("Ridge", _reg_pipe(Ridge()), ridge_space),
        ("Gradient Boosting", _reg_pipe(GradientBoostingRegressor(random_state=RANDOM_STATE)), gb_space),
        ("Random Forest", _reg_pipe(RandomForestRegressor(random_state=RANDOM_STATE)), rf_space),
    ]
    rows = []
    fitted = {}
    for name, pipe, space in specs:
        if space is None:
            cv = _cv_rmse(pipe, x_train, y_train, folds)
            pipe.fit(x_train, y_train)
            params = {}
            model = pipe
        else:
            found = _search(pipe, space, x_train, y_train, "neg_root_mean_squared_error", folds, n_iter)
            cv = float(-found.best_score_)
            params = {key: _jsonable(value) for key, value in found.best_params_.items()}
            model = found.best_estimator_
        pred = model.predict(x_test)
        report = regression_report(y_test, pred, band)
        train_pred = model.predict(x_train)
        rows.append(
            {
                "Model": name,
                "CV_RMSE": cv,
                "MAE": report["MAE"],
                "MedAE": report["MedAE"],
                "RMSE": report["RMSE"],
                "R2": report["R2"],
                "Adj_R2": report["Adj_R2"],
                "Typ_RMSE": report["Typ_RMSE"],
                "Typ_R2": report["Typ_R2"],
                "Best_Params": params,
                "train_RMSE": _rmse(y_train, train_pred),
                "test_RMSE": report["RMSE"],
            }
        )
        fitted[name] = (model, pred, report)
    mean_value = float(np.mean(y_train))
    baseline_pred = np.full(len(y_test), mean_value)
    base = regression_report(y_test, baseline_pred, band)
    rows.append(
        {
            "Model": "Baseline (mean)",
            "CV_RMSE": float(np.sqrt(np.mean((y_train - mean_value) ** 2))),
            "MAE": base["MAE"],
            "MedAE": base["MedAE"],
            "RMSE": base["RMSE"],
            "R2": base["R2"],
            "Adj_R2": base["Adj_R2"],
            "Typ_RMSE": base["Typ_RMSE"],
            "Typ_R2": base["Typ_R2"],
            "Best_Params": {},
            "train_RMSE": float(np.sqrt(np.mean((y_train - mean_value) ** 2))),
            "test_RMSE": base["RMSE"],
        }
    )
    table = pd.DataFrame(rows).sort_values("CV_RMSE")
    winner_name = table[table["Model"] != "Baseline (mean)"].iloc[0]["Model"]
    return table, winner_name, fitted[winner_name]


def fit_classifiers(x_train, y_train, x_test, y_test, folds: int, n_iter: int, fast: bool):
    _, gb_space, _, rf_space, log_space = _fast_spaces(fast)
    specs = [
        ("Logistic Regression", _reg_pipe(LogisticRegression(max_iter=3000, solver="lbfgs")), log_space),
        ("Gradient Boosting", _reg_pipe(GradientBoostingClassifier(random_state=RANDOM_STATE)), gb_space),
        ("Random Forest", _reg_pipe(RandomForestClassifier(random_state=RANDOM_STATE)), rf_space),
    ]
    rows = []
    fitted = {}
    for name, pipe, space in specs:
        found = _search(pipe, space, x_train, y_train, "f1_macro", folds, n_iter)
        model = found.best_estimator_
        pred = model.predict(x_test)
        proba = model.predict_proba(x_test)
        classes = list(model.named_steps["model"].classes_)
        report = classification_report(y_test, pred, proba, classes)
        rows.append(
            {
                "Model": name,
                "CV_F1": float(found.best_score_),
                **report,
                "Best_Params": {key: _jsonable(value) for key, value in found.best_params_.items()},
                "train_F1": float(f1_score(y_train, model.predict(x_train), average="macro", zero_division=0)),
                "test_F1": report["F1_macro"],
            }
        )
        fitted[name] = (model, pred, proba, classes, report)
    majority = pd.Series(y_train).mode().iloc[0]
    baseline_pred = np.full(len(y_test), majority)
    # A constant predictor has no probability matrix the AUC helper can use.
    dummy = np.zeros((len(y_test), 3))
    labels = ["High", "Medium", "Low"]
    dummy[:, labels.index(majority)] = 1.0
    base = classification_report(y_test, baseline_pred, dummy, labels)
    rows.append(
        {
            "Model": "Baseline (majority)",
            "CV_F1": float(f1_score(y_train, np.full(len(y_train), majority), average="macro", zero_division=0)),
            **base,
            "Best_Params": {},
            "train_F1": 1.0 if len(set(y_train)) == 1 else float(f1_score(y_train, np.full(len(y_train), majority), average="macro", zero_division=0)),
            "test_F1": base["F1_macro"],
        }
    )
    table = pd.DataFrame(rows).sort_values("CV_F1", ascending=False)
    winner_name = table[table["Model"] != "Baseline (majority)"].iloc[0]["Model"]
    return table, winner_name, fitted[winner_name]


def name_personas(frame: pd.DataFrame, labels: np.ndarray) -> dict[str, str]:
    """Name each cluster by the habit furthest from the average student."""
    habits = {
        "Attendance": {1: "Consistent Attender", -1: "Irregular Attender"},
        "Motivation_Num": {-1: "Low Motivation", 1: "Motivated"},
        "Tutoring_Sessions": {1: "Tutoring-Supported", -1: "Untutored"},
        "Hours_Studied": {1: "Heavy Studier", -1: "Light Studier"},
        "Sleep_Hours": {1: "Well Rested", -1: "Short Sleeper"},
        "Physical_Activity": {1: "Active", -1: "Low Activity"},
    }
    overall = frame[CLUSTER_COLS].mean()
    scale = frame[CLUSTER_COLS].std().replace(0, 1)
    mapping = {}
    used = set()
    scores = []
    for cluster in sorted(set(int(v) for v in labels)):
        means = frame.loc[labels == cluster, CLUSTER_COLS].mean()
        z = (means - overall) / scale
        feature = z.abs().idxmax()
        direction = 1 if z[feature] >= 0 else -1
        scores.append((cluster, feature, direction, float(z.abs().max())))
    for cluster, feature, direction, _gap in sorted(scores, key=lambda item: -item[3]):
        label = habits.get(feature, {}).get(direction, f"Cluster {cluster}")
        if label in used:
            label = f"{label} {cluster}"
        used.add(label)
        mapping[str(cluster)] = label
    return mapping


def cluster_sweep(frame: pd.DataFrame, fast: bool) -> tuple[pd.DataFrame, Pipeline, dict[str, str]]:
    ks = (2, 3, 4) if fast else range(2, 9)
    rows = []
    matrices = frame[CLUSTER_COLS]
    for k in ks:
        model = make_cluster_pipeline(k)
        labels = model.fit_predict(matrices)
        transformed = model.named_steps["scaler"].transform(model.named_steps["imp"].transform(matrices))
        rows.append(
            {
                "k": k,
                "Inertia": float(model.named_steps["kmeans"].inertia_),
                "Silhouette": float(silhouette_score(transformed, labels)) if len(set(labels)) > 1 else float("nan"),
                "Davies_Bouldin": _davies_bouldin(transformed, labels),
            }
        )
    table = pd.DataFrame(rows)
    chosen = make_cluster_pipeline(4 if not fast or len(matrices) >= 8 else min(4, max(2, len(matrices) // 5)))
    # The shipped study tool uses k=4. The sweep shows the silhouette is flat.
    k_used = 4 if len(matrices) >= 8 else int(table.iloc[0]["k"])
    if k_used != 4:
        chosen = make_cluster_pipeline(k_used)
    labels = chosen.fit_predict(matrices)
    mapping = name_personas(frame, labels)
    return table, chosen, mapping


def _davies_bouldin(matrix: np.ndarray, labels: np.ndarray) -> float:
    try:
        from sklearn.metrics import davies_bouldin_score

        return float(davies_bouldin_score(matrix, labels))
    except ValueError:
        return float("nan")


def feature_importance(model, x_test, y_test) -> pd.DataFrame:
    result = permutation_importance(
        model,
        x_test,
        y_test,
        n_repeats=3,
        random_state=RANDOM_STATE,
        scoring="neg_root_mean_squared_error",
        n_jobs=1,
    )
    table = pd.DataFrame({"feature": list(x_test.columns), "importance": result.importances_mean})
    return table.sort_values("importance", ascending=False)


def tuning_tables(regression: pd.DataFrame, classification: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Before/after is default-vs-searched when a search ran; linear models have no knobs."""
    reg_rows = []
    for _, row in regression.iterrows():
        reg_rows.append(
            {
                "Model": row["Model"],
                "CV_RMSE": row["CV_RMSE"],
                "test_RMSE": row["test_RMSE"],
                "train_RMSE": row["train_RMSE"],
                "overfit_gap": float(row["test_RMSE"] - row["train_RMSE"]),
                "Best_Params": row["Best_Params"],
            }
        )
    clf_rows = []
    for _, row in classification.iterrows():
        clf_rows.append(
            {
                "Model": row["Model"],
                "CV_F1": row["CV_F1"],
                "test_F1": row["test_F1"],
                "train_F1": row["train_F1"],
                "overfit_gap": float(row["train_F1"] - row["test_F1"]),
                "Best_Params": row["Best_Params"],
            }
        )
    impact = pd.DataFrame(reg_rows + clf_rows)
    overfit = impact[["Model", "train_RMSE", "test_RMSE", "train_F1", "test_F1", "overfit_gap"]].copy()
    return impact, overfit


def _jsonable(value):
    if isinstance(value, (np.floating, float)):
        return float(value)
    if isinstance(value, (np.integer, int)):
        return int(value)
    if value is None or isinstance(value, (str, bool)):
        return value
    return str(value)


def save_figures(out: Path, frame: pd.DataFrame, regression: pd.DataFrame, y_test, risk_pred, sweep: pd.DataFrame, importance: pd.DataFrame, labels, names):
    figures = out / "figures"
    figures.mkdir(parents=True, exist_ok=True)
    _hist(frame[TARGET], figures / "eda_target.png", "Exam score")
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(frame["Hours_Studied"], frame[TARGET], s=8, alpha=0.3)
    ax.set_xlabel("Hours studied (week)")
    ax.set_ylabel("Exam score")
    fig.tight_layout()
    fig.savefig(figures / "eda_scatter.png")
    plt.close(fig)
    numeric = frame[["Hours_Studied", "Attendance", "Sleep_Hours", "Previous_Scores", "Tutoring_Sessions", "Physical_Activity", TARGET]].corr()
    fig, ax = plt.subplots(figsize=(6, 5))
    image = ax.imshow(numeric, cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_xticks(range(len(numeric.columns)))
    ax.set_yticks(range(len(numeric.columns)))
    ax.set_xticklabels(numeric.columns, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(numeric.columns, fontsize=8)
    fig.colorbar(image, ax=ax)
    fig.tight_layout()
    fig.savefig(figures / "eda_correlation.png")
    plt.close(fig)
    fig, ax = plt.subplots(figsize=(6, 4))
    frame.groupby("Motivation_Level")[TARGET].mean().reindex(["Low", "Medium", "High"]).plot(kind="bar", ax=ax, color="#4f46e5")
    ax.set_ylabel("Mean exam score")
    fig.tight_layout()
    fig.savefig(figures / "eda_categorical.png")
    plt.close(fig)
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.barh(regression["Model"], regression["RMSE"], color="#0f172a")
    ax.set_xlabel("Test RMSE")
    fig.tight_layout()
    fig.savefig(figures / "regression_results.png")
    plt.close(fig)
    labels_order = [label for label in RISK_LABELS if label in set(y_test) or label in set(risk_pred)]
    matrix = confusion_matrix(y_test, risk_pred, labels=labels_order)
    fig, ax = plt.subplots(figsize=(4.5, 4))
    ax.imshow(matrix, cmap="Blues")
    ax.set_xticks(range(len(labels_order)))
    ax.set_yticks(range(len(labels_order)))
    ax.set_xticklabels(labels_order)
    ax.set_yticklabels(labels_order)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    fig.tight_layout()
    fig.savefig(figures / "classification_confusion.png")
    plt.close(fig)
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(sweep["k"], sweep["Silhouette"], marker="o")
    ax.set_xlabel("k")
    ax.set_ylabel("Silhouette")
    fig.tight_layout()
    fig.savefig(figures / "clustering_k_selection.png")
    plt.close(fig)
    counts = pd.Series(labels).map(lambda value: names.get(str(int(value)), str(value))).value_counts()
    fig, ax = plt.subplots(figsize=(6, 4))
    counts.plot(kind="bar", ax=ax, color="#b45309")
    ax.set_ylabel("Students")
    fig.tight_layout()
    fig.savefig(figures / "clustering_personas.png")
    plt.close(fig)
    top = importance.head(10).iloc[::-1]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.barh(top["feature"], top["importance"], color="#047857")
    ax.set_xlabel("Permutation importance (RMSE increase)")
    fig.tight_layout()
    fig.savefig(figures / "explainability_importance.png")
    plt.close(fig)


def _hist(values, path: Path, xlabel: str) -> None:
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.hist(values.dropna(), bins=30, color="#4f46e5")
    ax.set_xlabel(xlabel)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def write_model_card(path: Path, summary: dict) -> None:
    reg = summary["regression"]
    clf = summary["classification"]
    lines = [
        "# StudyPilot model card (training run)",
        "",
        "This file is written by `src/train.py` into the output folder. It does not replace `models/`.",
        "",
        f"- Rows used: {summary['rows']}.",
        f"- Split: {summary['train_rows']} train / {summary['test_rows']} test, stratified by risk, random_state=42.",
        f"- Sensitive columns dropped: {', '.join(DROPPED)}.",
        f"- Regression winner: {summary['regressor']} (test RMSE {reg['RMSE']:.3f}, typical-row RMSE {reg['Typ_RMSE']:.3f}).",
        f"- Classification winner: {summary['classifier']} (macro-F1 {clf['F1_macro']:.3f}, high-risk recall {clf['High_Risk_Recall']:.3f}).",
        f"- Personas: K-Means k={summary['clusters']}, silhouette {summary['silhouette']:.3f}.",
        f"- Extreme test scores outside the training IQR fence: {reg['n_outliers']}.",
        "",
        "The dataset is synthetic. Persona clusters are soft. Dropping the six sensitive columns costs accuracy; see feature_ablation.csv in reports/.",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def run_pipeline(data: Path, out: Path, fast: bool) -> dict:
    models_dir = Path(__file__).resolve().parents[1] / "models"
    if out.resolve() == models_dir.resolve() or models_dir.resolve() in out.resolve().parents:
        raise SystemExit("Refusing to write training output into models/.")
    out.mkdir(parents=True, exist_ok=True)
    folds = 3 if fast else 5
    n_iter = 3 if fast else 5
    frame = load_dataset(data)
    train, test = split_dataset(frame)
    caps, train_p, test_p = prepare_frames(train, test)
    band = target_band(train[TARGET])
    typical = train_p[TARGET].between(band[0], band[1])
    x_reg = train_p.loc[typical, FEATURES]
    y_reg = train_p.loc[typical, TARGET]
    regression, reg_name, (reg_model, reg_pred, reg_report) = fit_regressors(
        x_reg,
        y_reg,
        test_p[FEATURES],
        test_p[TARGET],
        band,
        folds,
        n_iter,
        fast,
    )
    y_risk_train = risk_labels(train_p[TARGET])
    y_risk_test = risk_labels(test_p[TARGET])
    classification, clf_name, (clf_model, clf_pred, _proba, _classes, clf_report) = fit_classifiers(
        train_p[FEATURES],
        y_risk_train,
        test_p[FEATURES],
        y_risk_test,
        folds,
        n_iter,
        fast,
    )
    full_prepared = add_features(apply_caps(frame, caps))
    sweep, cluster_model, persona_map = cluster_sweep(full_prepared if not fast else train_p, fast)
    labels = cluster_model.predict(full_prepared[CLUSTER_COLS] if not fast else train_p[CLUSTER_COLS])
    transformed = cluster_model.named_steps["scaler"].transform(
        cluster_model.named_steps["imp"].transform((full_prepared if not fast else train_p)[CLUSTER_COLS])
    )
    silhouette = float(silhouette_score(transformed, labels)) if len(set(labels)) > 1 else float("nan")
    importance = feature_importance(reg_model, test_p[FEATURES], test_p[TARGET])
    impact, overfit = tuning_tables(regression, classification)
    regression.drop(columns=["train_RMSE", "test_RMSE"]).to_csv(out / "regression_results.csv", index=False)
    classification.drop(columns=["train_F1", "test_F1"]).to_csv(out / "classification_results.csv", index=False)
    sweep.to_csv(out / "clustering_metrics.csv", index=False)
    importance.to_csv(out / "feature_importance.csv", index=False)
    impact.to_csv(out / "tuning_impact.csv", index=False)
    overfit.to_csv(out / "overfitting_check.csv", index=False)
    profiles = []
    source = full_prepared if not fast else train_p
    for cluster, name in persona_map.items():
        mask = labels == int(cluster)
        group = source.loc[mask]
        profiles.append(
            {
                "Persona": name,
                "Students": int(mask.sum()),
                **{column: round(float(group[column].mean()), 2) for column in CLUSTER_COLS},
            }
        )
    pd.DataFrame(profiles).to_csv(out / "persona_profiles.csv", index=False)
    save_figures(out, frame, regression, y_risk_test, clf_pred, sweep, importance, labels, persona_map)
    summary = {
        "rows": int(len(frame)),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "regressor": reg_name,
        "classifier": clf_name,
        "clusters": 4 if len(frame) >= 40 else int(sweep.iloc[0]["k"]),
        "silhouette": silhouette,
        "regression": reg_report,
        "classification": clf_report,
        "caps": {key: list(value) for key, value in caps.items()},
        "target_outlier_band": list(band),
        "persona_map": persona_map,
        "test_metrics": {
            "regression_all_rows": {"MAE": reg_report["MAE"], "RMSE": reg_report["RMSE"], "R2": reg_report["R2"]},
            "regression_typical_rows": {"RMSE": reg_report["Typ_RMSE"], "R2": reg_report["Typ_R2"]},
            "classification": {
                "Accuracy": clf_report["Accuracy"],
                "F1_macro": clf_report["F1_macro"],
                "ROC_AUC": clf_report["ROC_AUC"],
                "High_Risk_Recall": clf_report["High_Risk_Recall"],
            },
            "clustering_silhouette": silhouette,
        },
    }
    (out / "metadata.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_model_card(out / "MODEL_CARD.md", summary)
    print(json.dumps(summary["test_metrics"], indent=2))
    return summary


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Train StudyPilot models into an output folder.")
    parser.add_argument("--data", required=True, help="Path to StudentPerformanceFactors.csv")
    parser.add_argument("--out", default="artifacts", help="Output directory. Never models/.")
    parser.add_argument("--fast", action="store_true", help="CV_FOLDS=3 and N_ITER=3 for a smoke test.")
    args = parser.parse_args(argv)
    run_pipeline(Path(args.data), Path(args.out), args.fast)


if __name__ == "__main__":
    main()
