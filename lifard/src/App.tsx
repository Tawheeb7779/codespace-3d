import { useState } from 'react'
import { projects } from '@/content/work'
import { Lightbox } from '@/components/Lightbox'
import { Nav } from '@/sections/Nav'
import { Hero } from '@/sections/Hero'
import { Work } from '@/sections/Work'
import { Statement } from '@/sections/Statement'
import { Services } from '@/sections/Services'
import { Interlude } from '@/sections/Interlude'
import { Process } from '@/sections/Process'
import { Gallery } from '@/sections/Gallery'
import { Studio } from '@/sections/Studio'
import { Testimonials } from '@/sections/Testimonials'
import { Contact } from '@/sections/Contact'
import { Footer } from '@/sections/Footer'

/**
 * The page's rhythm is the point: paper, night, paper, night. Each ground
 * change is a section boundary you feel before you read anything, and it
 * tracks the studio's own arc — drawing to room, and back to the table.
 */
export function App() {
  const [openPlate, setOpenPlate] = useState<number | null>(null)

  return (
    <>
      <Nav />

      <main>
        <Hero />
        <Work onOpen={setOpenPlate} />
        <Statement />
        <Services />
        <Interlude />
        <Process />
        <Gallery onOpen={setOpenPlate} />
        <Studio />
        <Testimonials />
        <Contact />
      </main>

      <Footer />

      <Lightbox
        projects={projects}
        index={openPlate}
        onClose={() => setOpenPlate(null)}
        onNavigate={setOpenPlate}
      />
    </>
  )
}
