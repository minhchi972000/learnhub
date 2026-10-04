"""FastAPI application factory."""

from __future__ import annotations

import secrets
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .api import courses, flashcards, quizzes
from .config import Settings, get_settings
from .content import Catalog, ContentError, load_catalog
from .db import make_engine


def create_app(settings: Settings | None = None, catalog: Catalog | None = None) -> FastAPI:
    settings = settings or get_settings()
    docs = {} if settings.docs_enabled else {"docs_url": None, "redoc_url": None, "openapi_url": None}
    app = FastAPI(title="LearnHub API", version="0.1.0", **docs)
    app.state.settings = settings
    app.state.catalog = catalog or load_catalog(settings.content_dir)
    app.state.engine = make_engine(settings.database_url, reset=settings.reset_db_on_start)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["meta"])
    def health() -> dict[str, object]:
        return {"status": "ok", "env": settings.env, "courses": len(app.state.catalog.courses)}

    @app.post("/api/content/reload", tags=["meta"])
    def reload_content(x_admin_token: Annotated[str | None, Header()] = None) -> dict[str, object]:
        """Re-read content from disk; keeps the old catalog if the new one is invalid."""
        _check_admin(settings, x_admin_token)
        try:
            app.state.catalog = load_catalog(settings.content_dir)
        except ContentError as e:
            raise HTTPException(422, {"problems": e.problems}) from e
        return {"status": "reloaded", "courses": len(app.state.catalog.courses)}

    app.include_router(courses.router)
    app.include_router(quizzes.router)
    app.include_router(flashcards.router)

    _mount_frontend(app, settings.frontend_dist)
    return app


def _check_admin(settings: Settings, token: str | None) -> None:
    """Admin endpoints need X-Admin-Token when a token is configured; prod refuses them without one."""
    if settings.admin_token:
        if not (token and secrets.compare_digest(token.encode(), settings.admin_token.encode())):
            raise HTTPException(403, "invalid admin token")
    elif settings.env == "prod":
        raise HTTPException(403, "set LEARNHUB_ADMIN_TOKEN to enable admin endpoints")


def _mount_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built SPA (if any) with client-side-routing fallback to index.html."""
    index = dist / "index.html"
    if not index.is_file():
        return
    root = dist.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404)
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)
