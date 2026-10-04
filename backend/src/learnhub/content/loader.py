"""Load and validate course content from the filesystem.

Layout (see docs/CONTENT_FORMAT.md):

    <content_dir>/courses/<course>/course.yaml
    <content_dir>/courses/<course>/units/NN-<unit>/unit.yaml
    <content_dir>/courses/<course>/units/NN-<unit>/lessons/*.md
    <content_dir>/courses/<course>/units/NN-<unit>/quiz.yaml        (optional)
    <content_dir>/courses/<course>/units/NN-<unit>/flashcards.yaml  (optional)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from .schemas import SLUG_RE, Course, CourseMeta, Deck, Lesson, Quiz, Unit, UnitMeta

UNIT_DIR_RE = re.compile(r"^(\d+)-(.+)$")


class ContentError(Exception):
    """Raised when content fails validation; `problems` lists every issue found."""

    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__(f"{len(problems)} content problem(s):\n" + "\n".join(f"  - {p}" for p in problems))


@dataclass
class Catalog:
    courses: dict[str, Course] = field(default_factory=dict)

    def course(self, slug: str) -> Course | None:
        return self.courses.get(slug)


def load_catalog(content_dir: Path) -> Catalog:
    """Load every course; raise ContentError listing all problems at once."""
    courses_dir = content_dir / "courses"
    problems: list[str] = []
    catalog = Catalog()
    if not courses_dir.is_dir():
        raise ContentError([f"{courses_dir}: folder not found"])

    for course_dir in sorted(p for p in courses_dir.iterdir() if p.is_dir()):
        course = _load_course(course_dir, problems)
        if course is not None:
            catalog.courses[course.slug] = course

    if problems:
        raise ContentError(problems)
    return catalog


def _load_course(course_dir: Path, problems: list[str]) -> Course | None:
    slug = course_dir.name
    if not SLUG_RE.match(slug):
        problems.append(f"{course_dir}: folder name is not a valid slug")
        return None

    meta = _parse(course_dir / "course.yaml", CourseMeta, problems, required=True)
    if meta is None:
        return None

    units: list[Unit] = []
    units_dir = course_dir / "units"
    unit_dirs = sorted(p for p in units_dir.iterdir() if p.is_dir()) if units_dir.is_dir() else []
    if not unit_dirs:
        problems.append(f"{course_dir}: no units found in units/")
    for unit_dir in unit_dirs:
        unit = _load_unit(unit_dir, problems)
        if unit is not None:
            units.append(unit)

    seen: set[str] = set()
    for u in units:
        if u.slug in seen:
            problems.append(f"{course_dir}: duplicate unit slug '{u.slug}'")
        seen.add(u.slug)
    units.sort(key=lambda u: u.order)

    try:
        return Course(slug=slug, units=units, **meta.model_dump())
    except ValidationError as e:
        problems.extend(_format(course_dir, e))
        return None


def _load_unit(unit_dir: Path, problems: list[str]) -> Unit | None:
    m = UNIT_DIR_RE.match(unit_dir.name)
    if not m or not SLUG_RE.match(m.group(2)):
        problems.append(f"{unit_dir}: folder must be named 'NN-<slug>'")
        return None
    order, slug = int(m.group(1)), m.group(2)

    meta = _parse(unit_dir / "unit.yaml", UnitMeta, problems, required=True)
    if meta is None:
        return None
    quiz = _parse(unit_dir / "quiz.yaml", Quiz, problems) or Quiz()
    deck = _parse(unit_dir / "flashcards.yaml", Deck, problems) or Deck()

    lessons: list[Lesson] = []
    for ref in meta.lessons:
        path = unit_dir / "lessons" / ref.file
        if not path.is_file():
            problems.append(f"{path}: lesson file not found")
            continue
        lessons.append(Lesson(slug=ref.slug, title=ref.title, markdown=path.read_text(encoding="utf-8")))

    try:
        return Unit(slug=slug, order=order, title=meta.title, summary=meta.summary,
                    lessons=lessons, quiz=quiz, deck=deck)
    except ValidationError as e:
        problems.extend(_format(unit_dir, e))
        return None


def _parse(path: Path, model: type, problems: list[str], required: bool = False) -> Any:
    if not path.is_file():
        if required:
            problems.append(f"{path}: file not found")
        return None
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        problems.append(f"{path}: invalid YAML: {e}")
        return None
    try:
        return model.model_validate(data)
    except ValidationError as e:
        problems.extend(_format(path, e))
        return None


def _format(where: Path, err: ValidationError) -> list[str]:
    out = []
    for e in err.errors():
        loc = ".".join(str(x) for x in e["loc"])
        out.append(f"{where}: {loc}: {e['msg']}")
    return out
