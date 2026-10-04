"""The three estimators are already trained and saved.

Running this file does not fit them again. Retraining would replace the
pipelines the API loads from models/.
"""
from pathlib import Path

MODELS = (
    "score_regressor.joblib",
    "risk_classifier.joblib",
    "persona_clusterer.joblib",
)


def main() -> None:
    models_dir = Path(__file__).resolve().parents[1] / "models"
    print("StudyPilot models are already saved. Nothing was retrained.")
    for name in MODELS:
        path = models_dir / name
        state = "present" if path.exists() else "missing"
        print(f"  {state}: models/{name}")
    print("Metrics: models/metadata.json and reports/MODEL_CARD.md")


if __name__ == "__main__":
    main()
