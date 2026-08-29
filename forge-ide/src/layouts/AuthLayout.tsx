import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold text-graphite-100">
          <Flame size={18} className="text-ember-500" /> Forge IDE
        </Link>
        <div className="rounded-2xl border border-graphite-800 bg-graphite-900/60 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-graphite-50">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-graphite-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
