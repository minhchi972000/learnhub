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
    <div>
      <Breadcrumbs items={[{ label: 'Khóa học', to: '/' }, { label: c.title }]} />

      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white sm:p-8">
          {c.level && <p className="text-sm font-medium text-indigo-100">{c.level}</p>}
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.title}</h1>
          <p className="mt-3 max-w-2xl text-indigo-50">{c.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {next && (
              <Link
                to={`/courses/${c.slug}/units/${next.unit}/lessons/${next.lesson}`}
                className="btn bg-white text-indigo-700 hover:bg-indigo-50"
              >
                {c.completed_lessons === 0 ? 'Bắt đầu học' : 'Học tiếp'} → {next.title}
              </Link>
            )}
            <Link to={`/courses/${c.slug}/review`} className="btn bg-indigo-500/40 text-white hover:bg-indigo-500/60">
              Ôn flashcard{s && s.cards_due > 0 ? ` (${s.cards_due} đến hạn)` : ''}
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Tiến độ</span>
            <span className="text-slate-500 tabular-nums">
              {c.completed_lessons}/{c.lesson_count} bài · {Math.round(pct)}%
            </span>
          </div>
          <ProgressBar value={pct} />
        </div>
      </section>

      {s && (
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Bài đã học" value={`${s.lessons_completed}/${s.lessons_total}`} />
          <StatTile
            label="Điểm quiz TB"
            value={
              <span className={scoreColor(s.quiz_average_best_percent)}>
                {s.quiz_average_best_percent == null ? '–' : `${Math.round(s.quiz_average_best_percent)}%`}
              </span>
            }
            hint={`${s.quiz_units_attempted}/${s.quiz_units_total} unit đã làm`}
          />
          <StatTile label="Thẻ đã thuộc" value={`${s.cards_learned}/${s.cards_total}`} />
          <StatTile label="Thẻ đến hạn" value={s.cards_due} hint="Ôn đều mỗi ngày để nhớ lâu" />
        </section>
      )}

      <h2 className="mt-10 mb-4 text-xl font-bold text-slate-900 dark:text-white">Lộ trình</h2>
      <ol className="space-y-4">
        {c.units.map((u) => (
          <UnitCard key={u.slug} course={c.slug} unit={u} defaultOpen={u.slug === next?.unit} />
        ))}
      </ol>

      {c.source && <p className="mt-10 text-center text-xs text-slate-500">Nguồn: {c.source}</p>}
    </div>
  )
}

function UnitCard({ course, unit, defaultOpen }: { course: string; unit: UnitSummary; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = unit.lessons.filter((l) => l.completed).length
  const complete = unit.lessons.length > 0 && done === unit.lessons.length

  return (
    <li className="card">
      <button
        className="flex w-full cursor-pointer items-start gap-4 p-5 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
            complete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
          }`}
        >
          {complete ? <CheckIcon className="size-5" /> : String(unit.order).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900 dark:text-white">{unit.title}</span>
          {unit.summary && <span className="mt-0.5 block text-sm text-slate-500">{unit.summary}</span>}
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              {done}/{unit.lessons.length} bài
            </span>
            {unit.question_count > 0 && (
              <span>
                Quiz {unit.question_count} câu
                {unit.best_percent != null && (
                  <b className={`ml-1 ${scoreColor(unit.best_percent)}`}>· cao nhất {Math.round(unit.best_percent)}%</b>
                )}
              </span>
            )}
            {unit.card_count > 0 && <span>{unit.card_count} flashcard</span>}
          </span>
        </span>
        <span className={`mt-2 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pt-3 pb-5 dark:border-slate-800">
          <ul className="space-y-1">
            {unit.lessons.map((l, i) => (
              <li key={l.slug}>
                <Link
                  to={`/courses/${course}/units/${unit.slug}/lessons/${l.slug}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                      l.completed
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-300 text-slate-400 dark:border-slate-600'
                    }`}
                  >
                    {l.completed ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className={l.completed ? 'text-slate-500' : ''}>{l.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {unit.question_count > 0 && (
              <Link to={`/courses/${course}/units/${unit.slug}/quiz`} className="btn-primary">
                Làm quiz
              </Link>
            )}
            {unit.card_count > 0 && (
              <Link to={`/courses/${course}/review?unit=${unit.slug}`} className="btn-secondary">
                Flashcard unit này
              </Link>
            )}
          </div>
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
