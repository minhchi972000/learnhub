"""Runtime settings, overridable through LEARNHUB_* environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# backend/src/learnhub/config.py -> repo root is three parents up from this package.
REPO_ROOT = Path(__file__).resolve().parents[3]

# dev:  local development (Vite on :5173, /docs on, open content reload).
# demo: public try-out; the database is wiped on every start.
# prod: persistent data, no /docs, content reload needs LEARNHUB_ADMIN_TOKEN.
ENVIRONMENTS = ("dev", "demo", "prod")


@dataclass(frozen=True)
class Settings:
    content_dir: Path
    database_url: str
    frontend_dist: Path
    cors_origins: list[str]
    env: str = "dev"
    admin_token: str | None = None
    reset_db_on_start: bool = False

    @property
    def docs_enabled(self) -> bool:
        return self.env != "prod"


def get_settings() -> Settings:
    env = os.environ.get("LEARNHUB_ENV", "dev").strip().lower()
    if env not in ENVIRONMENTS:
        raise ValueError(f"LEARNHUB_ENV must be one of {', '.join(ENVIRONMENTS)}; got {env!r}")
    # Each non-dev environment gets its own data folder so demo resets never touch prod.
    default_data = REPO_ROOT / "data" if env == "dev" else REPO_ROOT / "data" / env
    data_dir = Path(os.environ.get("LEARNHUB_DATA_DIR", default_data))
    # Only dev needs CORS (Vite dev server); demo/prod serve the SPA from the same origin.
    default_cors = "http://localhost:5173" if env == "dev" else ""
    # DATABASE_URL is what hosted Postgres integrations (e.g. Neon on Vercel) inject.
    database_url = (
        os.environ.get("LEARNHUB_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or f"sqlite:///{(data_dir / 'learnhub.db').as_posix()}"
    )
    if os.environ.get("VERCEL") and database_url.startswith("sqlite"):
        raise ValueError("Vercel's filesystem is read-only: set DATABASE_URL (or LEARNHUB_DATABASE_URL) to Postgres")
    return Settings(
        content_dir=Path(os.environ.get("LEARNHUB_CONTENT_DIR", REPO_ROOT / "content")),
        database_url=normalize_database_url(database_url),
        frontend_dist=Path(os.environ.get("LEARNHUB_FRONTEND_DIST", REPO_ROOT / "frontend" / "dist")),
        cors_origins=[o for o in os.environ.get("LEARNHUB_CORS_ORIGINS", default_cors).split(",") if o],
        env=env,
        admin_token=os.environ.get("LEARNHUB_ADMIN_TOKEN") or None,
        # Serverless hosts (Vercel sets VERCEL=1) start instances at random times and run several at once,
        # so wiping on start would erase data mid-session; there the demo is reset with `learnhub reset-db`.
        reset_db_on_start=env == "demo" and not os.environ.get("VERCEL"),
    )


def normalize_database_url(url: str) -> str:
    """Point postgres:// and postgresql:// URLs at the psycopg 3 driver SQLAlchemy should use."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url.removeprefix(prefix)
    return url
