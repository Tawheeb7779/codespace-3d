import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Files, GitBranch, Play, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8">
      <div className="ambient-glow" aria-hidden />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="animate-fade-in mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-raised/60 px-3.5 py-1.5 text-xs font-medium text-graphite-400">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
          Real in-browser runtime · real AI agent · no fake demos
        </div>

        <h1 className="animate-slide-up font-display text-[2.75rem] font-semibold leading-[1.06] tracking-[-0.018em] text-graphite-50 sm:text-6xl">
          Write, run, and ship code
          <br className="hidden sm:block" /> without leaving the browser.
        </h1>

        <p className="animate-slide-up mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-graphite-400">
          Forge IDE is a complete development environment — editor, terminal, live preview, and an AI
          agent that can actually read, write, and run your code — built for the way modern teams ship.
        </p>

        <div className="animate-slide-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/signup">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Start Building Free <ArrowRight size={16} />
            </Button>
          </Link>
          <a href="#workflow">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Play size={16} /> See how it works
            </Button>
          </a>
        </div>
      </div>

      <div className="animate-slide-up relative mx-auto mt-16 max-w-5xl">
        <ProductPreview />
      </div>
    </section>
  )
}

/**
 * A composed mockup of our own chrome — the left rail's icon language, an
 * ember-accented active tab, and the preview panel's device toggles —
 * rather than a generic "some code editor" screenshot. The first thing a
 * visitor sees should already look like the product they're about to open.
 */
function ProductPreview() {
  return (
    <div className="surface-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1.5 border-b border-hairline bg-surface-raised/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="ml-3 text-xs text-graphite-500">forge-ide — src/App.tsx</span>
      </div>
      <div className="flex text-left text-xs">
        <div className="hidden w-11 shrink-0 flex-col items-center gap-2 border-r border-hairline py-3 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-ember-400">
            <Files size={14} />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite-600">
            <Search size={14} />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite-600">
            <GitBranch size={14} />
          </span>
        </div>
        <div className="hidden w-36 shrink-0 border-r border-hairline p-3 text-graphite-500 md:block">
          <p className="mb-2 type-label text-graphite-600">Explorer</p>
          {['src/', 'App.tsx', 'main.tsx', 'components/', 'package.json'].map((f) => (
            <p key={f} className="truncate py-0.5">
              {f}
            </p>
          ))}
        </div>
        <pre className="flex-1 overflow-x-auto p-4 font-mono leading-relaxed text-graphite-300">
{`export default function App() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}`}
        </pre>
        <div className="hidden w-52 shrink-0 border-l border-hairline p-3 text-graphite-500 lg:block">
          <div className="mb-3 flex items-center gap-1.5 text-graphite-600">
            <Bot size={12} className="text-ember-500" />
            <p className="type-label text-graphite-600">AI Assistant</p>
          </div>
          <div className="rounded-lg bg-surface-hover/60 p-2.5 text-[11px] leading-relaxed text-graphite-400">
            Add a reset button next to the counter?
          </div>
          <div className="mt-2 rounded-lg border border-ember-500/20 bg-ember-500/[0.06] p-2.5 text-[11px] leading-relaxed text-graphite-300">
            Done — added a Reset button that sets count back to 0.
          </div>
        </div>
      </div>
    </div>
  )
}
