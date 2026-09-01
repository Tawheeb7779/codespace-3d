import type { PlateMotif } from '@/graphics/Plate'
import type { Photo } from '@/components/Figure'

export interface Project {
  /** Plate number. Stable — it appears on the drawing and in the index. */
  plate: string
  name: string
  category: Category
  location: string
  year: number
  /** Real scope figure. Shown as an annotation, so it must mean something. */
  scope: string
  /** One sentence on the design problem and what was drawn to solve it. */
  note: string
  motif: PlateMotif
  /** Add this the day the shoot lands — see src/content/README.md. */
  photo?: Photo
  /** Every discipline this project involved. Drives the archive filter. */
  tags: readonly Category[]
}

export const CATEGORIES = [
  'Weddings',
  'Engagements',
  'Receptions',
  'Outdoor',
  'Tables',
  'Stages',
  'Florals',
  'Entrances',
] as const

export type Category = (typeof CATEGORIES)[number]

export const projects: Project[] = [
  {
    plate: 'P-01',
    name: 'The Long Table',
    category: 'Tables',
    location: 'Jeddah',
    year: 2025,
    scope: '180 covers · one run',
    note: 'One uninterrupted table instead of eighteen rounds, so nobody spent the evening at the edge of it. Drawn at 1:50 before a single chair was hired.',
    motif: 'table',
    tags: ['Tables', 'Receptions', 'Weddings'],
  },
  {
    plate: 'P-02',
    name: 'Nocturne',
    category: 'Weddings',
    location: 'Dubai',
    year: 2025,
    scope: '420 guests · 2 rooms',
    note: 'A ballroom taken down to candlelight and brass. We removed every fixture the venue had installed and lit the room from the tables up.',
    motif: 'hall',
    tags: ['Weddings', 'Receptions', 'Stages'],
  },
  {
    plate: 'P-03',
    name: 'Orangery',
    category: 'Outdoor',
    location: 'Marrakech',
    year: 2024,
    scope: '260 guests · garden',
    note: 'Citrus, olive and beeswax under an open sky. The plan followed the existing trees rather than clearing them.',
    motif: 'bloom',
    tags: ['Outdoor', 'Florals', 'Weddings'],
  },
  {
    plate: 'P-04',
    name: 'Kosha No. 9',
    category: 'Stages',
    location: 'Riyadh',
    year: 2025,
    scope: '5.3 m span',
    note: 'A stage built as architecture, not as decoration: three drape planes, a stepped riser, and light that reads from the last row.',
    motif: 'stage',
    tags: ['Stages', 'Weddings'],
  },
  {
    plate: 'P-05',
    name: 'Salt & Silver',
    category: 'Receptions',
    location: 'Muscat',
    year: 2024,
    scope: '300 guests · coastal',
    note: 'A reception on limestone, forty metres from the water. Everything specified to survive wind and still look weightless.',
    motif: 'plot',
    tags: ['Receptions', 'Outdoor', 'Tables'],
  },
  {
    plate: 'P-06',
    name: 'First Light',
    category: 'Engagements',
    location: 'Beirut',
    year: 2024,
    scope: '90 guests · rooftop',
    note: 'An engagement that began at dusk and ended in full dark, so the lighting plot was drawn as a sequence rather than a state.',
    motif: 'plot',
    tags: ['Engagements', 'Outdoor'],
  },
  {
    plate: 'P-07',
    name: 'The Approach',
    category: 'Entrances',
    location: 'Doha',
    year: 2025,
    scope: '64 seats · 22 m walk',
    note: 'Guests arrive before they sit down. We designed the twenty-two metres they walk first, and the ceremony followed from it.',
    motif: 'aisle',
    tags: ['Entrances', 'Weddings'],
  },
  {
    plate: 'P-08',
    name: 'Winter Bloom',
    category: 'Florals',
    location: 'Lake Como',
    year: 2023,
    scope: '8 installations',
    note: 'Eight installations built from branch structure first and flowered second, which is why they held their shape for eleven hours.',
    motif: 'arch',
    tags: ['Florals', 'Entrances', 'Weddings'],
  },
]
