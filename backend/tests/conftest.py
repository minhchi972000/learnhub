from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from learnhub.config import Settings
from learnhub.main import create_app

FIXTURE_CONTENT = Path(__file__).parent / "fixtures" / "content"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        content_dir=FIXTURE_CONTENT,
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        frontend_dist=tmp_path / "no-frontend",
        cors_origins=[],
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
