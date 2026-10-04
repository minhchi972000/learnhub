"""Pydantic models describing course content on disk.

These models are the contract between content authors and the app: anything
that loads without a ValidationError is guaranteed to render and grade.
"""

from __future__ import annotations

import re
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
Slug = Annotated[str, Field(pattern=SLUG_RE.pattern, min_length=1, max_length=80)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- #
# Quiz questions
# --------------------------------------------------------------------------- #


class _QuestionBase(_Strict):
    id: Slug
    prompt: str = Field(min_length=1)
    explanation: str = ""


class SingleChoice(_QuestionBase):
    type: Literal["single"]
    options: list[str] = Field(min_length=2)
    answer: int

    @model_validator(mode="after")
    def _answer_in_range(self) -> "SingleChoice":
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer index {self.answer} out of range for {len(self.options)} options")
        return self


class MultiChoice(_QuestionBase):
    type: Literal["multi"]
    options: list[str] = Field(min_length=2)
    answer: list[int] = Field(min_length=1)

    @model_validator(mode="after")
    def _answers_in_range(self) -> "MultiChoice":
        bad = [i for i in self.answer if not 0 <= i < len(self.options)]
        if bad:
            raise ValueError(f"answer indices {bad} out of range for {len(self.options)} options")
        if len(set(self.answer)) != len(self.answer):
            raise ValueError("answer indices must be unique")
        return self


class TrueFalse(_QuestionBase):
    type: Literal["true_false"]
    answer: bool


class FillBlank(_QuestionBase):
    """Free-text answer. `answer` lists every accepted spelling."""

    type: Literal["fill"]
    answer: list[str] = Field(min_length=1)

    @field_validator("answer", mode="before")
    @classmethod
    def _wrap_single(cls, v: object) -> object:
        return [v] if isinstance(v, str) else v


Question = Annotated[
    Union[SingleChoice, MultiChoice, TrueFalse, FillBlank],
    Field(discriminator="type"),
]


class Quiz(_Strict):
    questions: list[Question] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique_ids(self) -> "Quiz":
        _ensure_unique([q.id for q in self.questions], "question id")
        return self


# --------------------------------------------------------------------------- #
# Flashcards
# --------------------------------------------------------------------------- #


class Flashcard(_Strict):
    id: Slug
    front: str = Field(min_length=1)
    back: str = Field(min_length=1)
    example: str = ""


class Deck(_Strict):
    cards: list[Flashcard] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique_ids(self) -> "Deck":
        _ensure_unique([c.id for c in self.cards], "flashcard id")
        return self


# --------------------------------------------------------------------------- #
# Lessons, units, courses
# --------------------------------------------------------------------------- #


class LessonRef(_Strict):
    """Entry in unit.yaml; `file` is relative to the unit's lessons/ folder."""

    slug: Slug
    title: str
    file: str


class Lesson(_Strict):
    slug: Slug
    title: str
    markdown: str


class UnitMeta(_Strict):
    """Shape of unit.yaml."""

    title: str
    summary: str = ""
    lessons: list[LessonRef] = Field(default_factory=list)


class Unit(_Strict):
    slug: Slug
    order: int
    title: str
    summary: str
    lessons: list[Lesson]
    quiz: Quiz
    deck: Deck

    @model_validator(mode="after")
    def _unique_lessons(self) -> "Unit":
        _ensure_unique([lesson.slug for lesson in self.lessons], "lesson slug")
        return self


class CourseMeta(_Strict):
    """Shape of course.yaml."""

    title: str
    description: str = ""
    language: str = "vi"
    level: str = ""
    tags: list[str] = Field(default_factory=list)
    source: str = ""


class Course(_Strict):
    slug: Slug
    title: str
    description: str
    language: str
    level: str
    tags: list[str]
    source: str
    units: list[Unit]

    def unit(self, slug: str) -> Unit | None:
        return next((u for u in self.units if u.slug == slug), None)


def _ensure_unique(values: list[str], label: str) -> None:
    seen: set[str] = set()
    dupes = sorted({v for v in values if v in seen or seen.add(v)})
    if dupes:
        raise ValueError(f"duplicate {label}: {', '.join(dupes)}")
