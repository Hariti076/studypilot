"""Planner rules that do not depend on a fresh model fit."""
from src.planner import DAYS, build_plan, present_score


def _subjects():
    return [
        {"name": "Physics", "daysLeft": 18, "difficulty": 5, "risk": "Medium", "priority": "High", "priorityScore": 40, "colorIdx": 0},
        {"name": "Mathematics", "daysLeft": 12, "difficulty": 4, "risk": "Medium", "priority": "Medium", "priorityScore": 30, "colorIdx": 1},
        {"name": "English", "daysLeft": 30, "difficulty": 2, "risk": "Low", "priority": "Low", "priorityScore": 12, "colorIdx": 2},
    ]


def test_present_score_clamps_and_rounds():
    assert present_score(66.4) == 66
    assert present_score(66.6) == 67
    assert present_score(-4) == 0
    assert present_score(140) == 100


def test_plan_covers_seven_days_without_overlaps_or_repeats():
    plan = build_plan(_subjects(), daily_hours=3, persona="Irregular Attender", peak="Evening")
    assert {item["day"] for item in plan} == set(DAYS)
    for day in DAYS:
        items = [item for item in plan if item["day"] == day]
        items.sort(key=lambda item: item["start"])
        for previous, current in zip(items, items[1:]):
            assert current["start"] >= previous["start"] + previous["minutes"]
        studies = [item for item in items if item["type"] == "study"]
        for previous, current in zip(studies, studies[1:]):
            assert previous["subject"] != current["subject"]


def test_minutes_stay_within_one_session_of_the_daily_budget():
    daily = 3
    plan = build_plan(_subjects(), daily_hours=daily, persona="Consistent Attender", peak="Morning")
    for index, day in enumerate(DAYS):
        factor = 0.7 if index == 6 else 1.0
        budget = int(round(daily * 60 * factor))
        used = sum(item["minutes"] for item in plan if item["day"] == day)
        assert 0 <= budget - used < 90


def test_low_motivation_sessions_are_at_most_45_minutes():
    plan = build_plan(_subjects(), daily_hours=4, persona="Low Motivation", peak="Evening")
    studies = [item for item in plan if item["type"] == "study"]
    assert studies
    assert max(item["minutes"] for item in studies) <= 45
