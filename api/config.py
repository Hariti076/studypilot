"""Paths to the trained artifacts. Models are loaded, never retrained."""
from pathlib import Path

# studypilot/api/config.py -> project root is one level up
REPO_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = REPO_ROOT / "models"
FEATURES_PATH = REPO_ROOT / "src" / "features.py"
