import { Link } from 'react-router'
import { api } from '../api/client'
import { ErrorState, Loading, ProgressBar } from '../components/ui'
import { useApi } from '../hooks/useApi'

export function HomePage() {
  const { data, error, loading, reload } = useApi(() => api.listCourses(), [])

  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Khóa học</h1>

      {data?.length === 0 && (
        <p className="card mt-6 p-8 text-center text-sm text-slate-500">
          Chưa có khóa học nào. Thêm một thư mục vào <code>content/courses/</code> để bắt đầu.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {data?.map((c) => {
          const pct = c.lesson_count ? (100 * c.completed_lessons) / c.lesson_count : 0
          return (
            <li key={c.slug}>
              <Link
                to={`/courses/${c.slug}`}
                className="card group block p-5 transition hover:border-indigo-300 sm:p-6 dark:hover:border-indigo-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white">{c.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {[c.level, `${c.unit_count} unit`, `${c.lesson_count} bài`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {c.completed_lessons === 0 ? 'Bắt đầu' : 'Học tiếp'} →
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={pct} />
                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">{Math.round(pct)}%</span>
                </div>
                {c.cards_due > 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-600">{c.cards_due} thẻ đến hạn ôn</p>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
