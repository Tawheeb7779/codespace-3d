import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="animate-slide-up w-full max-w-sm">
        <Link
          to="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-graphite-100 transition-opacity hover:opacity-80"
        >
          <Flame size={18} className="text-ember-500" />
          Forge IDE
        </Link>

        <div className="rounded-2xl border border-graphite-800 bg-graphite-900/60 p-6 shadow-xl shadow-black/20 sm:p-8">
          <header className="mb-7">
            <h1 className="text-2xl font-semibold text-graphite-50">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-graphite-500">{subtitle}</p>}
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
