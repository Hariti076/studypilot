# StudyPilot

AI study planner. A student enters subjects and habits, saved models estimate each subject's score and risk and assign a study persona, and the planner turns that into a weekly timetable.

Accounts stay in the browser. Scores, risk, and personas come from the joblib files in `models/`. Those files are loaded as they are. Do not retrain them.

## Layout

```
studypilot/
├── data/            dataset notes (the Kaggle file is not stored here)
├── notebooks/       01_eda, 02_preprocessing, 03_modeling, 04_evaluation
├── src/
│   ├── preprocessing.py
│   ├── features.py
│   ├── train.py
│   ├── evaluate.py
│   └── planner.py
├── models/          score_regressor, risk_classifier, persona_clusterer, metadata.json
├── api/             FastAPI app (main.py, schemas.py)
├── frontend/        React app
├── reports/         model card, comparison tables, figures
├── requirements.txt
└── README.md
```

## Run it

Two terminals, from this folder. Needs Python 3.14 (the environment these models load in) and Node 18+.

```bash
pip install -r requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Create an account, open Inputs, and use Fill sample data. Analyse calls `POST /api/predict`. Build weekly plan calls `POST /api/plan`.

`python src/train.py` only checks that the three model files are present. `python src/evaluate.py` prints the test metrics stored in `models/metadata.json`.

## Models

| Job | Algorithm | What the app uses it for |
| --- | --- | --- |
| Score | Linear Regression | Predicted score per subject |
| Risk | Logistic Regression | High / Medium / Low risk |
| Persona | K-Means (k = 4) | Session length and study method |

Held-out numbers are in `reports/MODEL_CARD.md` and `models/metadata.json`. Comparison tables from the original training run are the CSV files in `reports/`.
