import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [{ label: 'Documentation', href: '/docs' }],
  },
  {
    title: 'Company',
    links: [{ label: 'About', href: '/docs#about' }],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Security', href: '/legal/security' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-graphite-800 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-medium uppercase tracking-wide text-graphite-500">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-graphite-400 hover:text-graphite-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-graphite-800 pt-6 sm:flex-row">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-graphite-300">
            <Flame size={16} className="text-ember-500" /> Forge IDE
          </Link>
          <p className="text-xs text-graphite-600">© {new Date().getFullYear()} Forge IDE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
