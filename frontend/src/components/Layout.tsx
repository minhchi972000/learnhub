import { Link, Outlet, ScrollRestoration } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
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
