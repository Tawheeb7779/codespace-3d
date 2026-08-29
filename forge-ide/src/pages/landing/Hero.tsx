import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(246,84,15,0.18),transparent)]"
      />

      <div className="mx-auto max-w-4xl text-center">
        <div className="animate-fade-in mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-graphite-800 bg-graphite-900/60 px-3 py-1 text-xs text-graphite-400">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
          Real in-browser runtime · real AI agent · no fake demos
        </div>

        <h1 className="animate-slide-up text-4xl font-semibold tracking-tight text-graphite-50 sm:text-6xl">
          Write, run, and ship code
          <br className="hidden sm:block" /> without leaving the browser.
        </h1>

        <p className="animate-slide-up mx-auto mt-6 max-w-2xl text-balance text-lg text-graphite-400">
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

      <div className="animate-slide-up mx-auto mt-16 max-w-5xl">
        <ProductPreview />
      </div>
    </section>
  )
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-graphite-800 bg-graphite-900 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-1.5 border-b border-graphite-800 bg-graphite-850 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
        <span className="ml-3 text-xs text-graphite-500">forge-ide — src/App.tsx</span>
      </div>
      <div className="grid grid-cols-[160px_1fr_220px] text-left text-xs">
        <div className="hidden border-r border-graphite-800 p-3 text-graphite-500 sm:block">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-graphite-600">Explorer</p>
          {['src/', 'App.tsx', 'main.tsx', 'components/', 'package.json'].map((f) => (
            <p key={f} className="truncate py-0.5">
              {f}
            </p>
          ))}
        </div>
        <pre className="overflow-x-auto p-4 font-mono leading-relaxed text-graphite-300">
{`export default function App() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}`}
        </pre>
        <div className="hidden border-l border-graphite-800 p-3 text-graphite-500 md:block">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-graphite-600">Preview</p>
          <div className="rounded-md border border-graphite-800 bg-graphite-950 p-3">
            <div className="inline-flex rounded border border-graphite-700 px-2 py-1 text-graphite-300">Count: 3</div>
          </div>
        </div>
      </div>
    </div>
  )
}
