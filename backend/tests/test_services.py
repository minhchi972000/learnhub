from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from learnhub.content.schemas import FillBlank, MultiChoice, SingleChoice, TrueFalse
from learnhub.models import CardState
from learnhub.services.grading import grade_question
from learnhub.services.srs import Rating, schedule

SINGLE = SingleChoice(id="s", type="single", prompt="p", options=["a", "b"], answer=1)
MULTI = MultiChoice(id="m", type="multi", prompt="p", options=["a", "b", "c"], answer=[0, 2])
TF = TrueFalse(id="t", type="true_false", prompt="p", answer=False)
FILL = FillBlank(id="f", type="fill", prompt="p", answer=["result in", "lead to"])


@pytest.mark.parametrize(
    ("question", "response", "expected"),
    [
        (SINGLE, 1, True),
        (SINGLE, 0, False),
        (SINGLE, True, False),  # bool must not be treated as index 1
        (SINGLE, "1", False),
        (MULTI, [2, 0], True),
        (MULTI, [0], False),
        (MULTI, None, False),
        (TF, False, True),
        (TF, 0, False),
        (FILL, "  Result   IN. ", True),
        (FILL, "lead to", True),
        (FILL, "result on", False),
        (FILL, None, False),
    ],
)
def test_grading(question, response, expected):
    assert grade_question(question, response).correct is expected


def test_srs_progression_and_lapse():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    s = CardState(learner_id="l", course="c", unit="u", card_id="x")

    schedule(s, Rating.GOOD, now)
    assert (s.reps, s.interval_days, s.due_at) == (1, 1, now + timedelta(days=1))
    schedule(s, Rating.GOOD, now)
    assert s.interval_days == 3
    schedule(s, Rating.GOOD, now)
    assert s.interval_days == round(3 * 2.5)

    schedule(s, Rating.AGAIN, now)
    assert s.reps == 0 and s.lapses == 1 and s.ease == pytest.approx(2.3)
    assert s.due_at == now + timedelta(minutes=10)


def test_srs_easy_and_hard_adjust_ease():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    s = CardState(learner_id="l", course="c", unit="u", card_id="x")
    schedule(s, Rating.EASY, now)
    assert s.interval_days == 4 and s.ease == pytest.approx(2.65)
    schedule(s, Rating.HARD, now)
    assert s.interval_days == 5 and s.ease == pytest.approx(2.5)
