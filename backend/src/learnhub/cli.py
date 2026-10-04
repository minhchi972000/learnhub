"""Command line entry point: `learnhub validate` and `learnhub serve`."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .config import get_settings
from .content import ContentError, load_catalog


def main(argv: list[str] | None = None) -> int:
    # Content is mostly non-ASCII; don't crash on legacy Windows console code pages.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(prog="learnhub")
    sub = parser.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("validate", help="validate course content and print a summary")
    v.add_argument("--content-dir", type=Path, default=None)

    s = sub.add_parser("serve", help="run the API (and the built frontend, if present)")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8000)
    s.add_argument("--reload", action="store_true")

    args = parser.parse_args(argv)
    if args.cmd == "validate":
        return _validate(args.content_dir or get_settings().content_dir)
    if args.cmd == "serve":
        import uvicorn

        uvicorn.run("learnhub.main:create_app", factory=True, host=args.host, port=args.port, reload=args.reload)
        return 0
    return 1


def _validate(content_dir: Path) -> int:
    try:
        catalog = load_catalog(content_dir)
    except ContentError as e:
        print(e, file=sys.stderr)
        return 1
    for course in catalog.courses.values():
        lessons = sum(len(u.lessons) for u in course.units)
        questions = sum(len(u.quiz.questions) for u in course.units)
        cards = sum(len(u.deck.cards) for u in course.units)
        print(f"OK {course.slug}: {len(course.units)} units, {lessons} lessons, {questions} questions, {cards} cards")
        for u in course.units:
            print(f"   {u.order:02d} {u.slug}: {len(u.lessons)} lessons, {len(u.quiz.questions)} q, {len(u.deck.cards)} cards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
