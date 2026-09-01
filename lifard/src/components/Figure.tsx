import { Plate, type PlateMotif } from '@/graphics/Plate'

/**
 * Every visual on this site goes through here.
 *
 * LIFARD's photography does not exist yet, so a Figure renders the studio's
 * drawing of the thing instead. The day a shoot lands, add a `photo` to the
 * matching entry in `src/content/*` and this component serves the photograph
 * with no other change anywhere — same crop, same frame, same lit hover, same
 * reveal. See `src/content/README.md`.
 */

export interface Photo {
  /** Path under /public, or an absolute URL. */
  src: string
  /** What the photograph shows — not "image of", just the subject. */
  alt: string
  /** Where the subject sits in the frame, e.g. '50% 30%'. Defaults to centre. */
  focal?: string
  /** Optional pre-scaled sources, widest last: '/x-800.jpg 800w, /x-1600.jpg 1600w'. */
  srcSet?: string
  /** Slot width across breakpoints, so the browser picks the right source. */
  sizes?: string
}

interface FigureProps {
  /** The drawing to show until a photograph replaces it. */
  motif: PlateMotif
  photo?: Photo
  /** Accessible name for the drawing. Omit on purely decorative figures. */
  title?: string
  className?: string
  /** Lit by scroll position rather than by hover — used for hero and features. */
  lit?: boolean
  priority?: boolean
}

export function Figure({ motif, photo, title, className, lit, priority }: FigureProps) {
  const classes = className ? `plate ${className}` : 'plate'

  if (photo) {
    return (
      <div className={classes} data-lit={lit ? '' : undefined} style={figureStyle(photo.focal)}>
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={photo.sizes}
          alt={photo.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
    )
  }

  return (
    <div className={classes} data-lit={lit ? '' : undefined}>
      <Plate motif={motif} title={title} />
    </div>
  )
}

function figureStyle(focal?: string) {
  return focal ? ({ '--plate-focal': focal } as React.CSSProperties) : undefined
}
