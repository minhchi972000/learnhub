import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { api } from '../api/client'
import type { CardOut, DueCards, Rating } from '../api/types'
import { InlineMarkdown } from '../components/Markdown'
import { Breadcrumbs, ErrorState, Loading, ProgressBar } from '../components/ui'
import { useApi } from '../hooks/useApi'

const RATINGS: { rating: Rating; label: string; hint: string; key: string; tone: string }[] = [
  { rating: 'again', label: 'Quên', hint: '~10 phút', key: '1', tone: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' },
  { rating: 'hard', label: 'Khó', hint: 'sớm', key: '2', tone: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300' },
  { rating: 'good', label: 'Nhớ', hint: 'vài ngày', key: '3', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { rating: 'easy', label: 'Dễ', hint: 'lâu hơn', key: '4', tone: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300' },
]

export function FlashcardsPage() {
  const { course = '' } = useParams()
  const [params] = useSearchParams()
  const unit = params.get('unit') ?? undefined
  const due = useApi(() => api.getDueCards(course, unit), [course, unit])

  // Unmount the session while (re)loading so it always starts from fresh server data.
  if (due.loading) return <Loading />
  if (due.error) return <ErrorState error={due.error} onRetry={due.reload} />
  const data = due.data!
  const scope = unit ? (data.cards[0]?.unit_title ?? unit) : 'Toàn khóa'

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Khóa học', to: '/' },
          { label: 'Lộ trình', to: `/courses/${course}` },
          { label: `Flashcard · ${scope}` },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Ôn flashcard</h1>
        <p className="text-sm text-slate-500">
          {data.due_count} đến hạn · {data.new_count} thẻ mới
        </p>
      </div>
      <ReviewSession course={course} due={data} onReload={due.reload} />
    </div>
  )
}

function ReviewSession({ course, due, onReload }: { course: string; due: DueCards; onReload: () => void }) {
  // Local queue for this session: cards rated "again" go back to the end.
  const [queue, setQueue] = useState<CardOut[]>(due.cards)
  const [reviewed, setReviewed] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const card = queue[0]

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return
      setBusy(true)
      setError(null)
      try {
        await api.reviewCard(course, card.unit, card.id, rating)
        setQueue((q) => (rating === 'again' ? [...q.slice(1), q[0]] : q.slice(1)))
        setReviewed((n) => n + 1)
        setFlipped(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [busy, card, course],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped) {
        const r = RATINGS.find((x) => x.key === e.key)
        if (r) void rate(r.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, rate])

  if (!card) {
    return (
      <div className="card mt-8 p-10 text-center">
        <p className="text-4xl">🎉</p>
        <p className="mt-3 text-lg font-semibold">
          {reviewed > 0 ? `Xong phiên ôn tập – ${reviewed} lượt!` : 'Không còn thẻ nào cần ôn lúc này.'}
        </p>
        <p className="mt-1 text-sm text-slate-500">Quay lại sau để ôn các thẻ đến hạn.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-secondary" onClick={onReload}>
            Tải lại
          </button>
          <Link className="btn-primary" to={`/courses/${course}`}>
            Về lộ trình
          </Link>
        </div>
      </div>
    )
  }

  const total = reviewed + queue.length
  return (
    <>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>{card.unit_title}</span>
          <span className="tabular-nums">
            {reviewed}/{total}
          </span>
        </div>
        <ProgressBar value={(100 * reviewed) / total} />
      </div>

      <button
        type="button"
        onClick={() => setFlipped(true)}
        className="card mt-6 flex min-h-64 w-full cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 flex-col items-center justify-center p-8 text-center"
      >
        {card.is_new && (
          <span className="mb-4 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Thẻ mới
          </span>
        )}
        <div className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white">
          <InlineMarkdown>{card.front}</InlineMarkdown>
        </div>
        {flipped ? (
          <div className="mt-6 w-full border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="text-lg text-indigo-700 dark:text-indigo-300">
              <InlineMarkdown>{card.back}</InlineMarkdown>
            </div>
            {card.example && (
              <div className="mt-4 text-sm text-slate-500 italic">
                <InlineMarkdown>{card.example}</InlineMarkdown>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-400">Bấm vào thẻ hoặc nhấn Space để lật</p>
        )}
      </button>

      {flipped && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              disabled={busy}
              onClick={() => rate(r.rating)}
              className={`btn flex-col gap-0 border py-3 ${r.tone}`}
            >
              <span>{r.label}</span>
              <span className="text-[11px] font-normal opacity-70">
                {r.hint} · phím {r.key}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-600">Không lưu được: {error}</p>}
    </>
  )
}
