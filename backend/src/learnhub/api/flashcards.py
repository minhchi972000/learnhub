"""Flashcard review queue with spaced repetition."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from ..models import CardState, utcnow
from ..services import progress
from ..services.srs import schedule
from .deps import CourseDep, LearnerDep, SessionDep
from .schemas import CardOut, DueCards, ReviewIn, ReviewOut

router = APIRouter(prefix="/api/courses/{course}/flashcards", tags=["flashcards"])


@router.get("/due", response_model=DueCards)
def due_cards(
    course: CourseDep,
    session: SessionDep,
    learner: LearnerDep,
    unit: str | None = None,
    new_limit: Annotated[int, Query(ge=0, le=200)] = 20,
) -> DueCards:
    if unit is not None and course.unit(unit) is None:
        raise HTTPException(404, f"Unit '{unit}' not found")
    states = progress.card_states(session, learner, course.slug)
    queue, due, new = progress.review_queue(course, states, utcnow(), unit=unit, new_limit=new_limit)
    return DueCards(
        cards=[
            CardOut(
                unit=item.unit.slug,
                unit_title=item.unit.title,
                id=item.card.id,
                front=item.card.front,
                back=item.card.back,
                example=item.card.example,
                is_new=item.state is None,
                reps=item.state.reps if item.state else 0,
                interval_days=item.state.interval_days if item.state else 0,
            )
            for item in queue
        ],
        due_count=due,
        new_count=new,
    )


@router.post("/reviews", response_model=ReviewOut)
def review_card(course: CourseDep, body: ReviewIn, session: SessionDep, learner: LearnerDep) -> ReviewOut:
    unit = course.unit(body.unit)
    if unit is None or not any(c.id == body.card_id for c in unit.deck.cards):
        raise HTTPException(404, "Card not found")
    state = session.exec(
        select(CardState).where(
            CardState.learner_id == learner,
            CardState.course == course.slug,
            CardState.unit == body.unit,
            CardState.card_id == body.card_id,
        )
    ).first() or CardState(learner_id=learner, course=course.slug, unit=body.unit, card_id=body.card_id)
    schedule(state, body.rating, utcnow())
    session.add(state)
    session.commit()
    return ReviewOut(card_id=state.card_id, reps=state.reps, interval_days=state.interval_days, due_at=state.due_at)
