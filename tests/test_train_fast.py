"""Smoke-test the training script on a tiny synthetic table. No Kaggle file required."""
from pathlib import Path

import pandas as pd

from src.train import run_pipeline


def test_fast_training_writes_artifacts(tmp_path: Path):
    frame = _table()
    data = tmp_path / "students.csv"
    frame.to_csv(data, index=False)
    out = tmp_path / "artifacts"
    summary = run_pipeline(data, out, fast=True)
    assert (out / "metadata.json").is_file()
    assert (out / "tuning_impact.csv").is_file()
    assert (out / "overfitting_check.csv").is_file()
    assert (out / "MODEL_CARD.md").is_file()
    assert summary["train_rows"] + summary["test_rows"] == len(frame)
    models = Path(__file__).resolve().parents[1] / "models"
    assert out.resolve() != models.resolve()


def _table() -> pd.DataFrame:
    levels = ["Low", "Medium", "High"]
    rows = []
    scores = [60] * 30 + [67] * 40 + [78] * 20
    for index, score in enumerate(scores):
        rows.append(
            {
                "Hours_Studied": 10 + (index % 15),
                "Attendance": 70 + (index % 20),
                "Parental_Involvement": levels[index % 3],
                "Access_to_Resources": levels[(index + 1) % 3],
                "Extracurricular_Activities": "Yes" if index % 2 == 0 else "No",
                "Sleep_Hours": 6 + (index % 3),
                "Previous_Scores": 55 + (index % 30),
                "Motivation_Level": levels[index % 3],
                "Internet_Access": "Yes",
                "Tutoring_Sessions": index % 4,
                "Family_Income": levels[index % 3],
                "Teacher_Quality": levels[(index + 2) % 3],
                "School_Type": "Public" if index % 2 == 0 else "Private",
                "Peer_Influence": ["Negative", "Neutral", "Positive"][index % 3],
                "Physical_Activity": index % 5,
                "Learning_Disabilities": "No",
                "Parental_Education_Level": "College",
                "Distance_from_Home": "Near",
                "Gender": "Female" if index % 2 else "Male",
                "Exam_Score": score,
            }
        )
    return pd.DataFrame(rows)
