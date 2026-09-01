# Content & photography

Everything a non-developer needs to change lives in this folder.

| File          | Holds                                                      |
| ------------- | ---------------------------------------------------------- |
| `site.ts`     | Brand name, discipline line, contact details, nav items     |
| `work.ts`     | The eight portfolio projects and their categories           |
| `studio.ts`   | Services, process steps, testimonials, event-type options   |

## Adding real photography

The site currently draws every project instead of photographing it — the
plates in `src/graphics/Plate.tsx` are the studio's own drawings. That is a
deliberate direction, not a placeholder gap, but it is built to accept
photography the moment a shoot exists.

To swap a drawing for a photograph, add a `photo` to that project in
`work.ts`:

```ts
{
  plate: 'P-02',
  name: 'Nocturne',
  // …
  photo: {
    src: '/work/nocturne-1600.jpg',
    alt: 'Ballroom lit entirely by table candles, brass stands along the aisle',
    focal: '50% 35%',           // optional — where the subject sits in frame
    srcSet: '/work/nocturne-800.jpg 800w, /work/nocturne-1600.jpg 1600w',
    sizes: '(min-width: 1024px) 50vw, 100vw',
  },
}
```

Drop the files in `public/work/`. Nothing else changes: the crop, the frame,
the hover lighting and the scroll reveal all continue to work, because every
visual on the site renders through `<Figure>` (`src/components/Figure.tsx`).

Guidance for the shoot, so the images sit inside the existing art direction:

- Warm, low, practical light — candles and uplight, not flash.
- Deep green-black shadows rather than neutral grey ones.
- Shoot wide enough that a `tall` and a `wide` crop both survive.
- Export at 1600px and 800px wide, ~72% quality, progressive JPEG or AVIF.

## Testimonials

The three quotes in `studio.ts` are written placeholders. Replace them with
real, client-approved quotes before the site goes live.

## Contact form

`ContactSection` posts nowhere by default — it validates in the browser and
then hands off. Point it at your form backend (Formspree, a serverless
function, your CRM) by filling in the `submit` handler in
`src/sections/Contact.tsx`, which is marked with a `TODO`.
