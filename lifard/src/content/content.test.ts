import { describe, expect, it } from 'vitest'
import { CATEGORIES, projects } from '@/content/work'
import { process, services, testimonials } from '@/content/studio'
import { PLATE_MOTIFS } from '@/graphics/Plate'
import { nav, SECTION_IDS } from '@/content/site'

/**
 * The content files are edited by hand, most likely by someone who is not a
 * developer. These guard the assumptions the layout quietly makes about them.
 */

describe('projects', () => {
  it('gives every plate a unique number', () => {
    const plates = projects.map((p) => p.plate)
    expect(new Set(plates).size).toBe(plates.length)
  })

  it('only uses motifs the drawing set actually has', () => {
    for (const project of projects) {
      expect(PLATE_MOTIFS).toContain(project.motif)
    }
  })

  it('only tags projects with known disciplines, and always includes its own category', () => {
    for (const project of projects) {
      expect(CATEGORIES).toContain(project.category)
      for (const tag of project.tags) expect(CATEGORIES).toContain(tag)
      // The archive filters on tags, so a project must be findable under the
      // discipline it is filed as.
      expect(project.tags).toContain(project.category)
    }
  })

  it('has a case note on every project — the index has nothing to show without one', () => {
    for (const project of projects) {
      expect(project.note.length).toBeGreaterThan(40)
      expect(project.scope.trim()).not.toBe('')
      expect(project.location.trim()).not.toBe('')
    }
  })
})

describe('services and process', () => {
  it('numbers services in order with no gaps', () => {
    services.forEach((service, i) => {
      expect(service.index).toBe(String(i + 1).padStart(2, '0'))
    })
  })

  it('states what each service actually delivers', () => {
    for (const service of services) {
      expect(service.includes.length).toBeGreaterThan(0)
      expect(PLATE_MOTIFS).toContain(service.motif)
    }
  })

  it('runs the process 01 through 05, each ending in something the client receives', () => {
    expect(process).toHaveLength(5)
    process.forEach((step, i) => {
      expect(step.index).toBe(String(i + 1).padStart(2, '0'))
      expect(step.output.trim()).not.toBe('')
    })
  })

  it('attributes every testimonial', () => {
    for (const item of testimonials) {
      expect(item.attribution.trim()).not.toBe('')
      expect(item.context.trim()).not.toBe('')
    }
  })
})

describe('navigation', () => {
  it('exposes one section id per nav item', () => {
    expect(SECTION_IDS).toEqual(nav.map((item) => item.id))
    expect(new Set(SECTION_IDS).size).toBe(SECTION_IDS.length)
  })
})
