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
├── data/                    SQLite DB (created on first run, git-ignored)
├── docs/                    PLAN.md (architecture), CONTENT_FORMAT.md
└── scripts/                 start.ps1, dev.ps1
```

## Configuration

Environment variables (all optional):

| Variable | Default |
|----------|---------|
| `LEARNHUB_CONTENT_DIR` | `<repo>/content` |
| `LEARNHUB_DATA_DIR` | `<repo>/data` |
| `LEARNHUB_DATABASE_URL` | `sqlite:///<data>/learnhub.db` |
| `LEARNHUB_FRONTEND_DIST` | `<repo>/frontend/dist` |
| `LEARNHUB_CORS_ORIGINS` | `http://localhost:5173` |
