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
        "description": "You show up regularly, so the plan can use longer study blocks.",
    },
    "Tutoring-Supported": {
        "id": "tutoring",
        "icon": "rocket",
        "description": "Tutoring is a big part of your routine, so the plan leaves room for it.",
    },
    "Low Motivation": {
        "id": "low-motivation",
        "icon": "sprout",
        "description": "Shorter sessions fit a week when motivation is low.",
    },
    "Irregular Attender": {
        "id": "irregular",
        "icon": "hourglass",
        "description": "Attendance is the habit to fix first, then add short catch-up sessions.",
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


def project_scores(currents: list[float], plan_gain: float) -> list[float]:
    """Spread the model-estimated gain so weaker subjects move further."""
    gaps = [100 - current for current in currents]
    mean_gap = sum(gaps) / len(gaps) if gaps else 0
    projected = []
    for current, gap in zip(currents, gaps):
        if mean_gap <= 0:
            value = current
        else:
            value = current + plan_gain * gap / mean_gap
        projected.append(min(100.0, max(0.0, value)))
    return projected


def subject_risk(projected: float, days_left: int) -> str:
    """Rule-based risk from the subject's own projected mark."""
    if projected < 55 or (days_left <= 10 and projected < 65):
        return "High"
    if projected < 70:
        return "Medium"
    return "Low"


def _raise_overall(classifier_risk: str, subjects: list[dict]) -> str:
    """Keep the classifier label, and do not leave it at Low when a subject is High."""
    if any(subject["risk"] == "High" for subject in subjects) and classifier_risk == "Low":
        return "Medium"
    return classifier_risk


def _next_motivation(level: str) -> str:
    order = ["Low", "Medium", "High"]
    index = order.index(level) if level in order else 1
    return order[min(index + 1, len(order) - 1)]


def _lever_changes(profile: ProfileIn, weekly: float) -> list[tuple[str, str, dict]]:
    """Applicable routine changes. Each item is (id, label, column overrides)."""
    changes = []
    if profile.attendance < 90:
        changes.append(("attendance", "Raise attendance to 90%", {"Attendance": max(profile.attendance, 90)}))
    changes.append(("hours", "Add 3.5 study hours a week", {"Hours_Studied": weekly + 3.5}))
    if profile.sleepHours < 7 or profile.sleepHours > 9:
        changes.append(("sleep", "Move sleep to 8 hours", {"Sleep_Hours": 8}))
    if profile.tutoringSessions < 4:
        changes.append(("tutoring", "Add one tutoring session", {"Tutoring_Sessions": profile.tutoringSessions + 1}))
    if profile.habits != "High":
        changes.append(("motivation", f"Raise motivation from {profile.habits} to {_next_motivation(profile.habits)}", {"Motivation_Level": _next_motivation(profile.habits)}))
    if profile.physicalActivity < 4:
        changes.append(("activity", "Add one hour of physical activity", {"Physical_Activity": profile.physicalActivity + 1}))
    return changes


def _score_row(service, row: dict) -> float:
    return float(service.predict([row])[0]["predicted_score"])


def _levers(service, profile: ProfileIn, base_row: dict, base_score: float) -> tuple[list[dict], float]:
    weekly = base_row["Hours_Studied"]
    changes = _lever_changes(profile, weekly)
    levers = []
    combined = dict(base_row)
    for key, label, overrides in changes:
        row = dict(base_row)
        row.update(overrides)
        combined.update(overrides)
        gain = _score_row(service, row) - base_score
        levers.append({"id": key, "label": label, "gain": round(gain, 3)})
    levers.sort(key=lambda item: item["gain"], reverse=True)
    plan_gain = max(0.0, _score_row(service, combined) - base_score) if changes else 0.0
    return levers, round(plan_gain, 3)


def _warnings(profile: ProfileIn, meta: dict) -> list[str]:
    ranges = meta["numeric_ranges"]
    notes = []
    weekly = weekly_study_hours(profile.dailyHours)
    hours = ranges["Hours_Studied"]
    if weekly < hours["min"] or weekly > hours["max"]:
        notes.append(
            f"Weekly study hours ({weekly:g}) are outside the usual range of {hours['min']:g}–{hours['max']:g}."
        )
    attendance = ranges["Attendance"]
    if profile.attendance < attendance["min"] or profile.attendance > attendance["max"]:
        notes.append(
            f"Attendance ({profile.attendance:g}%) is outside the usual range of {attendance['min']:g}–{attendance['max']:g}%."
        )
    sleep = ranges["Sleep_Hours"]
    if profile.sleepHours < sleep["min"] or profile.sleepHours > sleep["max"]:
        notes.append(
            f"Sleep ({profile.sleepHours:g} h) is outside the usual range of {sleep['min']:g}–{sleep['max']:g} h."
        )
    scores = ranges["Previous_Scores"]
    outside = [subject.name for subject in profile.subjects if subject.score < scores["min"] or subject.score > scores["max"]]
    if outside:
        notes.append(
            f"{', '.join(outside)} sits outside the usual score range of {scores['min']:g}–{scores['max']:g}."
        )
    return notes


def predict_student(profile: ProfileIn) -> dict:
    """One student-level model call, then a rule-based projection per subject."""
    service = get_model_service()
    weekly = weekly_study_hours(profile.dailyHours)
    mean_score = sum(subject.score for subject in profile.subjects) / len(profile.subjects)
    base_row = _raw_row(profile, mean_score, weekly)
    base = service.predict([base_row])[0]
    levers, plan_gain = _levers(service, profile, base_row, base["predicted_score"])
    projected = project_scores([subject.score for subject in profile.subjects], plan_gain)

    subjects = []
    for index, (subject, value) in enumerate(zip(profile.subjects, projected)):
        left = max(0, days_until(subject.examDate))
        risk = subject_risk(value, left)
        shown = present_score(value)
        priority_score, priority = priority_of(shown, subject.difficulty, left, risk)
        subjects.append(
            {
                "name": subject.name,
                "examDate": subject.examDate,
                "daysLeft": left,
                "difficulty": subject.difficulty,
                "current": subject.score,
                "predicted": shown,
                "projectedGain": round(value - subject.score, 3),
                "risk": risk,
                "priority": priority,
                "priorityScore": priority_score,
                "colorIdx": index,
            }
        )

    persona_name = base["persona"]
    persona_tip = base["persona_tip"]
    risk = _raise_overall(base["risk_level"], subjects)

    hour_limits = service.meta["numeric_ranges"]["Hours_Studied"]
    hour_points = trend_hours(profile.dailyHours)
    trend_rows = []
    flags = []
    for hours in hour_points:
        weekly_hours = weekly_study_hours(hours)
        exceeded = weekly_hours < hour_limits["min"] or weekly_hours > hour_limits["max"]
        clamped = min(max(weekly_hours, hour_limits["min"]), hour_limits["max"])
        trend_rows.append(_raw_row(profile, mean_score, clamped))
        flags.append(exceeded)
    trend_preds = service.predict(trend_rows)
    trend = [
        {"hours": hours, "score": present_score(item["predicted_score"]), "exceeded": flag}
        for hours, item, flag in zip(hour_points, trend_preds, flags)
    ]

    avg_predicted = int(round(sum(subject["predicted"] for subject in subjects) / len(subjects)))
    avg_current = int(round(sum(subject["current"] for subject in subjects) / len(subjects)))
    explanation = service.explain(base_row)
    explanation["subject"] = "your overall profile"

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
        "explanation": explanation,
        "warnings": _warnings(profile, service.meta),
        "ml": {
            "predicted_score": round(base["predicted_score"], 1),
            "score_range": base["score_range"],
            "risk_level": base["risk_level"],
            "risk_probabilities": base["risk_probabilities"],
            "persona": persona_name,
            "persona_tip": persona_tip,
            "levers": levers,
            "plan_gain": plan_gain,
        },
    }


def schedule_plan(request: PlanRequest) -> dict:
    """Build the week from an existing model prediction. Does not rescore the student."""
    subjects = [subject.model_dump() for subject in request.prediction.subjects]
    persona_name = request.prediction.persona.name
    topics = {subject.name: subject.weakTopic for subject in request.profile.subjects if subject.weakTopic}
    plan = build_plan(subjects, request.profile.dailyHours, persona_name, request.profile.peakEnergy, topics)
    return {"plan": plan, "generatedAt": stamp()}
