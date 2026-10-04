from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlmodel import Session

from ..content import Catalog
from ..content.schemas import Course, Unit

DEFAULT_LEARNER = "local"


def get_catalog(request: Request) -> Catalog:
    return request.app.state.catalog


def get_session(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session


def get_learner_id(x_learner: Annotated[str | None, Header()] = None) -> str:
    """Single-user for now; swap this for real auth to go multi-user."""
    return (x_learner or DEFAULT_LEARNER).strip()[:64] or DEFAULT_LEARNER


CatalogDep = Annotated[Catalog, Depends(get_catalog)]
SessionDep = Annotated[Session, Depends(get_session)]
LearnerDep = Annotated[str, Depends(get_learner_id)]


def get_course(course: str, catalog: CatalogDep) -> Course:
    found = catalog.course(course)
    if found is None:
        raise HTTPException(404, f"Course '{course}' not found")
    return found


CourseDep = Annotated[Course, Depends(get_course)]


def get_unit(unit: str, course: CourseDep) -> Unit:
    found = course.unit(unit)
    if found is None:
        raise HTTPException(404, f"Unit '{unit}' not found")
    return found


UnitDep = Annotated[Unit, Depends(get_unit)]
