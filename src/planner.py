"""Turn model outputs into a weekly, session-based study plan.

Allocation uses four signals:
- predicted score (lower scores get more time)
- classifier risk
- subject difficulty
- days until the exam

Session length follows the learner persona from the clustering model.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timezone

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_INDEX = {day: index for index, day in enumerate(DAYS)}
RISK_RANK = {"Low": 0, "Medium": 1, "High": 2}
PEAK_START = {"Morning": 8 * 60, "Afternoon": 14 * 60, "Evening": 17 * 60}

GENERAL_TASKS = [
    "Concept revision & notes",
    "Practice problems",
    "Past-paper questions",
    "Active-recall flashcards",
    "Weak-topic deep dive",
    "Summarise chapter into a mind-map",
]
URGENT_TASKS = [
    "Timed mock test + review mistakes",
    "Past-paper questions under exam timing",
    "Review every mistake from the last paper",
]
HIGH_RISK_TASKS = [
    "Weak-topic deep dive",
    "Guided practice on your lowest-scoring topic",
    "Past-paper questions",
    "Active-recall flashcards",
]
LOW_MOTIVATION_TASKS = [
    "One short concept, then a small reward",
    "Active-recall flashcards",
    "Work one example, then try a single problem",
    "Summarise one page into a mind-map",
]
TUTORING_TASKS = [
    "Prepare three questions for your next tutoring session",
    "Revise the last tutoring topic",
    "Practice problems on the tutored topic",
    "Past-paper questions",
]
IRREGULAR_TASKS = [
    "Catch up on the most recent class",
    "Rewrite today's notes from memory",
    "Short practice set from the latest lesson",
    "Concept revision & notes",
]


def days_until(iso_date: str, today: date | None = None) -> int:
    target = date.fromisoformat(iso_date)
    start = today or date.today()
    return (target - start).days


def weekly_study_hours(daily_hours: float) -> float:
    """The regressor was trained on hours studied per week (range 1–44)."""
    return float(daily_hours) * 7.0


def trend_hours(daily_hours: float) -> list[float]:
    """Hour points for the 'study hours vs performance' chart, including the user's value."""
    ceiling = max(8, math.ceil(daily_hours))
    points = {float(hour) for hour in range(1, ceiling + 1)}
    points.add(float(daily_hours))
    return sorted(points)


def present_score(raw: float) -> int:
    return int(max(0, min(100, round(raw))))


def priority_of(predicted: float, difficulty: int, days_left: int, risk: str) -> tuple[float, str]:
    """Higher score means the subject should take more of the week."""
    urgency = max(0, 30 - days_left) * 0.6
    risk_bonus = {"High": 18, "Medium": 8, "Low": 0}[risk]
    score = (100 - predicted) * 0.6 + difficulty * 5 + urgency + risk_bonus
    if risk == "High" or score >= 55:
        label = "High"
    elif score >= 38:
        label = "Medium"
    else:
        label = "Low"
    return round(score, 1), label


def _session_style(persona: str, priority: str) -> tuple[int, int, int, int]:
    """Return preferred minutes, short break, long break, and minimum session."""
    if persona == "Low Motivation":
        # The persona tip is explicit: start with 25-minute sessions.
        preferred = 45 if priority == "High" else 25
        return preferred, 5, 10, 25
    if persona == "Irregular Attender":
        preferred = {"High": 60, "Medium": 45, "Low": 30}[priority]
        return preferred, 10, 15, 30
    if persona == "Tutoring-Supported":
        preferred = {"High": 75, "Medium": 60, "Low": 45}[priority]
        return preferred, 10, 20, 45
    preferred = {"High": 90, "Medium": 60, "Low": 45}[priority]
    return preferred, 10, 20, 45


