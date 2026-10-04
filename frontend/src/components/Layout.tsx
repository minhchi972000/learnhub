import { Link, Outlet, ScrollRestoration } from 'react-router'

import { api } from '../api/client'
import { useApi } from '../hooks/useApi'

export function Layout() {
  const { data: health } = useApi(api.health, [])

  return (
    <div className="flex min-h-dvh flex-col">
      {health?.env === 'demo' && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          Bản DEMO – tiến độ học có thể bị xoá bất cứ lúc nào.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">LH</span>
            LearnHub
          </Link>
          <span className="text-xs text-slate-500">Học – Luyện – Ôn tập</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
        LearnHub · nội dung đọc từ <code>content/courses</code>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
