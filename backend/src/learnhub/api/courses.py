"""Course catalog, lessons and lesson progress."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from ..content.schemas import Course
from ..models import LessonProgress, utcnow
from ..services import progress
from .deps import CatalogDep, CourseDep, LearnerDep, SessionDep, UnitDep
from .schemas import (
    CompleteIn,
    CourseDetail,
    CourseSummary,
    LessonDetail,
    LessonItem,
    LessonNav,
    UnitSummary,
)

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CourseSummary])
def list_courses(catalog: CatalogDep, session: SessionDep, learner: LearnerDep) -> list[CourseSummary]:
    now = utcnow()
    out = []
    for course in catalog.courses.values():
        done = progress.completed_lessons(session, learner, course.slug)
        states = progress.card_states(session, learner, course.slug)
        _, due, _ = progress.review_queue(course, states, now)
        out.append(
            CourseSummary(
                slug=course.slug,
                title=course.title,
                description=course.description,
                level=course.level,
                tags=course.tags,
                unit_count=len(course.units),
                lesson_count=_lesson_count(course),
                completed_lessons=_count_existing(course, done),
                card_count=sum(len(u.deck.cards) for u in course.units),
                cards_due=due,
            )
        )
    return out


@router.get("/{course}", response_model=CourseDetail)
def get_course(course: CourseDep, session: SessionDep, learner: LearnerDep) -> CourseDetail:
    done = progress.completed_lessons(session, learner, course.slug)
    best = progress.best_percent_by_unit(session, learner, course.slug)
    units = [
        UnitSummary(
            slug=u.slug,
            order=u.order,
            title=u.title,
            summary=u.summary,
            lessons=[LessonItem(slug=l.slug, title=l.title, completed=(u.slug, l.slug) in done) for l in u.lessons],
            question_count=len(u.quiz.questions),
            best_percent=best.get(u.slug),
            card_count=len(u.deck.cards),
        )
        for u in course.units
    ]
    return CourseDetail(
        slug=course.slug,
        title=course.title,
        description=course.description,
        level=course.level,
        tags=course.tags,
        source=course.source,
        lesson_count=_lesson_count(course),
        completed_lessons=_count_existing(course, done),
        units=units,
    )


@router.get("/{course}/units/{unit}/lessons/{lesson}", response_model=LessonDetail)
def get_lesson(
    course: CourseDep, unit: UnitDep, lesson: str, session: SessionDep, learner: LearnerDep
) -> LessonDetail:
    flat = [(u, l) for u in course.units for l in u.lessons]
    idx = next((i for i, (u, l) in enumerate(flat) if u.slug == unit.slug and l.slug == lesson), None)
    if idx is None:
        raise HTTPException(404, f"Lesson '{lesson}' not found")
    u, l = flat[idx]

    def nav(i: int) -> LessonNav | None:
        if 0 <= i < len(flat):
            nu, nl = flat[i]
            return LessonNav(unit=nu.slug, lesson=nl.slug, title=nl.title)
        return None

    done = progress.completed_lessons(session, learner, course.slug)
    return LessonDetail(
        course=course.slug,
        course_title=course.title,
        unit=u.slug,
        unit_title=u.title,
        slug=l.slug,
        title=l.title,
        markdown=l.markdown,
        completed=(u.slug, l.slug) in done,
        prev=nav(idx - 1),
        next=nav(idx + 1),
    )


@router.put("/{course}/units/{unit}/lessons/{lesson}/progress", response_model=LessonItem)
def set_lesson_progress(
    course: CourseDep, unit: UnitDep, lesson: str, body: CompleteIn, session: SessionDep, learner: LearnerDep
) -> LessonItem:
    found = next((l for l in unit.lessons if l.slug == lesson), None)
    if found is None:
        raise HTTPException(404, f"Lesson '{lesson}' not found")
    row = session.exec(
        select(LessonProgress).where(
            LessonProgress.learner_id == learner,
            LessonProgress.course == course.slug,
            LessonProgress.unit == unit.slug,
            LessonProgress.lesson == lesson,
        )
    ).first()
    if body.completed and row is None:
        session.add(LessonProgress(learner_id=learner, course=course.slug, unit=unit.slug, lesson=lesson))
    elif not body.completed and row is not None:
        session.delete(row)
    session.commit()
    return LessonItem(slug=found.slug, title=found.title, completed=body.completed)


def _lesson_count(course: Course) -> int:
    return sum(len(u.lessons) for u in course.units)


def _count_existing(course: Course, done: set[tuple[str, str]]) -> int:
    """Count completions that still match a lesson (content may have been edited since)."""
    return sum(1 for u in course.units for l in u.lessons if (u.slug, l.slug) in done)
