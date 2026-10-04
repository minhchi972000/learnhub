import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../api/client'
import type { AnswerValue, PublicQuestion, QuestionResult, QuizResult } from '../api/types'
import { InlineMarkdown, Markdown } from '../components/Markdown'
import { Breadcrumbs, ErrorState, Loading, ProgressBar } from '../components/ui'
import { scoreColor } from '../lib/score'
import { useApi } from '../hooks/useApi'

const TYPE_HINT: Record<PublicQuestion['type'], string> = {
  single: 'Chọn 1 đáp án',
  multi: 'Chọn tất cả đáp án đúng',
  true_false: 'Đúng hay sai?',
  fill: 'Điền vào chỗ trống',
}

export function QuizPage() {
  const { course = '', unit = '' } = useParams()
  const quiz = useApi(() => api.getQuiz(course, unit), [course, unit])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (quiz.loading && !quiz.data) return <Loading />
  if (quiz.error) return <ErrorState error={quiz.error} onRetry={quiz.reload} />
  const q = quiz.data!
  const answered = q.questions.filter((x) => isAnswered(answers[x.id])).length
  const byId = new Map(result?.results.map((r) => [r.id, r]))

  async function submit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      setResult(await api.submitQuiz(course, unit, answers))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function retry() {
    setAnswers({})
    setResult(null)
    quiz.reload()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Khóa học', to: '/' },
          { label: 'Lộ trình', to: `/courses/${course}` },
          { label: `Quiz · ${q.unit_title}` },
        ]}
      />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz: {q.unit_title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {q.questions.length} câu · đã làm {q.attempts} lần
        {q.best_percent != null && ` · cao nhất ${Math.round(q.best_percent)}%`}
      </p>

      {result && <ResultBanner result={result} course={course} unit={unit} onRetry={retry} />}

      {q.questions.length === 0 && <div className="card mt-6 p-8 text-center text-slate-500">Unit này chưa có câu hỏi.</div>}

      <ol className="mt-6 space-y-5">
        {q.questions.map((question, i) => (
          <QuestionCard
            key={question.id}
            index={i}
            question={question}
            value={answers[question.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))}
            result={byId.get(question.id)}
          />
        ))}
      </ol>

      {!result && q.questions.length > 0 && (
        <div className="sticky bottom-4 mt-8">
          <div className="card flex flex-wrap items-center gap-4 p-4 shadow-lg">
            <div className="min-w-40 flex-1">
              <p className="mb-1.5 text-sm text-slate-500">
                Đã trả lời {answered}/{q.questions.length}
              </p>
              <ProgressBar value={(100 * answered) / q.questions.length} />
            </div>
            <button className="btn-primary" disabled={submitting || answered === 0} onClick={submit}>
              {submitting ? 'Đang chấm…' : 'Nộp bài'}
            </button>
          </div>
          {submitError && <p className="mt-2 text-sm text-rose-600">{submitError}</p>}
        </div>
      )}
    </div>
  )
}

function ResultBanner({
  result,
  course,
  unit,
  onRetry,
}: {
  result: QuizResult
  course: string
  unit: string
  onRetry: () => void
}) {
  const message =
    result.percent >= 80 ? 'Xuất sắc! 🎉' : result.percent >= 50 ? 'Khá tốt, xem lại các câu sai nhé.' : 'Cần ôn lại bài học.'
  return (
    <div className="card mt-6 flex flex-wrap items-center gap-6 p-6">
      <div className={`text-5xl font-bold tabular-nums ${scoreColor(result.percent)}`}>{Math.round(result.percent)}%</div>
      <div className="flex-1">
        <p className="font-semibold">
          Đúng {result.score}/{result.total} câu
        </p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onRetry}>
          Làm lại
        </button>
        <Link className="btn-secondary" to={`/courses/${course}/review?unit=${unit}`}>
          Ôn flashcard
        </Link>
        <Link className="btn-ghost" to={`/courses/${course}`}>
          Về lộ trình
        </Link>
      </div>
    </div>
  )
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
  result,
}: {
  index: number
  question: PublicQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  result: QuestionResult | undefined
}) {
  const locked = result !== undefined
  const border = !result
    ? ''
    : result.correct
      ? 'border-emerald-400 dark:border-emerald-700'
      : 'border-rose-400 dark:border-rose-700'

  return (
    <li className={`card p-5 sm:p-6 ${border}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold dark:bg-slate-800">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{TYPE_HINT[question.type]}</p>
          <div className="mt-1 font-medium text-slate-900 dark:text-white">
            <InlineMarkdown>{question.prompt}</InlineMarkdown>
          </div>
          <div className="mt-4">
            <AnswerInput question={question} value={value} onChange={onChange} locked={locked} result={result} />
          </div>
          {result && <Feedback question={question} result={result} />}
        </div>
      </div>
    </li>
  )
}

function AnswerInput({
  question,
  value,
  onChange,
  locked,
  result,
}: {
  question: PublicQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
  result: QuestionResult | undefined
}) {
  if (question.type === 'fill') {
    return (
      <input
        type="text"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900"
        placeholder="Nhập câu trả lời…"
        value={typeof value === 'string' ? value : ''}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  const options: { label: string; value: number | boolean }[] =
    question.type === 'true_false'
      ? [
          { label: 'Đúng', value: true },
          { label: 'Sai', value: false },
        ]
      : (question.options ?? []).map((label, i) => ({ label, value: i }))

  const isSelected = (v: number | boolean) =>
    question.type === 'multi' ? Array.isArray(value) && value.includes(v as number) : value === v

  const isCorrectOption = (v: number | boolean) => {
    if (!result) return false
    const ca = result.correct_answer
    return Array.isArray(ca) ? (ca as unknown[]).includes(v) : ca === v
  }

  function toggle(v: number | boolean) {
    if (question.type === 'multi') {
      const cur = Array.isArray(value) ? value : []
      const n = v as number
      onChange(cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b))
    } else {
      onChange(v)
    }
  }

  return (
    <div className={question.type === 'true_false' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
      {options.map((o) => {
        const selected = isSelected(o.value)
        let tone = selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        if (locked) {
          if (isCorrectOption(o.value)) tone = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
          else if (selected) tone = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
          else tone = 'border-slate-200 opacity-60 dark:border-slate-800'
        }
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={locked}
            onClick={() => toggle(o.value)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-sm transition disabled:cursor-default ${tone}`}
          >
            {question.type !== 'true_false' && (
              <span
                className={`grid size-5 shrink-0 place-items-center border-2 ${
                  question.type === 'multi' ? 'rounded-md' : 'rounded-full'
                } ${selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
              >
                {selected && <span className="size-1.5 rounded-full bg-white" />}
              </span>
            )}
            <span className="flex-1">
              <InlineMarkdown>{o.label}</InlineMarkdown>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Feedback({ question, result }: { question: PublicQuestion; result: QuestionResult }) {
  const answerText =
    question.type === 'fill' && Array.isArray(result.correct_answer)
      ? (result.correct_answer as string[]).join(' / ')
      : null
  return (
    <div
      className={`mt-4 rounded-xl p-4 text-sm ${
        result.correct
          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
      }`}
    >
      <p className="font-semibold">{result.correct ? '✓ Chính xác' : '✗ Chưa đúng'}</p>
      {answerText && !result.correct && (
        <p className="mt-1">
          Đáp án: <b>{answerText}</b>
        </p>
      )}
      {result.explanation && (
        <div className="mt-2 text-slate-700 dark:text-slate-300 [&_.prose]:text-sm">
          <Markdown>{result.explanation}</Markdown>
        </div>
      )}
    </div>
  )
}

function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  return true
}
