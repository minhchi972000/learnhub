import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../api/client'
import type { CourseDetail, UnitSummary } from '../api/types'
import { Breadcrumbs, CheckIcon, ErrorState, Loading, ProgressBar, StatTile } from '../components/ui'
import { scoreColor } from '../lib/score'
import { useApi } from '../hooks/useApi'

export function CoursePage() {
  const { course = '' } = useParams()
  const detail = useApi(() => api.getCourse(course), [course])
  const stats = useApi(() => api.getStats(course), [course])

  if (detail.loading && !detail.data) return <Loading />
  if (detail.error) return <ErrorState error={detail.error} onRetry={detail.reload} />
  const c = detail.data!
  const s = stats.data
  const pct = c.lesson_count ? (100 * c.completed_lessons) / c.lesson_count : 0
  const next = firstIncomplete(c)

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: 'Khóa học', to: '/' }, { label: c.title }]} />

      <header>
        {c.level && <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{c.level}</p>}
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">{c.title}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">{c.description}</p>
      </header>

      <section className="card mt-8">
        <div className="p-5 sm:p-6">
          <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium text-slate-900 dark:text-white">Tiến độ</span>
            <span className="text-slate-500 tabular-nums">
              {c.completed_lessons}/{c.lesson_count} bài · {Math.round(pct)}%
            </span>
          </div>
          <ProgressBar value={pct} />
          {next && (
            <p className="mt-4 truncate text-sm text-slate-500">
              Tiếp theo: <span className="text-slate-700 dark:text-slate-300">{next.title}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {next && (
              <Link to={`/courses/${c.slug}/units/${next.unit}/lessons/${next.lesson}`} className="btn-primary">
                {c.completed_lessons === 0 ? 'Bắt đầu học' : 'Học tiếp'}
              </Link>
            )}
            <Link to={`/courses/${c.slug}/review`} className="btn-secondary">
              Ôn flashcard
              {s && s.cards_due > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {s.cards_due}
                </span>
              )}
            </Link>
            <Link to={`/courses/${c.slug}/summary`} className="btn-secondary">
              Tổng hợp kiến thức
            </Link>
          </div>
        </div>
        {s && (
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            <StatTile
              label="Điểm quiz TB"
              value={
                <span className={s.quiz_average_best_percent == null ? 'text-slate-400' : scoreColor(s.quiz_average_best_percent)}>
                  {s.quiz_average_best_percent == null ? '–' : `${Math.round(s.quiz_average_best_percent)}%`}
                </span>
              }
              hint={`${s.quiz_units_attempted}/${s.quiz_units_total} unit`}
            />
            <StatTile label="Thẻ đã thuộc" value={`${s.cards_learned}/${s.cards_total}`} />
            <StatTile label="Thẻ đến hạn" value={s.cards_due} hint="ôn mỗi ngày" />
          </div>
        )}
      </section>

      <h2 className="mt-12 mb-3 text-lg font-semibold text-slate-900 dark:text-white">Lộ trình</h2>
      <ol className="card divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
        {c.units.map((u) => (
          <UnitRow key={u.slug} course={c.slug} unit={u} defaultOpen={u.slug === next?.unit} />
        ))}
      </ol>

      {c.source && <p className="mt-10 text-center text-xs text-slate-400">Nguồn: {c.source}</p>}
    </div>
  )
}

function UnitRow({ course, unit, defaultOpen }: { course: string; unit: UnitSummary; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = unit.lessons.filter((l) => l.completed).length
  const complete = unit.lessons.length > 0 && done === unit.lessons.length

  return (
    <li>
      <button
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 sm:px-6 dark:hover:bg-slate-800/40"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          className={`w-6 shrink-0 text-sm font-medium tabular-nums ${
            complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
          }`}
        >
          {complete ? <CheckIcon className="size-5" /> : String(unit.order).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-slate-900 dark:text-white">{unit.title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {done}/{unit.lessons.length} bài
            {unit.best_percent != null && (
              <>
                {' · quiz '}
                <span className={scoreColor(unit.best_percent)}>{Math.round(unit.best_percent)}%</span>
              </>
            )}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`size-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 sm:pr-6 sm:pl-[3.75rem]">
          {unit.summary && <p className="mb-3 text-sm text-slate-500">{unit.summary}</p>}
          <ul>
            {unit.lessons.map((l) => (
              <li key={l.slug}>
                <Link
                  to={`/courses/${course}/units/${unit.slug}/lessons/${l.slug}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full ${
                      l.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {l.completed && <CheckIcon className="size-3" />}
                  </span>
                  <span className={l.completed ? 'text-slate-500' : 'text-slate-700 dark:text-slate-300'}>{l.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          {(unit.question_count > 0 || unit.card_count > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {unit.question_count > 0 && (
                <Link to={`/courses/${course}/units/${unit.slug}/quiz`} className="btn-secondary px-3 py-1.5">
                  Quiz · {unit.question_count} câu
                </Link>
              )}
              {unit.card_count > 0 && (
                <>
                  <Link to={`/courses/${course}/review?unit=${unit.slug}`} className="btn-ghost px-3 py-1.5">
                    {unit.card_count} flashcard
                  </Link>
                  <Link to={`/courses/${course}/summary?unit=${unit.slug}`} className="btn-ghost px-3 py-1.5">
                    Tổng hợp
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function firstIncomplete(c: CourseDetail): { unit: string; lesson: string; title: string } | null {
  for (const u of c.units)
    for (const l of u.lessons) if (!l.completed) return { unit: u.slug, lesson: l.slug, title: l.title }
  return null
}