def _task_for(subject: dict, persona: str, index: int) -> str:
    if subject["daysLeft"] <= 7:
        pool = URGENT_TASKS
    elif persona == "Low Motivation":
        pool = LOW_MOTIVATION_TASKS
    elif persona == "Tutoring-Supported":
        pool = TUTORING_TASKS
    elif persona == "Irregular Attender":
        pool = IRREGULAR_TASKS
    elif subject["risk"] == "High":
        pool = HIGH_RISK_TASKS
    else:
        pool = GENERAL_TASKS
    return pool[(index + subject["colorIdx"]) % len(pool)]


def format_clock(total_minutes: int) -> str:
    hour24 = (total_minutes // 60) % 24
    minute = total_minutes % 60
    hour12 = 12 if hour24 % 12 == 0 else hour24 % 12
    suffix = "PM" if hour24 >= 12 else "AM"
    return f"{hour12}:{minute:02d} {suffix}"


def format_duration(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} min"
    hours, remainder = divmod(minutes, 60)
    if remainder == 0:
        return "1 hour" if hours == 1 else f"{hours} hours"
    return f"{hours} hr {remainder} min"


def _pick_subject(subjects: list[dict], assigned: dict[str, float], last: str | None) -> dict:
    pool = [s for s in subjects if s["name"] != last] or subjects

    def load(subject: dict) -> float:
        return assigned[subject["name"]] / max(10.0, subject["priorityScore"])

    return min(pool, key=load)


def _day_start(peak: str, total: int) -> int:
    """Start the day at the student's peak-energy time, and finish by 10 PM."""
    start = PEAK_START.get(peak, PEAK_START["Evening"])
    return max(6 * 60, min(start, 22 * 60 - max(total, 0)))


def _apply_spaced_repetition(plan: list[dict]) -> None:
    """Retitle a later session as a day-3 or day-7 review of the same subject.

    A single week can hold the day-1, day-3, and day-7 touches. Day 14 falls in the next week.
    """
    grouped: dict[str, list[dict]] = {}
    for item in plan:
        if item["type"] == "study":
            grouped.setdefault(item["subject"], []).append(item)

    for sessions in grouped.values():
        if len(sessions) < 2:
            continue
        origin = DAY_INDEX[sessions[0]["day"]]
        used: set[int] = set()
        for gap, label in (
            (2, "Spaced review (day 3) — recall this without notes"),
            (6, "Spaced review (day 7) — short check of the same topic"),
        ):
            target = origin + gap
            best = None
            best_distance = 99
            for session in sessions[1:]:
                if id(session) in used:
                    continue
                distance = abs(DAY_INDEX[session["day"]] - target)
                if distance < best_distance and distance <= 1:
                    best = session
                    best_distance = distance
            if best is None:
                continue
            best["task"] = label
            best["review"] = True
            used.add(id(best))


def build_plan(
    subjects: list[dict],
    daily_hours: float,
    persona: str,
    peak: str = "Evening",
    topics: dict[str, str] | None = None,
) -> list[dict]:
    """Pomodoro-style week. Higher priority subjects receive more of the available minutes."""
    topics = topics or {}
    assigned = {subject["name"]: 0.0 for subject in subjects}
    counts = {subject["name"]: 0 for subject in subjects}
    plan: list[dict] = []

    for day_index, day in enumerate(DAYS):
        # Sunday is lighter so the week is sustainable.
        day_factor = 0.7 if day_index == 6 else 1.0
        total = int(round(daily_hours * 60 * day_factor))
        remaining = total
        cursor = _day_start(peak, total)
        last = None
        session_no = 0
        item_index = 0

        while remaining >= 20:
            subject = _pick_subject(subjects, assigned, last)
            preferred, short_break, long_break, minimum = _session_style(persona, subject["priority"])
            if remaining < minimum and session_no > 0:
                break

            length = min(preferred, remaining)
            if length <= 0:
                break

            task_index = counts[subject["name"]]
            counts[subject["name"]] += 1
            topic = topics.get(subject["name"], "")
            task = f"Weak topic: {topic}" if task_index == 0 and topic else _task_for(subject, persona, task_index)
            plan.append(
                {
                    "id": f"{day}-{item_index}",
                    "day": day,
                    "subject": subject["name"],
                    "task": task,
                    "time": f"{format_clock(cursor)} – {format_clock(cursor + length)}",
                    "start": cursor,
                    "minutes": length,
                    "duration": format_duration(length),
                    "type": "study",
                    "priority": subject["priority"],
                    "review": False,
                }
            )
            item_index += 1
            cursor += length
            remaining -= length
            assigned[subject["name"]] += length
            last = subject["name"]
            session_no += 1

            break_len = long_break if session_no % 3 == 0 else short_break
            if remaining - break_len >= minimum:
                plan.append(
                    {
                        "id": f"{day}-{item_index}",
                        "day": day,
                        "subject": "Break",
                        "task": "Long break — stretch, hydrate, snack" if break_len >= 15 else "Short break — breathe & reset",
                        "time": f"{format_clock(cursor)} – {format_clock(cursor + break_len)}",
                        "start": cursor,
                        "minutes": break_len,
                        "duration": format_duration(break_len),
                        "type": "break",
                        "priority": None,
                    }
                )
                item_index += 1
                cursor += break_len
                remaining -= break_len

    _apply_spaced_repetition(plan)
    return plan


def _join(items: list[str]) -> str:
    if len(items) <= 1:
        return items[0] if items else ""
    return f"{', '.join(items[:-1])} and {items[-1]}"


def build_feedback(profile, subjects: list[dict], risk: str, persona: str, persona_tip: str) -> list[dict]:
    messages: list[dict] = []
    worst = min(subjects, key=lambda subject: subject["predicted"])
    top = max(subjects, key=lambda subject: subject["priorityScore"])
    soonest = min(subjects, key=lambda subject: subject["daysLeft"])

    if risk == "High":
        reasons = []
        if profile.dailyHours < 2:
            reasons.append("low study hours")
        if profile.sleepHours < 6:
            reasons.append("too little sleep")
        if profile.habits == "Low":
            reasons.append("low motivation")
        if profile.attendance < 75:
            reasons.append("low attendance")
        if not reasons:
            reasons.append(f"a weak outlook in {worst['name']}")
        messages.append({"type": "danger", "text": f"You are at high risk due to {_join(reasons)}."})
    elif risk == "Medium":
        messages.append(
            {
                "type": "warning",
                "text": "You're close — a little extra focus now will lift your weaker subjects.",
            }
        )
    else:
        messages.append({"type": "success", "text": "You're in a strong position. Keep your routine steady."})

    if persona_tip:
        messages.append({"type": "info", "text": f"{persona}: {persona_tip}"})

    messages.append(
        {
            "type": "info",
            "text": f"Focus more on {top['name']} this week — it is your highest-priority subject.",
        }
    )

    if soonest["daysLeft"] <= 14:
        if soonest["daysLeft"] <= 0:
            when = "today"
        elif soonest["daysLeft"] == 1:
            when = "tomorrow"
        else:
            when = f"in {soonest['daysLeft']} days"
        messages.append(
            {
                "type": "warning",
                "text": f"{soonest['name']} exam is {when} — switch to timed practice and past papers.",
            }
        )

    if profile.dailyHours >= 6 and profile.sleepHours < 7:
        messages.insert(
            0,
            {
                "type": "danger",
                "text": (
                    f"Burnout warning: {profile.dailyHours:g} study hours a day with "
                    f"{profile.sleepHours:g} hours of sleep is a heavy load. Shorten a block or sleep before adding more."
                ),
            },
        )

    if profile.sleepHours < 6:
        messages.append(
            {
                "type": "warning",
                "text": f"You're sleeping {profile.sleepHours:g} hours. Aim for 7–8 to lock in what you study.",
            }
        )
    elif profile.habits == "High" and profile.sleepHours >= 7 and profile.attendance >= 85:
        messages.append({"type": "success", "text": "Strong habits and attendance — consistency is your advantage."})

    return messages[:6]


def overall_risk(levels: list[str]) -> str:
    """The plan should not hide a high-risk subject behind a comfortable average."""
    return max(levels, key=lambda level: RISK_RANK[level])


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()
