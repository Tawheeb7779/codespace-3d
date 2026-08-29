import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Menu, X } from 'lucide-react'
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
    <header className="sticky top-0 z-40 border-b border-graphite-800/80 bg-graphite-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold text-graphite-50">
          <Flame size={20} className="text-ember-500" />
          Forge IDE
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-graphite-400 transition-colors hover:text-graphite-100">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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

        <button className="p-2 text-graphite-300 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-graphite-800 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-graphite-300" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex gap-3">
              <Link to="/login" className="flex-1">
                <Button variant="ghost" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  Start Building
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
