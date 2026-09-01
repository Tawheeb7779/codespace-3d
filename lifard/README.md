# LIFARD

Website for LIFARD — a wedding and event design studio.

```bash
cd lifard
npm install
npm run dev      # http://localhost:5173
```

| Script            | Does                                              |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Dev server                                        |
| `npm run build`   | Typecheck + production build to `dist/`           |
| `npm run preview` | Serve the built site                              |
| `npm test`        | Unit tests                                        |
| `npm run lint`    | oxlint                                            |

Deploys as static files — point any host at `dist/`. This app is independent
of the Forge IDE app at the repository root; neither imports from the other.

## The design

An event designer's real craft artifact is the **drawing** — the scaled plan
of a stage, an aisle, a tablescape seen from above. So the site is the
studio's drafting table rather than a photo gallery: brass line work that
**lights into candle glow** on hover, on focus, and as it scrolls into view.
Drawing becomes room, which is literally the studio's process (Discover →
Transform).

The page alternates between two grounds, and that alternation is its rhythm:

| | |
| --- | --- |
| `vellum` `#E6E1D5` | drafting paper — deliberately greyer than cream |
| `ink` `#16211E` | a garden at night — blue-green, never neutral black |
| `nocturne` `#0B1210` | the darkest hour, for full-bleed moments |
| `brass` `#A98B5D` | antique brass, line work only |
| `brass-deep` `#6D5730` | brass as *type*, on paper (plain brass is 2.5:1 there) |
| `flame` `#E0A16A` | candlelight — a light source, never a fill |

Type is **Marcellus** (inscriptional Roman — the lettering of architecture),
**Jost** (geometric sans — the vernacular of design studios) and **IBM Plex
Mono** (the annotation hand on a technical drawing, and it always carries
real data: plate numbers, guest counts, spans).

## Photography

There is none yet, by design — but every visual renders through
`<Figure>`, so adding a `photo` to a project in `src/content/work.ts`
replaces its drawing with a photograph and nothing else changes.
**[src/content/README.md](src/content/README.md)** has the exact shape, plus
art-direction notes for the shoot.

## Structure

```
src/
  graphics/Plate.tsx     the seven drawings + drafting conventions
  components/            Figure (drawing ⇄ photo), Lightbox, ui primitives
  sections/              one file per section, in page order
  content/               everything a non-developer edits
  lib/motion.ts          IntersectionObserver reveals, parallax, scroll lock
  styles/                design tokens, plate lighting
```

No animation, UI or utility library — only React. Motion is CSS transitions
switched on by one shared observer per section, so it runs on the compositor.
Fonts are self-hosted, so first paint never waits on a third-party origin.

## Enquiries

The form validates in the browser and then, by default, opens the visitor's
mail client with the whole enquiry already written out — so it works with no
backend at all. To post it somewhere instead, set:

```
VITE_INQUIRY_ENDPOINT=https://…   # receives the enquiry as JSON
```

## Before launch

- [ ] Replace the placeholder quotes in `src/content/studio.ts` with real,
      client-approved ones.
- [ ] Set the real phone number and social links in `src/content/site.ts`.
- [ ] Add photography, or keep the drawings — both are supported.

## Accessibility

Every text/ground pair is checked to WCAG AA (the muted-text opacities and
`brass-deep` exist for that reason). Full keyboard support including the
lightbox (arrow keys, Escape), visible brass focus rings, labelled fields
with specific error messages, and `prefers-reduced-motion` honoured — reduced
motion removes movement, never content.
