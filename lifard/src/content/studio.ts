import type { PlateMotif } from '@/graphics/Plate'

export interface Service {
  index: string
  name: string
  summary: string
  /** What the client actually receives. Concrete, not adjectives. */
  includes: readonly string[]
  motif: PlateMotif
}

export const services: Service[] = [
  {
    index: '01',
    name: 'Wedding Design',
    summary:
      'The whole visual direction of the day, held together by one idea rather than a folder of nice things.',
    includes: ['Concept & art direction', 'Scaled floor plans', 'Material and colour schedule', 'On-the-day direction'],
    motif: 'hall',
  },
  {
    index: '02',
    name: 'Event Styling',
    summary:
      'Atmosphere for anything that is not a wedding — a launch, an anniversary, a private dinner that has to feel considered.',
    includes: ['Concept development', 'Set and prop specification', 'Styling on site', 'Sourcing & fabrication'],
    motif: 'plot',
  },
  {
    index: '03',
    name: 'Tables & Seating',
    summary:
      'How the room seats people decides how the evening feels. We draw the seating before we choose the linen.',
    includes: ['Seating plans to scale', 'Tabletop design', 'Linen, glass & cutlery', 'Place cards and menus'],
    motif: 'table',
  },
  {
    index: '04',
    name: 'Floral Design',
    summary:
      'Installations engineered as structures, then flowered — which is why they still look right at midnight.',
    includes: ['Botanical direction', 'Installation engineering', 'Seasonal sourcing', 'Build & strike'],
    motif: 'bloom',
  },
  {
    index: '05',
    name: 'Lighting & Ambience',
    summary:
      'Most venues are lit for cleaning, not for celebrating. We replace that with a plot drawn for the evening.',
    includes: ['Lighting plot', 'Fixture specification', 'Candle strategy', 'Programmed scene changes'],
    motif: 'plot',
  },
  {
    index: '06',
    name: 'Stage & Entrance',
    summary:
      'The two moments everyone photographs: where the couple sits, and where the guests walk in.',
    includes: ['Stage elevations', 'Backdrop & drape design', 'Entrance and aisle design', 'Structural build'],
    motif: 'stage',
  },
  {
    index: '07',
    name: 'Full Event Setup',
    summary:
      'Everything above, delivered and installed by our own crew, on a schedule you can read.',
    includes: ['Production schedule', 'Vendor coordination', 'Install & strike crew', 'On-site management'],
    motif: 'aisle',
  },
]

export interface ProcessStep {
  index: string
  title: string
  body: string
  /** The artifact the client leaves this stage holding. */
  output: string
}

export const process: ProcessStep[] = [
  {
    index: '01',
    title: 'Discover',
    body: 'We sit down with you and the venue. What the room can take, what the family expects, what the budget actually is.',
    output: 'Brief & budget frame',
  },
  {
    index: '02',
    title: 'Concept',
    body: 'One direction, argued for. Not three options to choose between — a point of view, with the reasoning attached.',
    output: 'Concept board',
  },
  {
    index: '03',
    title: 'Design',
    body: 'The evening drawn to scale: floor plans, stage elevations, the lighting plot, every table from above.',
    output: 'Full drawing set',
  },
  {
    index: '04',
    title: 'Create',
    body: 'Fabrication, sourcing and floral build in our workshop, so what arrives on site is already finished.',
    output: 'Build & schedule',
  },
  {
    index: '05',
    title: 'Transform',
    body: 'Install, light, dress and strike. Our crew is there from the empty room to the last chair out.',
    output: 'The room, on the night',
  },
]

export interface Testimonial {
  quote: string
  attribution: string
  context: string
}

/** Placeholder wording — replace with real, approved client quotes before launch. */
export const testimonials: Testimonial[] = [
  {
    quote:
      'They arrived with a drawing of the room before we had chosen a venue. By the time we walked in on the night, there was nothing left to worry about.',
    attribution: 'Bride & Groom',
    context: 'Nocturne — Dubai, 2025',
  },
  {
    quote:
      'We had been sent the same three moodboards by every studio in the city. LIFARD sent one idea and explained why it was the right one.',
    attribution: 'Mother of the Bride',
    context: 'The Long Table — Jeddah, 2025',
  },
  {
    quote:
      'Four hundred guests, two rooms, one crew. It ran to the minute and we never saw them working.',
    attribution: 'Private Client',
    context: 'Salt & Silver — Muscat, 2024',
  },
]

export const eventTypes = [
  'Wedding',
  'Engagement',
  'Reception',
  'Private celebration',
  'Corporate event',
  'Other',
] as const
