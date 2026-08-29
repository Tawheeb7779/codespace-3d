import { Nav } from '@/pages/landing/Nav'
import { Hero } from '@/pages/landing/Hero'
import { Features } from '@/pages/landing/Features'
import { Workflow } from '@/pages/landing/Workflow'
import { Integrations } from '@/pages/landing/Integrations'
import { Pricing } from '@/pages/landing/Pricing'
import { FinalCta } from '@/pages/landing/FinalCta'
import { Footer } from '@/pages/landing/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-graphite-950">
      <Nav />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Integrations />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
