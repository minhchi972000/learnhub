import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const plugins = [remarkGfm]

/** Full lesson body with typographic styles. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-indigo-600 prose-blockquote:border-indigo-400 prose-blockquote:not-italic prose-table:text-sm prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:px-3 prose-td:px-3">
      <ReactMarkdown remarkPlugins={plugins}>{children}</ReactMarkdown>
    </div>
  )
}

/** Short snippets (quiz prompts, options, flashcards) rendered without block margins. */
export function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={plugins}
      components={{
        p: ({ children: c }) => <span className="[&+&]:mt-2 [&+&]:block">{c}</span>,
        code: ({ children: c }) => (
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] dark:bg-slate-800">{c}</code>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
