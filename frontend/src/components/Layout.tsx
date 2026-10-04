import { Link, Outlet, ScrollRestoration } from 'react-router'

import { api } from '../api/client'
import { useApi } from '../hooks/useApi'

export function Layout() {
  const { data: health } = useApi(api.health, [])

  return (
    <div className="flex min-h-dvh flex-col">
      {health?.env === 'demo' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 print:hidden py-1.5 text-center text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          Bản demo · tiến độ học có thể bị xoá bất cứ lúc nào
        </div>
      )}
      <header className="sticky top-0 z-20 print:hidden border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <span className="grid size-7 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white">LH</span>
            LearnHub
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12 print:py-0">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
