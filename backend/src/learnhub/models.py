"""Persistent learner state. Content itself lives on disk, never in the DB.

Every row carries `learner_id` so the app can grow from single-user (the
default "local" learner) to authenticated multi-user without a schema change.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, UniqueConstraint


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LessonProgress(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("learner_id", "course", "unit", "lesson"),)

    id: int | None = Field(default=None, primary_key=True)
    learner_id: str = Field(index=True)
    course: str = Field(index=True)
    unit: str
    lesson: str
    completed_at: datetime = Field(default_factory=utcnow)


class QuizAttempt(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    learner_id: str = Field(index=True)
    course: str = Field(index=True)
    unit: str
    score: int
    total: int
    answers_json: str = "{}"
    created_at: datetime = Field(default_factory=utcnow)


class CardState(SQLModel, table=True):
    """Spaced-repetition state of one flashcard for one learner."""

    __table_args__ = (UniqueConstraint("learner_id", "course", "unit", "card_id"),)

    id: int | None = Field(default=None, primary_key=True)
    learner_id: str = Field(index=True)
    course: str = Field(index=True)
    unit: str
    card_id: str
    ease: float = 2.5
    interval_days: int = 0
    reps: int = 0
    lapses: int = 0
    due_at: datetime = Field(default_factory=utcnow, index=True)
    last_reviewed_at: datetime | None = None
