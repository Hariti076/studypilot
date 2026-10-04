"""API tests. They load the shipped models and do not retrain them."""
from datetime import date, timedelta

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def _profile(**overrides):
    exam = (date.today() + timedelta(days=20)).isoformat()
    body = {
        "subjects": [
            {"name": "Mathematics", "examDate": exam, "score": 62, "difficulty": 4},
            {"name": "Physics", "examDate": exam, "score": 55, "difficulty": 5, "weakTopic": "numericals"},
            {"name": "Chemistry", "examDate": (date.today() + timedelta(days=24)).isoformat(), "score": 74, "difficulty": 3},
            {"name": "English", "examDate": (date.today() + timedelta(days=30)).isoformat(), "score": 82, "difficulty": 2},
        ],
        "dailyHours": 3,
        "sleepHours": 6,
        "habits": "Medium",
        "attendance": 74,
        "parentalInvolvement": "Medium",
        "accessToResources": "Medium",
        "extracurricular": "Yes",
        "internetAccess": "Yes",
        "tutoringSessions": 1,
        "teacherQuality": "Medium",
        "peerInfluence": "Neutral",
        "physicalActivity": 2,
        "peakEnergy": "Evening",
    }
    body.update(overrides)
    return body


def _plan_body(profile, prediction):
    return {
        "profile": profile,
        "prediction": {
            "persona": {"name": prediction["persona"]["name"]},
            "subjects": [
                {
                    "name": subject["name"],
                    "daysLeft": subject["daysLeft"],
                    "difficulty": subject["difficulty"],
                    "risk": subject["risk"],
                    "priority": subject["priority"],
                    "priorityScore": subject["priorityScore"],
                    "colorIdx": subject["colorIdx"],
                }
                for subject in prediction["subjects"]
            ],
        },
    }


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["models"]["score"] == "Linear Regression"
    assert body["models"]["risk"] == "Logistic Regression"


def test_predict_and_plan_shape():
    profile = _profile()
    response = client.post("/api/predict", json=profile)
    assert response.status_code == 200
    body = response.json()
    assert set(body["predicted_scores"]) == {"Mathematics", "Physics", "Chemistry", "English"}
    assert "ml" in body and "levers" in body["ml"] and "plan_gain" in body["ml"]
    for subject in body["subjects"]:
        assert "predicted" in subject and "current" in subject and "projectedGain" in subject
    plan = client.post("/api/plan", json=_plan_body(profile, body))
    assert plan.status_code == 200
    days = {item["day"] for item in plan.json()["plan"]}
    assert days == {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}


def test_predict_is_deterministic():
    profile = _profile()
    first = client.post("/api/predict", json=profile).json()
    second = client.post("/api/predict", json=profile).json()
    assert first["ml"] == second["ml"]
    assert first["subjects"] == second["subjects"]


def test_more_attendance_does_not_lower_the_model_score():
    low = client.post("/api/predict", json=_profile(attendance=60)).json()
    high = client.post("/api/predict", json=_profile(attendance=95)).json()
    assert high["ml"]["predicted_score"] >= low["ml"]["predicted_score"]


def test_low_attendance_is_accepted_and_warned():
    response = client.post("/api/predict", json=_profile(attendance=40))
    assert response.status_code == 200
    assert any("Attendance" in note for note in response.json()["warnings"])


def test_validation_errors_are_readable():
    profile = _profile()
    profile["subjects"][1]["name"] = "Mathematics"
    duplicate = client.post("/api/predict", json=profile)
    assert duplicate.status_code == 422
    assert "Duplicate" in duplicate.json()["message"]

    past = _profile()
    past["subjects"][0]["examDate"] = "2020-01-01"
    expired = client.post("/api/predict", json=past)
    assert expired.status_code == 422
    assert "past" in expired.json()["message"]

    bad = _profile(habits="Sometimes")
    category = client.post("/api/predict", json=bad)
    assert category.status_code == 422
    assert category.json()["message"]

    huge = _profile(dailyHours=20)
    out_of_range = client.post("/api/predict", json=huge)
    assert out_of_range.status_code == 422
    assert out_of_range.json()["message"]
