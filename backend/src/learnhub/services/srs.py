"""Spaced repetition scheduling (a simplified SM-2, Anki-style ratings)."""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum

from ..models import CardState

MIN_EASE = 1.3
RELEARN_DELAY = timedelta(minutes=10)


class Rating(str, Enum):
    AGAIN = "again"
    HARD = "hard"
    GOOD = "good"
    EASY = "easy"


def schedule(state: CardState, rating: Rating, now: datetime) -> CardState:
    """Mutate and return `state` after a review with the given rating."""
    if rating is Rating.AGAIN:
        state.reps = 0
        state.lapses += 1
        state.interval_days = 0
        state.ease = max(MIN_EASE, state.ease - 0.2)
        state.due_at = now + RELEARN_DELAY
    else:
        if rating is Rating.HARD:
            interval = 1 if state.reps == 0 else max(state.interval_days + 1, round(state.interval_days * 1.2))
            state.ease = max(MIN_EASE, state.ease - 0.15)
        elif rating is Rating.GOOD:
            interval = {0: 1, 1: 3}.get(state.reps) or max(state.interval_days + 1, round(state.interval_days * state.ease))
        else:  # EASY
            interval = 4 if state.reps == 0 else max(state.interval_days + 1, round(state.interval_days * state.ease * 1.3))
            state.ease += 0.15
        state.reps += 1
        state.interval_days = interval
        state.due_at = now + timedelta(days=interval)
    state.last_reviewed_at = now
    return state
