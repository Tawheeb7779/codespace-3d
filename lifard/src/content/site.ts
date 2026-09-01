/** Brand-level facts. Everything the client will realistically want to edit. */

export const site = {
  name: 'LIFARD',
  /** Secondary wordmark — the studio's name as its clients say it. */
  nameArabic: 'ليفارد',
  discipline: 'Wedding & Event Design Studio',
  /** Used in the hero and in metadata. Keep it to one breath. */
  summary:
    'Concept, styling, florals, lighting and complete setup for celebrations that deserve more than a venue.',
  founded: 2016,
  contact: {
    email: 'studio@lifard.com',
    phone: '+971 4 000 0000',
    /** Where the studio actually works from, and where it travels. */
    base: 'Dubai',
    travels: 'GCC, Levant & Europe',
  },
  social: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'Pinterest', href: 'https://pinterest.com/' },
  ],
} as const

export const nav = [
  { id: 'work', label: 'Work' },
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'studio', label: 'Studio' },
] as const

export const SECTION_IDS = nav.map((n) => n.id)
