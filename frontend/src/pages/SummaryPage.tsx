import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { api } from '../api/client'
import type { DeckCard, DeckUnit } from '../api/types'
import { InlineMarkdown } from '../components/Markdown'
import { Breadcrumbs, CheckIcon, ErrorState, Loading } from '../components/ui'
import { useApi } from '../hooks/useApi'

/** Lower-case, accent-free, markdown-free text so "dong tu" finds "**động từ**". */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[*_`]/g, '')
    .toLowerCase()
}

const searchText = (c: DeckCard) => fold(`${c.front} ${c.back} ${c.example}`)

/** Knowledge summary: every flashcard of the course as a searchable, printable glossary. */
export function SummaryPage() {
  const { course = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const unitFilter = params.get('unit') ?? ''
  const [query, setQuery] = useState('')
  const deck = useApi(() => api.getAllCards(course), [course])

  const index = useMemo(
    () => (deck.data ?? []).map((u) => ({ unit: u, texts: u.cards.map(searchText) })),
    [deck.data],
  )

  if (deck.loading && !deck.data) return <Loading />
  if (deck.error) return <ErrorState error={deck.error} onRetry={deck.reload} />
  const units = deck.data!

  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown: DeckUnit[] = index
    .filter(({ unit }) => !unitFilter || unit.slug === unitFilter)
    .map(({ unit, texts }) => ({ ...unit, cards: unit.cards.filter((_, i) => words.every((w) => texts[i].includes(w))) }))
    .filter((u) => u.cards.length > 0)

  const total = units.reduce((n, u) => n + u.cards.length, 0)
  const learned = units.reduce((n, u) => n + u.cards.filter((c) => c.learned).length, 0)
  const matches = shown.reduce((n, u) => n + u.cards.length, 0)
  const filtering = words.length > 0 || unitFilter !== ''

  function selectUnit(slug: string) {
    setParams(slug ? { unit: slug } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { label: 'Khóa học', to: '/' },
            { label: 'Lộ trình', to: `/courses/${course}` },
          ]}
        />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tổng hợp kiến thức</h1>
      <p className="mt-1 text-sm text-slate-500">
        {total} mục · {units.length} unit · {learned} đã thuộc
      </p>

      <div className="sticky top-14 z-10 -mx-4 mt-6 bg-slate-50/95 px-4 py-3 backdrop-blur print:hidden dark:bg-slate-950/95">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thuật ngữ, cấu trúc, ví dụ…"
            aria-label="Tìm kiếm"
            className="min-w-0 flex-1 basis-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-900"
          />
          <select
            value={unitFilter}
            onChange={(e) => selectUnit(e.target.value)}
            aria-label="Lọc theo unit"
            className="max-w-full min-w-0 flex-1 basis-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 sm:flex-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">Tất cả unit</option>
            {units.map((u) => (
              <option key={u.slug} value={u.slug}>
                {String(u.order).padStart(2, '0')} · {u.title}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => window.print()}>
            In / PDF
          </button>
        </div>
        {filtering && (
          <p className="mt-2 text-xs text-slate-500">
            {matches} kết quả
            <button
              className="ml-2 cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => {
                setQuery('')
                selectUnit('')
              }}
            >
              Xoá lọc
            </button>
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-slate-500">Không tìm thấy mục nào khớp.</p>
      ) : (
        <div className="mt-4 space-y-8">
          {shown.map((u) => (
            <section key={u.slug} className="break-inside-avoid-page">
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span className="text-slate-400 tabular-nums">{String(u.order).padStart(2, '0')}</span>
                {u.title}
              </h2>
              <dl className="card divide-y divide-slate-200 dark:divide-slate-800">
                {u.cards.map((c) => (
                  <Entry key={c.id} card={c} />
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Entry({ card }: { card: DeckCard }) {
  return (
    <div className="grid gap-1 px-4 py-3 break-inside-avoid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6 sm:px-5">
      <dt className="flex items-start gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
        <span className="min-w-0">
          <InlineMarkdown>{card.front}</InlineMarkdown>
        </span>
        {card.learned && (
          <span className="mt-0.5 text-emerald-600 dark:text-emerald-400" title="Đã thuộc">
            <CheckIcon className="size-3.5" />
          </span>
        )}
      </dt>
      <dd className="min-w-0 text-sm text-slate-700 dark:text-slate-300">
        <InlineMarkdown>{card.back}</InlineMarkdown>
        {card.example && (
          <div className="mt-1 text-slate-500 italic">
            <InlineMarkdown>{card.example}</InlineMarkdown>
          </div>
        )}
      </dd>
    </div>
  )
}
