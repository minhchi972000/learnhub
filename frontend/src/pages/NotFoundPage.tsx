import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="mt-3 text-slate-500">Không tìm thấy trang này.</p>
      <Link to="/" className="btn-primary mt-6">
        Về trang chủ
      </Link>
    </div>
  )
}
