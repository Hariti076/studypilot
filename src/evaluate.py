"""Print the test metrics stored with the saved models."""
import json
from pathlib import Path


def main() -> None:
    meta_path = Path(__file__).resolve().parents[1] / "models" / "metadata.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    metrics = meta.get("test_metrics", meta)
    print("StudyPilot held-out metrics (from models/metadata.json)")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
