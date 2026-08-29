import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { PRICING_PLANS } from '@/features/pricing/plans'

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-graphite-50 sm:text-4xl">Simple, transparent pricing</h2>
        <p className="mt-4 text-graphite-400">Start free. Upgrade when your team needs more.</p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={clsx(
              'flex flex-col rounded-2xl border p-6',
              plan.highlighted ? 'border-ember-500/50 bg-ember-500/[0.04] ring-1 ring-ember-500/20' : 'border-graphite-800 bg-graphite-900/40',
            )}
          >
            <h3 className="text-sm font-medium uppercase tracking-wide text-graphite-400">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-graphite-50">{plan.price}</span>
              <span className="text-sm text-graphite-500">{plan.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-graphite-500">{plan.description}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-graphite-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-signal-green" />
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/signup" className="mt-6">
              <Button variant={plan.highlighted ? 'primary' : 'outline'} className="w-full">
                {plan.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
