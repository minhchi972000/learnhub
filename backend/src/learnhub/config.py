"""Runtime settings, overridable through LEARNHUB_* environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# backend/src/learnhub/config.py -> repo root is three parents up from this package.
REPO_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class Settings:
    content_dir: Path
    database_url: str
    frontend_dist: Path
    cors_origins: list[str]


def get_settings() -> Settings:
    data_dir = Path(os.environ.get("LEARNHUB_DATA_DIR", REPO_ROOT / "data"))
    return Settings(
        content_dir=Path(os.environ.get("LEARNHUB_CONTENT_DIR", REPO_ROOT / "content")),
        database_url=os.environ.get("LEARNHUB_DATABASE_URL", f"sqlite:///{(data_dir / 'learnhub.db').as_posix()}"),
        frontend_dist=Path(os.environ.get("LEARNHUB_FRONTEND_DIST", REPO_ROOT / "frontend" / "dist")),
        cors_origins=[o for o in os.environ.get("LEARNHUB_CORS_ORIGINS", "http://localhost:5173").split(",") if o],
    )
