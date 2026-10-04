# LearnHub

A small, content-driven self-study web app: **lessons → quizzes → spaced-repetition flashcards**,
with progress tracking. Courses are plain YAML + Markdown folders, so adding a new course needs
no code changes.

Shipped course: **IELTS Writing Cơ Bản Plus 2** (`content/courses/ielts-writing-co-ban-plus-2`).

| Layer    | Stack |
|----------|-------|
| Backend  | Python 3.12 · FastAPI · SQLModel/SQLite · uv · pytest |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · react-router |
| Content  | YAML + Markdown, validated by Pydantic ([docs/CONTENT_FORMAT.md](docs/CONTENT_FORMAT.md)) |

## Quick start (Windows PowerShell)

Requirements: [uv](https://docs.astral.sh/uv/) and Node.js 20+.

```powershell
# One-off: build the frontend, then serve API + UI on http://127.0.0.1:8000
./scripts/start.ps1

# Development: API with auto-reload (:8000) + Vite dev server (:5173, proxies /api)
./scripts/dev.ps1
```

Manual equivalent:

```powershell
cd backend;  uv sync; uv run learnhub serve --reload      # http://127.0.0.1:8000/docs for the API
cd frontend; npm install; npm run dev                      # http://localhost:5173
```

## Environments: dev, demo, prod

`LEARNHUB_ENV` selects the environment (default `dev`). Each one keeps its own database, so demo
resets never touch prod data.

| | `dev` | `demo` | `prod` |
|---|---|---|---|
| Script | `dev.ps1` / `start.ps1` | `serve.ps1 -Env demo` | `serve.ps1 -Env prod` |
| Port | 8000 (+ Vite 5173) | 8001 | 8000 |
| Database | `data/learnhub.db` | `data/demo/learnhub.db`, **wiped on every start** | `data/prod/learnhub.db`, kept |
| `/docs` (Swagger) | on | on | off |
| `POST /api/content/reload` | open | open | needs `X-Admin-Token` header |
| UI | – | yellow "DEMO" banner | – |

```powershell
./scripts/up.ps1                    # build once, start prod (:8000) + demo (:8001) in two windows
./scripts/serve.ps1 -Env prod       # or start one environment (builds the frontend first)
./scripts/serve.ps1 -Env demo -BindHost 0.0.0.0   # let other machines on the LAN reach the demo
```

Prod secrets live in `.env.prod` (git-ignored; copy `.env.prod.example`). `serve.ps1` loads
`.env.<env>` into the environment before starting. Reload content in prod with:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/content/reload -Headers @{ 'X-Admin-Token' = '<token>' }
```

## Hosting on Vercel (free)

`main` deploys to Production (prod) and the `demo` branch to Preview (demo), with Postgres on Neon
because Vercel's filesystem is read-only. Step-by-step setup: [docs/DEPLOY.md](docs/DEPLOY.md).
Vercel loads [app.py](app.py) and installs [requirements.txt](requirements.txt); [vercel.json](vercel.json)
builds the frontend. The demo database is reset on demand with `uv run learnhub reset-db --yes`.

## Everyday commands

| Task | Command (from `backend/`) |
|------|---------------------------|
| Validate all content | `uv run learnhub validate` |
| Run backend tests | `uv run pytest` |
| Reload content without restart | `POST /api/content/reload` |

Frontend (from `frontend/`): `npm run lint`, `npm run build`.

## Adding a course

1. Create `content/courses/<slug>/course.yaml` and `units/NN-<unit>/…` – see
   [docs/CONTENT_FORMAT.md](docs/CONTENT_FORMAT.md).
2. `uv run learnhub validate` until it prints `OK`.
3. Restart the server (or `POST /api/content/reload`).

## Project layout

```
learnhub/
├── backend/                 FastAPI app (src/learnhub) + tests
├── frontend/                React SPA (src/api, src/pages, src/components)
├── content/courses/         one folder per course
├── data/                    SQLite DBs: learnhub.db (dev), demo/, prod/ (git-ignored)
├── docs/                    PLAN.md (architecture), CONTENT_FORMAT.md, DEPLOY.md (Vercel)
└── scripts/                 start.ps1, dev.ps1, serve.ps1, up.ps1
```

## Configuration

Environment variables (all optional):

| Variable | Default |
|----------|---------|
| `LEARNHUB_ENV` | `dev` (one of `dev`, `demo`, `prod`) |
| `LEARNHUB_ADMIN_TOKEN` | unset (prod: admin endpoints disabled) |
| `LEARNHUB_CONTENT_DIR` | `<repo>/content` |
| `LEARNHUB_DATA_DIR` | `<repo>/data` (dev), `<repo>/data/<env>` otherwise |
| `LEARNHUB_DATABASE_URL` | `DATABASE_URL` if set, else `sqlite:///<data>/learnhub.db` |
| `LEARNHUB_FRONTEND_DIST` | `<repo>/frontend/dist` |
| `LEARNHUB_CORS_ORIGINS` | `http://localhost:5173` in dev, none otherwise |
