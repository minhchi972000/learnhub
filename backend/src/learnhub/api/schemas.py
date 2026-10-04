"""Response/request models of the HTTP API (mirrored in frontend/src/api/types.ts)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from ..services.srs import Rating


class CourseSummary(BaseModel):
    slug: str
    title: str
    description: str
    level: str
    tags: list[str]
    unit_count: int
    lesson_count: int
    completed_lessons: int
    card_count: int
    cards_due: int


class LessonItem(BaseModel):
    slug: str
    title: str
    completed: bool


class UnitSummary(BaseModel):
    slug: str
    order: int
    title: str
    summary: str
    lessons: list[LessonItem]
    question_count: int
    best_percent: float | None
    card_count: int


class CourseDetail(BaseModel):
    slug: str
    title: str
    description: str
    level: str
    tags: list[str]
    source: str
    lesson_count: int
    completed_lessons: int
    units: list[UnitSummary]


class LessonNav(BaseModel):
    unit: str
    lesson: str
    title: str


class LessonDetail(BaseModel):
    course: str
    course_title: str
    unit: str
    unit_title: str
    slug: str
    title: str
    markdown: str
    completed: bool
    prev: LessonNav | None
    next: LessonNav | None


class CompleteIn(BaseModel):
    completed: bool = True


class PublicQuestion(BaseModel):
    """A question as shown to the learner – no answer, no explanation."""

    id: str
    type: Literal["single", "multi", "true_false", "fill"]
    prompt: str
    options: list[str] | None = None


class QuizOut(BaseModel):
    course: str
    unit: str
    unit_title: str
    questions: list[PublicQuestion]
    attempts: int
    best_percent: float | None


class QuizSubmission(BaseModel):
    answers: dict[str, Any]


class QuestionResult(BaseModel):
    id: str
    correct: bool
    response: Any
    correct_answer: Any
    explanation: str


class QuizResult(BaseModel):
    attempt_id: int
    score: int
    total: int
    percent: float
    results: list[QuestionResult]


class CardOut(BaseModel):
    unit: str
    unit_title: str
    id: str
    front: str
    back: str
    example: str
    is_new: bool
    reps: int
    interval_days: int


class DueCards(BaseModel):
    cards: list[CardOut]
    due_count: int
    new_count: int


class DeckCard(BaseModel):
    id: str
    front: str
    back: str
    example: str
    learned: bool


class DeckUnit(BaseModel):
    """One unit's flashcards for the knowledge summary page."""

    slug: str
    order: int
    title: str
    cards: list[DeckCard]


class ReviewIn(BaseModel):
    unit: str
    card_id: str
    rating: Rating


class ReviewOut(BaseModel):
    card_id: str
    reps: int
    interval_days: int
    due_at: datetime


class AttemptItem(BaseModel):
    unit: str
    unit_title: str
    score: int
    total: int
    percent: float
    created_at: datetime


class CourseStats(BaseModel):
    lessons_total: int
    lessons_completed: int
    quiz_units_total: int
    quiz_units_attempted: int
    quiz_average_best_percent: float | None
    cards_total: int
    cards_learned: int
    cards_due: int
    recent_attempts: list[AttemptItem]
