from __future__ import annotations

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from learnhub.cli import main as cli
from learnhub.config import REPO_ROOT, Settings, get_settings, normalize_database_url
from learnhub.main import create_app

LESSON = "/api/courses/demo-course/units/basics/lessons/intro"
ENV_VARS = (
    "LEARNHUB_ENV",
    "LEARNHUB_DATA_DIR",
    "LEARNHUB_DATABASE_URL",
    "DATABASE_URL",
    "LEARNHUB_CORS_ORIGINS",
    "LEARNHUB_ADMIN_TOKEN",
    "VERCEL",
)


@pytest.fixture
def clean_env(monkeypatch: pytest.MonkeyPatch) -> pytest.MonkeyPatch:
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    return monkeypatch


def test_settings_per_environment(clean_env: pytest.MonkeyPatch):
    dev = get_settings()
    assert dev.env == "dev" and dev.cors_origins == ["http://localhost:5173"] and not dev.reset_db_on_start
    assert dev.database_url.endswith("/data/learnhub.db")

    clean_env.setenv("LEARNHUB_ENV", "Prod")
    prod = get_settings()
    assert prod.env == "prod" and prod.cors_origins == [] and not prod.docs_enabled
    assert prod.database_url == f"sqlite:///{(REPO_ROOT / 'data' / 'prod' / 'learnhub.db').as_posix()}"

    clean_env.setenv("LEARNHUB_ENV", "demo")
    assert get_settings().reset_db_on_start
    clean_env.setenv("VERCEL", "1")
    with pytest.raises(ValueError, match="read-only"):
        get_settings()
    clean_env.setenv("DATABASE_URL", "postgresql://u:p@neon.tech/db")
    assert not get_settings().reset_db_on_start

    clean_env.setenv("LEARNHUB_ENV", "staging")
    with pytest.raises(ValueError, match="LEARNHUB_ENV"):
        get_settings()


def test_hosted_database_url(clean_env: pytest.MonkeyPatch):
    clean_env.setenv("DATABASE_URL", "postgresql://u:p@neon.tech/db?sslmode=require")
    assert get_settings().database_url == "postgresql+psycopg://u:p@neon.tech/db?sslmode=require"
    clean_env.setenv("LEARNHUB_DATABASE_URL", "postgres://u:p@other/db")
    assert get_settings().database_url == "postgresql+psycopg://u:p@other/db"
    assert normalize_database_url("sqlite:///x.db") == "sqlite:///x.db"


def test_reset_db_cli(clean_env: pytest.MonkeyPatch, settings: Settings):
    clean_env.setenv("LEARNHUB_DATABASE_URL", settings.database_url)
    clean_env.setenv("LEARNHUB_ENV", "demo")
    client = TestClient(create_app(settings))
    client.put(f"{LESSON}/progress", json={"completed": True})

    assert cli(["reset-db"]) == 1  # needs --yes
    assert client.get(LESSON).json()["completed"] is True
    assert cli(["reset-db", "--yes"]) == 0
    assert client.get(LESSON).json()["completed"] is False

    clean_env.setenv("LEARNHUB_ENV", "prod")
    assert cli(["reset-db", "--yes"]) == 1


def test_learners_are_isolated(client: TestClient):
    client.put(f"{LESSON}/progress", json={"completed": True}, headers={"X-Learner": "alice"})
    assert client.get(LESSON, headers={"X-Learner": "alice"}).json()["completed"] is True
    assert client.get(LESSON, headers={"X-Learner": "bob"}).json()["completed"] is False


def test_demo_resets_progress_on_restart(settings: Settings):
    demo = replace(settings, env="demo", reset_db_on_start=True)
    client = TestClient(create_app(demo))
    assert client.get("/api/health").json()["env"] == "demo"
    client.put(f"{LESSON}/progress", json={"completed": True})
    assert client.get(LESSON).json()["completed"] is True

    restarted = TestClient(create_app(demo))
    assert restarted.get(LESSON).json()["completed"] is False


def test_prod_keeps_progress_on_restart(settings: Settings):
    prod = replace(settings, env="prod")
    TestClient(create_app(prod)).put(f"{LESSON}/progress", json={"completed": True})
    assert TestClient(create_app(prod)).get(LESSON).json()["completed"] is True


def test_prod_hides_docs(settings: Settings):
    assert TestClient(create_app(settings)).get("/docs").status_code == 200
    prod = TestClient(create_app(replace(settings, env="prod")))
    assert prod.get("/docs").status_code == 404
    assert prod.get("/openapi.json").status_code == 404


def test_content_reload_admin_token(settings: Settings):
    reload = "/api/content/reload"
    assert TestClient(create_app(settings)).post(reload).status_code == 200

    prod_no_token = TestClient(create_app(replace(settings, env="prod")))
    assert prod_no_token.post(reload).status_code == 403

    prod = TestClient(create_app(replace(settings, env="prod", admin_token="s3cret")))
    assert prod.post(reload).status_code == 403
    assert prod.post(reload, headers={"X-Admin-Token": "wrong"}).status_code == 403
    assert prod.post(reload, headers={"X-Admin-Token": "s3cret"}).status_code == 200
