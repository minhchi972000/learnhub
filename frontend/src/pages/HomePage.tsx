import { Link } from 'react-router'
import { api } from '../api/client'
import { ErrorState, Loading, ProgressBar } from '../components/ui'
import { useApi } from '../hooks/useApi'

export function HomePage() {
  const { data, error, loading, reload } = useApi(() => api.listCourses(), [])

  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Khóa học của bạn</h1>
      <p className="mt-2 text-slate-500">Chọn một khóa học để tiếp tục hành trình.</p>

      {data?.length === 0 && (
        <div className="card mt-8 p-8 text-center text-slate-500">
          Chưa có khóa học nào. Thêm một thư mục vào <code>content/courses/</code> để bắt đầu.
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {data?.map((c) => {
          const pct = c.lesson_count ? (100 * c.completed_lessons) / c.lesson_count : 0
          return (
            <Link
              key={c.slug}
              to={`/courses/${c.slug}`}
              className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white">
                {c.title}
              </h2>
              {c.level && <p className="mt-1 text-sm font-medium text-slate-500">{c.level}</p>}
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                  <span>
                    {c.completed_lessons}/{c.lesson_count} bài · {c.unit_count} unit
                  </span>
                  {c.cards_due > 0 && <span className="font-medium text-amber-600">{c.cards_due} thẻ cần ôn</span>}
                </div>
                <ProgressBar value={pct} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
