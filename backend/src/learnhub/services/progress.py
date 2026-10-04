"""Queries over learner state, shared by several routers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlmodel import Session, select

from ..content.schemas import Course, Flashcard, Unit
from ..models import CardState, LessonProgress, QuizAttempt


def completed_lessons(session: Session, learner: str, course: str) -> set[tuple[str, str]]:
    rows = session.exec(
        select(LessonProgress.unit, LessonProgress.lesson).where(
            LessonProgress.learner_id == learner, LessonProgress.course == course
        )
    ).all()
    return {(u, lesson) for u, lesson in rows}


def best_percent_by_unit(session: Session, learner: str, course: str) -> dict[str, float]:
    best: dict[str, float] = {}
    rows = session.exec(
        select(QuizAttempt).where(QuizAttempt.learner_id == learner, QuizAttempt.course == course)
    ).all()
    for a in rows:
        pct = percent(a.score, a.total)
        best[a.unit] = max(best.get(a.unit, 0.0), pct)
    return best


def card_states(session: Session, learner: str, course: str) -> dict[tuple[str, str], CardState]:
    rows = session.exec(
        select(CardState).where(CardState.learner_id == learner, CardState.course == course)
    ).all()
    return {(s.unit, s.card_id): s for s in rows}


@dataclass
class QueueItem:
    unit: Unit
    card: Flashcard
    state: CardState | None


def review_queue(
    course: Course,
    states: dict[tuple[str, str], CardState],
    now: datetime,
    unit: str | None = None,
    new_limit: int = 20,
) -> tuple[list[QueueItem], int, int]:
    """Cards to study now: overdue reviews first (oldest first), then unseen cards in course order.

    Returns (queue, due_count, new_count) where the counts are before `new_limit` is applied.
    """
    due: list[QueueItem] = []
    new: list[QueueItem] = []
    for u in course.units:
        if unit and u.slug != unit:
            continue
        for card in u.deck.cards:
            state = states.get((u.slug, card.id))
            if state is None:
                new.append(QueueItem(u, card, None))
            elif state.due_at <= now:
                due.append(QueueItem(u, card, state))
    due.sort(key=lambda item: item.state.due_at)  # type: ignore[union-attr]
    return due + new[:new_limit], len(due), len(new)


def percent(score: int, total: int) -> float:
    return round(100 * score / total, 1) if total else 0.0
