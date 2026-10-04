# LearnHub – architecture & plan

## Goals

1. Study one course well: read lessons, test yourself, keep vocabulary/structures in memory.
2. **Reusable:** any future course (TOEIC, HSK, …) is a content folder, not a code change.
3. Simple to run locally (one command), easy to grow (multi-user, deploy) later.

## Design decisions

| Decision | Why |
|----------|-----|
| Content as files (YAML + Markdown), learner state in SQLite | Content is versionable in git, editable in any editor and reviewable in PRs; the DB only holds what the learner did. |
| Pydantic schemas as the content contract + `learnhub validate` | Broken content is caught before runtime with *all* problems listed at once (file + field). |
| Quiz answers graded server-side | The quiz endpoint never sends answers/explanations; they are returned only after submission. |
| SM-2–style spaced repetition (again/hard/good/easy) | Proven, simple scheduling; per-card state in `CardState`. |
| `learner_id` column on every table, `X-Learner` header → default `local` | Single-user today; plugging in real auth later only changes `get_learner_id`. |
| FastAPI serves the built SPA | One process, one port in production; Vite dev server proxies `/api` in development. |
| React + TS + Tailwind | Typed API client mirrors backend schemas; utility CSS keeps components self-contained. |

## Backend (`backend/src/learnhub`)

```
config.py            env-driven Settings
content/schemas.py   Course / Unit / Lesson / Quiz (4 question types) / Flashcard models
content/loader.py    folder walker → Catalog, aggregated ContentError
models.py            LessonProgress, QuizAttempt, CardState (SQLModel)
db.py                engine + table creation
services/grading.py  per-type grading, text normalisation for fill-in answers
services/srs.py      scheduling
services/progress.py shared queries (completions, best scores, review queue)
api/                 deps (catalog, session, learner), schemas, routers
main.py              create_app() factory (+ SPA fallback)
cli.py               `learnhub validate|serve`
```

### HTTP API

| Method & path | Purpose |
|---------------|---------|
| `GET /api/courses` | Course list with progress |
| `GET /api/courses/{c}` | Units, lessons (+completed), quiz best score |
| `GET /api/courses/{c}/stats` | Dashboard numbers + recent attempts |
| `GET /api/courses/{c}/units/{u}/lessons/{l}` | Lesson markdown + prev/next across units |
| `PUT /api/courses/{c}/units/{u}/lessons/{l}/progress` | `{completed}` |
| `GET /api/courses/{c}/units/{u}/quiz` | Questions without answers |
| `POST /api/courses/{c}/units/{u}/quiz/attempts` | `{answers}` → score, per-question feedback |
| `GET /api/courses/{c}/flashcards/due?unit=&new_limit=` | Review queue: overdue first, then new |
| `POST /api/courses/{c}/flashcards/reviews` | `{unit, card_id, rating}` → next due date |
| `POST /api/content/reload` | Re-read content from disk |

Interactive docs: `http://127.0.0.1:8000/docs`.

## Frontend (`frontend/src`)

```
api/types.ts, api/client.ts   typed API layer
hooks/useApi.ts               fetch + loading/error/reload
components/                   Layout, Markdown, ui primitives
pages/                        Home, Course, Lesson, Quiz, Flashcards, NotFound
```

Routes: `/` · `/courses/:course` · `/courses/:course/units/:unit/lessons/:lesson` ·
`/courses/:course/units/:unit/quiz` · `/courses/:course/review?unit=`

## Delivery steps

1. ✅ Content schema + loader + validator CLI
2. ✅ Persistence, grading, SRS, API, tests
3. ✅ IELTS Writing Cơ Bản Plus 2 content (11 units)
4. ✅ Frontend pages and API wiring
5. ✅ Build, end-to-end check, docs

## Possible next steps

- Auth (replace `get_learner_id`) and per-user dashboards.
- Writing practice: submit an essay, self-check against the unit checklist (or AI feedback).
- Search across lessons; bookmarks/notes per lesson.
- Docker image / deploy (the app is a single process + SQLite file).
- Content tooling: import from CSV/Anki, per-question tags for weak-spot review.
