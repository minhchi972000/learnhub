"""Unit quizzes: fetch questions (without answers), submit attempts, course stats."""

from __future__ import annotations

import json

from fastapi import APIRouter
from sqlmodel import col, func, select

from ..models import QuizAttempt, utcnow
from ..services import progress
from ..services.grading import grade_question
from .deps import CourseDep, LearnerDep, SessionDep, UnitDep
from .schemas import (
    AttemptItem,
    CourseStats,
    PublicQuestion,
    QuestionResult,
    QuizOut,
    QuizResult,
    QuizSubmission,
)

router = APIRouter(prefix="/api/courses/{course}", tags=["quizzes"])


@router.get("/units/{unit}/quiz", response_model=QuizOut)
def get_quiz(course: CourseDep, unit: UnitDep, session: SessionDep, learner: LearnerDep) -> QuizOut:
    attempts = session.exec(
        select(func.count()).select_from(QuizAttempt).where(
            QuizAttempt.learner_id == learner, QuizAttempt.course == course.slug, QuizAttempt.unit == unit.slug
        )
    ).one()
    best = progress.best_percent_by_unit(session, learner, course.slug).get(unit.slug)
    return QuizOut(
        course=course.slug,
        unit=unit.slug,
        unit_title=unit.title,
        questions=[
            PublicQuestion(id=q.id, type=q.type, prompt=q.prompt, options=getattr(q, "options", None))
            for q in unit.quiz.questions
        ],
        attempts=attempts,
        best_percent=best,
    )


@router.post("/units/{unit}/quiz/attempts", response_model=QuizResult)
def submit_quiz(
    course: CourseDep, unit: UnitDep, body: QuizSubmission, session: SessionDep, learner: LearnerDep
) -> QuizResult:
    graded = [grade_question(q, body.answers.get(q.id)) for q in unit.quiz.questions]
    score = sum(g.correct for g in graded)
    attempt = QuizAttempt(
        learner_id=learner,
        course=course.slug,
        unit=unit.slug,
        score=score,
        total=len(graded),
        answers_json=json.dumps(body.answers, ensure_ascii=False),
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return QuizResult(
        attempt_id=attempt.id or 0,
        score=score,
        total=len(graded),
        percent=progress.percent(score, len(graded)),
        results=[
            QuestionResult(
                id=g.question_id,
                correct=g.correct,
                response=g.response,
                correct_answer=g.correct_answer,
                explanation=g.explanation,
            )
            for g in graded
        ],
    )


@router.get("/stats", response_model=CourseStats)
def course_stats(course: CourseDep, session: SessionDep, learner: LearnerDep) -> CourseStats:
    done = progress.completed_lessons(session, learner, course.slug)
    best = progress.best_percent_by_unit(session, learner, course.slug)
    states = progress.card_states(session, learner, course.slug)
    _, due, _ = progress.review_queue(course, states, utcnow())
    titles = {u.slug: u.title for u in course.units}
    quiz_units = [u.slug for u in course.units if u.quiz.questions]
    attempted = [best[s] for s in quiz_units if s in best]
    recent = session.exec(
        select(QuizAttempt)
        .where(QuizAttempt.learner_id == learner, QuizAttempt.course == course.slug)
        .order_by(col(QuizAttempt.created_at).desc())
        .limit(8)
    ).all()
    card_keys = {(u.slug, c.id) for u in course.units for c in u.deck.cards}
    return CourseStats(
        lessons_total=sum(len(u.lessons) for u in course.units),
        lessons_completed=sum(1 for u in course.units for l in u.lessons if (u.slug, l.slug) in done),
        quiz_units_total=len(quiz_units),
        quiz_units_attempted=len(attempted),
        quiz_average_best_percent=round(sum(attempted) / len(attempted), 1) if attempted else None,
        cards_total=len(card_keys),
        cards_learned=sum(1 for k, s in states.items() if k in card_keys and s.reps > 0),
        cards_due=due,
        recent_attempts=[
            AttemptItem(
                unit=a.unit,
                unit_title=titles.get(a.unit, a.unit),
                score=a.score,
                total=a.total,
                percent=progress.percent(a.score, a.total),
                created_at=a.created_at,
            )
            for a in recent
        ],
    )
