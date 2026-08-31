import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'AI', href: '#ai' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/docs' },
]

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="surface-shell sticky top-0 z-40 border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500/12 ring-1 ring-inset ring-ember-500/20">
            <Flame size={16} className="text-ember-400" />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-[-0.016em] text-graphite-50">Forge IDE</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-graphite-400 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button variant="primary" size="sm">
              Start Building
            </Button>
          </Link>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-graphite-300 transition-colors duration-150 hover:bg-surface-hover md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* Mounted only while open so the entrance animation replays every
          time, rather than a hidden/visible toggle on an always-mounted
          block. */}
      {open && (
        <div className="animate-slide-up border-t border-hairline px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium text-graphite-300',
                  'transition-[background-color,transform] duration-150 ease-out',
                  'active:scale-[0.98] motion-reduce:active:scale-100 hover:bg-surface-hover',
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex gap-2.5">
            <Link to="/login" className="flex-1">
              <Button variant="outline" size="lg" touch className="w-full">
                Sign In
              </Button>
            </Link>
            <Link to="/signup" className="flex-1">
              <Button variant="primary" size="lg" touch className="w-full">
                Start Building
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
