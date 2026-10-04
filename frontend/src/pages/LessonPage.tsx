import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api/client'
import { Markdown } from '../components/Markdown'
import { Breadcrumbs, CheckIcon, ErrorState, Loading } from '../components/ui'
import { useApi } from '../hooks/useApi'

export function LessonPage() {
  const { course = '', unit = '', lesson = '' } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi(
    () => api.getLesson(course, unit, lesson),
    [course, unit, lesson],
  )
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && data?.slug !== lesson) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const l = data!

  const coursePath = `/courses/${course}`
  const lessonPath = (u: string, s: string) => `${coursePath}/units/${u}/lessons/${s}`
  const nextIsNewUnit = l.next && l.next.unit !== l.unit

  async function setCompleted(completed: boolean, thenGo?: string) {
    setSaving(true)
    setActionError(null)
    try {
      await api.setLessonProgress(course, unit, lesson, completed)
      if (thenGo) navigate(thenGo)
      else reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Khóa học', to: '/' },
          { label: l.course_title, to: coursePath },
          { label: l.unit_title },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">{l.title}</h1>
        {l.completed && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckIcon /> Đã hoàn thành
          </p>
        )}
      </header>

      <div className="card p-5 sm:p-8">
        <Markdown>{l.markdown}</Markdown>
      </div>

      {actionError && <p className="mt-4 text-sm text-rose-600">Không lưu được tiến độ: {actionError}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {l.prev && (
            <Link className="btn-ghost" to={lessonPath(l.prev.unit, l.prev.lesson)}>
              ← Bài trước
            </Link>
          )}
          {l.completed && (
            <button className="btn-ghost" disabled={saving} onClick={() => setCompleted(false)}>
              Bỏ đánh dấu
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {nextIsNewUnit && (
            <Link className="btn-secondary" to={`${coursePath}/units/${l.unit}/quiz`}>
              Làm quiz unit này
            </Link>
          )}
          {l.next ? (
            <button
              className="btn-primary"
              disabled={saving}
              onClick={() => setCompleted(true, lessonPath(l.next!.unit, l.next!.lesson))}
            >
              {l.completed ? 'Bài tiếp' : 'Hoàn thành & học tiếp'} →
            </button>
          ) : (
            <button className="btn-primary" disabled={saving} onClick={() => setCompleted(true, coursePath)}>
              Hoàn thành khóa học 🎉
            </button>
          )}
        </div>
      </div>
      {l.next && (
        <p className="mt-3 text-right text-xs text-slate-500">
          Tiếp theo: {nextIsNewUnit ? 'Unit mới – ' : ''}
          {l.next.title}
        </p>
      )}
    </article>
  )
}
