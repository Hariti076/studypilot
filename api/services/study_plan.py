"""Build the response the React app already renders.

Flow: form profile -> one model row per subject -> planner -> dashboard payload.
Prediction and the weekly plan are separate so the v2 UI can show scores first,
then ask for a schedule built from those scores.
"""
from __future__ import annotations

from api.ml.predictor import get_model_service
from api.planner.engine import (
    build_feedback,
    build_plan,
    days_until,
    overall_risk,
    present_score,
    priority_of,
    stamp,
    trend_hours,
    weekly_study_hours,
)
from api.schemas import PlanRequest, ProfileIn

# Icons match the dashboard's persona card (trophy, hourglass, sprout, rocket).
PERSONA_UI = {
    "Consistent Attender": {
        "id": "consistent",
        "icon": "trophy",
        "description": "The clustering model groups you with students whose attendance is well above average.",
    },
    "Tutoring-Supported": {
        "id": "tutoring",
        "icon": "rocket",
        "description": "The clustering model groups you with students who rely on tutoring more than their peers.",
    },
    "Low Motivation": {
        "id": "low-motivation",
        "icon": "sprout",
        "description": "The clustering model groups you with students whose motivation is the habit furthest below average.",
    },
    "Irregular Attender": {
        "id": "irregular",
        "icon": "hourglass",
        "description": "The clustering model groups you with students whose attendance is the habit furthest below average.",
    },
}


def _raw_row(profile: ProfileIn, previous_score: float, weekly_hours: float) -> dict:
    """Map the form onto the 13 columns listed in metadata['raw_input_columns'].

    ``habits`` is the motivation level the classifier and clusterer were trained on.
    Daily study hours are scaled to a week because Hours_Studied is weekly.
    """
    return {
        "Hours_Studied": weekly_hours,
        "Attendance": profile.attendance,
        "Parental_Involvement": profile.parentalInvolvement,
        "Access_to_Resources": profile.accessToResources,
        "Extracurricular_Activities": profile.extracurricular,
        "Sleep_Hours": profile.sleepHours,
        "Previous_Scores": previous_score,
        "Motivation_Level": profile.habits,
        "Internet_Access": profile.internetAccess,
        "Tutoring_Sessions": profile.tutoringSessions,
        "Teacher_Quality": profile.teacherQuality,
        "Peer_Influence": profile.peerInfluence,
        "Physical_Activity": profile.physicalActivity,
    }


def _persona_card(name: str, tip: str) -> dict:
    ui = PERSONA_UI.get(name, {"id": "learner", "icon": "rocket", "description": tip})
    return {
        "id": ui["id"],
        "name": name,
        "icon": ui["icon"],
        "description": ui["description"],
        "tip": tip,
    }


