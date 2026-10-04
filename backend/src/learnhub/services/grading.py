"""Server-side quiz grading. Answers never leave the server before submission."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from ..content.schemas import FillBlank, MultiChoice, Question, SingleChoice, TrueFalse

_WS = re.compile(r"\s+")
_QUOTES = str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"'})


@dataclass(frozen=True)
class GradedAnswer:
    question_id: str
    correct: bool
    response: Any
    correct_answer: Any
    explanation: str


def normalize_text(value: str) -> str:
    text = _WS.sub(" ", value.translate(_QUOTES)).strip().lower()
    return text.rstrip(".!?").strip()


def grade_question(question: Question, response: Any) -> GradedAnswer:
    correct = False
    match question:
        case SingleChoice():
            correct = _is_int(response) and response == question.answer
        case MultiChoice():
            correct = (
                isinstance(response, list)
                and all(_is_int(r) for r in response)
                and set(response) == set(question.answer)
            )
        case TrueFalse():
            correct = isinstance(response, bool) and response == question.answer
        case FillBlank():
            correct = isinstance(response, str) and normalize_text(response) in {
                normalize_text(a) for a in question.answer
            }
    return GradedAnswer(
        question_id=question.id,
        correct=correct,
        response=response,
        correct_answer=question.answer,
        explanation=question.explanation,
    )


def _is_int(value: Any) -> bool:
    # bool is a subclass of int; a True/False must not count as option 1/0.
    return isinstance(value, int) and not isinstance(value, bool)
