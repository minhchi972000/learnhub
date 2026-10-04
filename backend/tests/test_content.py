from __future__ import annotations

from pathlib import Path
from textwrap import dedent

import pytest

from learnhub.config import get_settings
from learnhub.content import ContentError, load_catalog

from .conftest import FIXTURE_CONTENT


def test_fixture_course_loads_in_order():
    course = load_catalog(FIXTURE_CONTENT).course("demo-course")
    assert course is not None
    assert [u.slug for u in course.units] == ["basics", "more"]
    assert [l.slug for l in course.units[0].lessons] == ["intro", "second"]
    assert course.units[0].lessons[0].markdown.startswith("## Hello")
    assert len(course.units[0].quiz.questions) == 4
    assert course.units[1].quiz.questions == []  # quiz.yaml is optional


def _write(root: Path, rel: str, text: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dedent(text), encoding="utf-8")


def test_all_problems_are_reported_together(tmp_path: Path):
    base = "courses/bad-course"
    _write(tmp_path, f"{base}/course.yaml", "title: Bad\n")
    _write(tmp_path, f"{base}/units/01-a/unit.yaml", "title: A\nlessons:\n  - {slug: x, title: X, file: missing.md}\n")
    _write(
        tmp_path,
        f"{base}/units/01-a/quiz.yaml",
        """
        questions:
          - {id: q1, type: single, prompt: P, options: [a, b], answer: 5}
          - {id: q1, type: true_false, prompt: P, answer: true}
        """,
    )
    _write(tmp_path, f"{base}/units/Bad_Name/unit.yaml", "title: B\n")

    with pytest.raises(ContentError) as exc:
        load_catalog(tmp_path)
    text = "\n".join(exc.value.problems)
    assert "missing.md" in text
    assert "out of range" in text
    assert "Bad_Name" in text


def test_real_content_is_valid():
    """The shipped content must always validate (skipped until content exists)."""
    content_dir = get_settings().content_dir
    if not any((content_dir / "courses").glob("*/units/*/unit.yaml")):
        pytest.skip("no real content yet")
    catalog = load_catalog(content_dir)
    assert catalog.courses