def predict_student(profile: ProfileIn) -> dict:
    """Score, risk, and persona from the trained models. Does not build the timetable."""
    service = get_model_service()
    weekly = weekly_study_hours(profile.dailyHours)
    subject_rows = [_raw_row(profile, subject.score, weekly) for subject in profile.subjects]
    subject_preds = service.predict(subject_rows)

    subjects = []
    for index, (subject, prediction) in enumerate(zip(profile.subjects, subject_preds)):
        left = max(0, days_until(subject.examDate))
        predicted = present_score(prediction["predicted_score"])
        risk = prediction["risk_level"]
        priority_score, priority = priority_of(predicted, subject.difficulty, left, risk)
        subjects.append(
            {
                "name": subject.name,
                "examDate": subject.examDate,
                "daysLeft": left,
                "difficulty": subject.difficulty,
                "current": subject.score,
                "predicted": predicted,
                "scoreRange": prediction["score_range"],
                "risk": risk,
                "riskProbabilities": prediction["risk_probabilities"],
                "priority": priority,
                "priorityScore": priority_score,
                "colorIdx": index,
            }
        )

    persona_name = subject_preds[0]["persona"]
    persona_tip = subject_preds[0]["persona_tip"]
    risk = overall_risk([subject["risk"] for subject in subjects])

    hour_points = trend_hours(profile.dailyHours)
    trend_rows = [
        _raw_row(profile, subject.score, weekly_study_hours(hours))
        for hours in hour_points
        for subject in profile.subjects
    ]
    trend_preds = service.predict(trend_rows)
    per_subject = len(profile.subjects)
    trend = []
    for index, hours in enumerate(hour_points):
        chunk = trend_preds[index * per_subject : (index + 1) * per_subject]
        average = sum(item["predicted_score"] for item in chunk) / per_subject
        trend.append({"hours": hours, "score": present_score(average)})

    avg_predicted = int(round(sum(subject["predicted"] for subject in subjects) / len(subjects)))
    avg_current = int(round(sum(subject["current"] for subject in subjects) / len(subjects)))
    weak_index = min(range(len(subjects)), key=lambda index: subjects[index]["current"])
    explanation = service.explain(subject_rows[weak_index])
    explanation["subject"] = subjects[weak_index]["name"]

    return {
        "generatedAt": stamp(),
        "risk": risk,
        "persona": _persona_card(persona_name, persona_tip),
        "predicted_scores": {subject["name"]: subject["predicted"] for subject in subjects},
        "subjects": subjects,
        "profile": {
            "dailyHours": profile.dailyHours,
            "sleepHours": profile.sleepHours,
            "habits": profile.habits,
            "attendance": profile.attendance,
        },
        "trend": trend,
        "feedback": build_feedback(profile, subjects, risk, persona_name, persona_tip),
        "summary": {"avgPredicted": avg_predicted, "avgCurrent": avg_current},
        "models": {
            "score": service.meta["best_models"]["regressor"],
            "risk": service.meta["best_models"]["classifier"],
            "persona": f"K-Means (k={service.meta['best_models']['clusters']})",
        },
        "explanation": explanation,
        "modelCard": _model_card(service),
    }


def _model_card(service) -> dict:
    """Facts already stored with the trained models. No new numbers are invented."""
    metrics = service.meta["test_metrics"]
    regression = metrics["regression_all_rows"]
    classification = metrics["classification"]
    return {
        "dataset": "Kaggle Student Performance Factors, 6,607 rows after cleaning. The set is synthetic.",
        "split": "80/20, stratified by risk. Models were chosen with 5-fold cross-validation on the training set.",
        "regression": {
            "model": service.meta["best_models"]["regressor"],
            "MAE": round(regression["MAE"], 2),
            "RMSE": round(regression["RMSE"], 2),
            "R2": round(regression["R2"], 3),
        },
        "classification": {
            "model": service.meta["best_models"]["classifier"],
            "accuracy": round(classification["Accuracy"], 3),
            "f1Macro": round(classification["F1_macro"], 3),
            "rocAuc": round(classification["ROC_AUC"], 3),
            "highRiskRecall": round(classification["High_Risk_Recall"], 3),
        },
        "clustering": {
            "model": f"K-Means (k={service.meta['best_models']['clusters']})",
            "silhouette": round(metrics["clustering_silhouette"], 2),
        },
        "notes": [
            "Linear Regression and Logistic Regression were kept because they matched or beat the tree models on this data.",
            "High-risk recall is the classification number that matters most: missing a struggling student is worse than a false alarm.",
            "Persona groups are soft. A silhouette of 0.13 means the cluster is a study hint, not a fixed type.",
            "Predictions are planning estimates. The score shown in the app includes a range of about ±1.3 marks.",
        ],
    }


def schedule_plan(request: PlanRequest) -> dict:
    """Build the week from an existing model prediction. Does not rescore the student."""
    subjects = [subject.model_dump() for subject in request.prediction.subjects]
    persona_name = request.prediction.persona.name
    topics = {subject.name: subject.weakTopic for subject in request.profile.subjects if subject.weakTopic}
    plan = build_plan(subjects, request.profile.dailyHours, persona_name, request.profile.peakEnergy, topics)
    return {"plan": plan, "generatedAt": stamp()}
