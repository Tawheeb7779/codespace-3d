import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-4 text-center">
      <p className="text-sm font-medium text-ember-500">404</p>
      <h1 className="font-display text-2xl font-semibold tracking-[-0.015em] text-graphite-50">Page not found</h1>
      <Link to="/">
        <Button variant="primary">Back home</Button>
      </Link>
    </div>
  )
}
