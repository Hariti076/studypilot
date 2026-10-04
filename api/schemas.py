"""Request bodies for the planner API. Field names match the React form."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Level = Literal["Low", "Medium", "High"]
Peak = Literal["Morning", "Afternoon", "Evening"]
YesNo = Literal["Yes", "No"]
Peer = Literal["Negative", "Neutral", "Positive"]


class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    examDate: str
    score: float = Field(ge=0, le=100)
    difficulty: int = Field(ge=1, le=5)
    weakTopic: str = Field(default="", max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Subject name is required")
        return cleaned

    @field_validator("weakTopic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        return value.strip()

    @field_validator("examDate")
    @classmethod
    def exam_not_past(cls, value: str) -> str:
        try:
            exam = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Exam date must be YYYY-MM-DD") from exc
        if exam < date.today():
            raise ValueError("Exam date is in the past")
        return value


class ProfileIn(BaseModel):
    """Student profile.

    Study hours, sleep, and habits come from the original form.
    The remaining fields are the other inputs the trained models expect.
    Defaults are the training-set medians, so an older client still runs.
    """

    subjects: list[SubjectIn] = Field(min_length=1, max_length=8)
    dailyHours: float = Field(ge=1, le=12)
    sleepHours: float = Field(ge=3, le=12)
    habits: Level
    attendance: float = Field(default=80, ge=0, le=100)
    parentalInvolvement: Level = "Medium"
    accessToResources: Level = "Medium"
    extracurricular: YesNo = "No"
    internetAccess: YesNo = "Yes"
    tutoringSessions: float = Field(default=1, ge=0, le=8)
    teacherQuality: Level = "Medium"
    peerInfluence: Peer = "Neutral"
    physicalActivity: float = Field(default=3, ge=0, le=6)
    peakEnergy: Peak = "Evening"

    @model_validator(mode="after")
    def unique_subjects(self) -> "ProfileIn":
        seen: set[str] = set()
        for subject in self.subjects:
            key = subject.name.casefold()
            if key in seen:
                raise ValueError(f"Duplicate subject: {subject.name}")
            seen.add(key)
        return self


class PersonaIn(BaseModel):
    name: str = Field(min_length=1)


class SubjectForPlan(BaseModel):
    name: str
    daysLeft: int = 0
    difficulty: int = Field(default=3, ge=1, le=5)
    risk: Literal["Low", "Medium", "High"] = "Medium"
    priority: Literal["Low", "Medium", "High"] = "Medium"
    priorityScore: float = 10
    colorIdx: int = 0


class PredictionIn(BaseModel):
    persona: PersonaIn
    subjects: list[SubjectForPlan] = Field(min_length=1, max_length=8)


class PlanRequest(BaseModel):
    """What the planner page sends after a prediction already exists."""

    profile: ProfileIn
    prediction: PredictionIn
