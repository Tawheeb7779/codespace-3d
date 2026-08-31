import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function FinalCta() {
  return (
    <section id="ai" className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-semibold tracking-[-0.015em] text-graphite-50 sm:text-4xl">Your next project starts in the browser</h2>
      <p className="mx-auto mt-4 max-w-xl text-graphite-400">No install. No setup. Open a tab and start writing real, running code.</p>
      <Link to="/signup" className="mt-8 inline-block">
        <Button variant="primary" size="lg">
          Start Building Free <ArrowRight size={16} />
        </Button>
      </Link>
    </section>
  )
}
