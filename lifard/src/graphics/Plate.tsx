import { useId } from 'react'

/**
 * The studio's drawings.
 *
 * A LIFARD project exists as a scaled drawing long before it exists as a
 * room, so the drawing — not a photograph — is what this site shows. Each
 * motif below is a thing an event designer genuinely drafts: a ceremony arch
 * in elevation, a hall in plan, a lighting plot, a single table from above.
 *
 * Every plate has two states. Unlit, it is brass line work on its ground.
 * Lit — on hover, on focus, or when it scrolls into view — the candles come
 * up and the drawing warms, which is the same thing that happens to a real
 * room the moment before guests walk in. That transition is the one piece of
 * theatre on the whole site.
 *
 * Strokes use `vectorEffect="non-scaling-stroke"` so a plate stays hairline
 * whether it renders 200px wide in a grid or full-bleed behind the hero.
 */

export type PlateMotif = 'arch' | 'hall' | 'table' | 'stage' | 'bloom' | 'plot' | 'aisle'

export const PLATE_MOTIFS: readonly PlateMotif[] = [
  'arch',
  'hall',
  'table',
  'stage',
  'bloom',
  'plot',
  'aisle',
]

interface PlateProps {
  motif: PlateMotif
  /** Rendered as the accessible name when the plate carries meaning on its own. */
  title?: string
  className?: string
}

/** Natural drawing area for each motif, so proportions stay honest. */
const VIEWBOX: Record<PlateMotif, string> = {
  arch: '0 0 760 940',
  hall: '0 0 960 760',
  table: '0 0 960 620',
  stage: '0 0 960 660',
  bloom: '0 0 700 940',
  plot: '0 0 960 700',
  aisle: '0 0 720 960',
}

export function Plate({ motif, title, className }: PlateProps) {
  const uid = useId().replace(/:/g, '')
  const glow = `glow-${uid}`
  const flame = `flame-${uid}`
  const labelId = `plate-label-${uid}`

  return (
    <svg
      viewBox={VIEWBOX[motif]}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-labelledby={title ? labelId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title id={labelId}>{title}</title> : null}

      <defs>
        {/* The room coming up to temperature. */}
        <radialGradient id={glow} cx="50%" cy="58%" r="62%">
          <stop offset="0%" stopColor="var(--color-flame)" stopOpacity="0.5" />
          <stop offset="45%" stopColor="var(--color-brass)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-brass)" stopOpacity="0" />
        </radialGradient>
        {/* A single candle's halo. Tight core, long falloff — at full-bleed
            sizes a wide even gradient reads as an orange blob, not a flame. */}
        <radialGradient id={flame} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-flame)" stopOpacity="0.9" />
          <stop offset="22%" stopColor="var(--color-flame)" stopOpacity="0.34" />
          <stop offset="55%" stopColor="var(--color-flame)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-flame)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect className="plate-glow" width="100%" height="100%" fill={`url(#${glow})`} />

      <g
        className="plate-line"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {motif === 'arch' && <Arch flame={flame} />}
        {motif === 'hall' && <Hall flame={flame} />}
        {motif === 'table' && <Table flame={flame} />}
        {motif === 'stage' && <Stage flame={flame} />}
        {motif === 'bloom' && <Bloom />}
        {motif === 'plot' && <Plot flame={flame} />}
        {motif === 'aisle' && <Aisle flame={flame} />}
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------------------
   Drafting conventions, shared by every plate
   ------------------------------------------------------------------------ */

/** A dimension line with end ticks — how a drawing states a real measurement. */
function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
}) {
  const vertical = x1 === x2
  const tick = 7
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g className="plate-dim" vectorEffect="non-scaling-stroke">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
        </>
      )}
      <text
        x={vertical ? mx + 12 : mx}
        y={vertical ? my : my - 9}
        className="plate-note"
        textAnchor={vertical ? 'start' : 'middle'}
        dominantBaseline={vertical ? 'middle' : 'auto'}
        fill="currentColor"
        stroke="none"
      >
        {label}
      </text>
    </g>
  )
}

/** Dash-dot centreline: the axis every symmetrical setup is built around. */
function Centre({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      className="plate-centre"
      strokeDasharray="14 5 2 5"
      vectorEffect="non-scaling-stroke"
    />
  )
}

/** A candle: an unlit ring on paper, a lit point of light in the room. */
function Candle({ x, y, r = 4, flame }: { x: number; y: number; r?: number; flame: string }) {
  return (
    <g>
      <circle className="plate-halo" cx={x} cy={y} r={r * 5.5} fill={`url(#${flame})`} stroke="none" />
      <circle cx={x} cy={y} r={r} vectorEffect="non-scaling-stroke" />
      <circle className="plate-wick" cx={x} cy={y} r={r * 0.42} fill="currentColor" stroke="none" />
    </g>
  )
}

function Note({
  x,
  y,
  children,
  anchor = 'start',
}: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text x={x} y={y} className="plate-note" textAnchor={anchor} fill="currentColor" stroke="none">
      {children}
    </text>
  )
}

/** Even spacing along an axis — chairs, candles, fixtures, place settings. */
function series(count: number, from: number, to: number): number[] {
  if (count === 1) return [(from + to) / 2]
  const step = (to - from) / (count - 1)
  return Array.from({ length: count }, (_, i) => from + step * i)
}

/* ---------------------------------------------------------------------------
   The plates
   ------------------------------------------------------------------------ */

/** Ceremony arch, front elevation. Asymmetric floral weight, as it is built. */
function Arch({ flame }: { flame: string }) {
  const leftCluster = [
    [232, 236, 26],
    [286, 196, 19],
    [196, 300, 21],
    [258, 300, 15],
    [318, 252, 13],
    [176, 372, 16],
    [214, 176, 12],
  ]
  const rightCluster = [
    [548, 512, 24],
    [566, 588, 18],
    [520, 452, 14],
    [584, 464, 12],
    [536, 646, 15],
    [590, 700, 11],
  ]
  return (
    <>
      <Centre x={380} y1={70} y2={880} />

      {/* Arch: two legs closed by a half-round head. */}
      <path d="M188 812 V420 A192 192 0 0 1 572 420 V812" />
      <path d="M214 812 V420 A166 166 0 0 1 546 420 V812" strokeOpacity="0.45" />

      {/* Floral installations — heavier at upper-left, answered lower-right. */}
      {leftCluster.map(([cx, cy, r], i) => (
        <circle key={`l${i}`} cx={cx} cy={cy} r={r} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      ))}
      {rightCluster.map(([cx, cy, r], i) => (
        <circle key={`r${i}`} cx={cx} cy={cy} r={r} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      ))}

      {/* Trailing stems off the left cluster. */}
      <path d="M196 316 C 168 372 160 424 172 470" strokeOpacity="0.5" />
      <path d="M232 262 C 210 318 206 356 214 392" strokeOpacity="0.5" />

      {/* Ground line and floor candles. */}
      <line x1={96} y1={812} x2={664} y2={812} />
      {series(5, 232, 528).map((x) => (
        <Candle key={x} x={x} y={796} r={5} flame={flame} />
      ))}

      <Dim x1={188} y1={862} x2={572} y2={862} label="3840" />
      <Dim x1={636} y1={228} x2={636} y2={812} label="2900" />
      <Note x={96} y={886}>
        ARCH — FRONT ELEVATION
      </Note>
      <Note x={664} y={886} anchor="end">
        SCALE 1:50
      </Note>
    </>
  )
}

/** Reception hall in plan: rounds, head table, floor. */
function Hall({ flame }: { flame: string }) {
  const rounds = [
    [214, 300],
    [366, 246],
    [594, 246],
    [746, 300],
    [214, 512],
    [366, 566],
    [594, 566],
    [746, 512],
  ]
  return (
    <>
      <rect x={72} y={80} width={816} height={600} strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
      <Centre x={480} y1={80} y2={680} />

      {/* Head table, upstage and straight. */}
      <rect x={356} y={116} width={248} height={40} vectorEffect="non-scaling-stroke" />
      {series(7, 380, 580).map((x) => (
        <rect key={x} x={x - 9} y={98} width={18} height={13} strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
      ))}
      <Note x={480} y={182} anchor="middle">
        HEAD TABLE
      </Note>

      {/* Guest rounds, each with its chair marks. */}
      {rounds.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={54} vectorEffect="non-scaling-stroke" />
          <circle cx={cx} cy={cy} r={26} strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
          {Array.from({ length: 10 }, (_, k) => {
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2
            return (
              <circle
                key={k}
                cx={cx + Math.cos(a) * 72}
                cy={cy + Math.sin(a) * 72}
                r={9}
                strokeOpacity="0.55"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          <Candle x={cx} y={cy} r={3.5} flame={flame} />
          <Note x={cx} y={cy + 5} anchor="middle">
            {String(i + 1).padStart(2, '0')}
          </Note>
        </g>
      ))}

      {/* Dance floor, centre, where the aisle lands. */}
      <rect x={404} y={352} width={152} height={152} strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
      <path d="M404 352 L556 504 M556 352 L404 504" strokeOpacity="0.2" />
      <Note x={480} y={432} anchor="middle">
        FLOOR
      </Note>

      <Dim x1={72} y1={716} x2={888} y2={716} label="24 400" />
      <Note x={72} y={62}>
        RECEPTION — PLAN
      </Note>
      <Note x={888} y={62} anchor="end">
        220 GUESTS
      </Note>
    </>
  )
}

/** One long table from above: settings, glassware, runner, candlelight. */
function Table({ flame }: { flame: string }) {
  const xs = series(7, 168, 792)
  return (
    <>
      <rect x={112} y={192} width={736} height={236} vectorEffect="non-scaling-stroke" />
      <rect x={112} y={252} width={736} height={116} strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
      <Note x={128} y={318}>
        RUNNER
      </Note>

      {/* Covers, top and bottom, mirrored across the runner. */}
      {xs.map((x) => (
        <g key={x}>
          {[228, 392].map((y) => (
            <g key={y}>
              <circle cx={x} cy={y} r={26} vectorEffect="non-scaling-stroke" />
              <circle cx={x} cy={y} r={17} strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
              {/* Glassware, clustered upper-right of the cover as it is laid. */}
              <circle cx={x + 32} cy={y - 22} r={6} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
              <circle cx={x + 44} cy={y - 10} r={5} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
              <circle cx={x + 30} cy={y - 6} r={4.5} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
              {/* Cutlery. */}
              <line x1={x - 36} y1={y - 12} x2={x - 36} y2={y + 12} strokeOpacity="0.6" />
              <line x1={x - 43} y1={y - 12} x2={x - 43} y2={y + 12} strokeOpacity="0.6" />
            </g>
          ))}
          {/* Chairs beyond the table edge. */}
          <path d={`M${x - 22} 168 h44`} strokeOpacity="0.55" />
          <path d={`M${x - 22} 452 h44`} strokeOpacity="0.55" />
        </g>
      ))}

      {/* Centreline: candles alternating with low arrangements. */}
      {series(9, 152, 808).map((x, i) =>
        i % 2 === 0 ? (
          <Candle key={x} x={x} y={310} r={5} flame={flame} />
        ) : (
          <circle key={x} cx={x} cy={310} r={14} strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
        ),
      )}

      <Dim x1={112} y1={512} x2={848} y2={512} label="7 200" />
      <Note x={112} y={140}>
        TABLE — PLAN
      </Note>
      <Note x={848} y={140} anchor="end">
        14 COVERS
      </Note>
    </>
  )
}

/** Stage and backdrop in elevation: drape, riser, uplight. */
function Stage({ flame }: { flame: string }) {
  return (
    <>
      <Centre x={480} y1={70} y2={600} />

      {/* Backdrop panels. */}
      <rect x={216} y={112} width={528} height={368} vectorEffect="non-scaling-stroke" />
      {series(4, 348, 612).map((x) => (
        <line key={x} x1={x} y1={112} x2={x} y2={480} strokeOpacity="0.3" />
      ))}

      {/* Drape: catenaries, the way fabric actually falls. */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M216 ${132 + i * 26} Q480 ${210 + i * 30} 744 ${132 + i * 26}`}
          strokeOpacity={0.6 - i * 0.14}
        />
      ))}

      {/* Seating pair, centred. */}
      <path d="M424 400 v-58 a18 18 0 0 1 18-18 h30 a18 18 0 0 1 18 18 v58" strokeOpacity="0.75" />
      <path d="M510 400 v-58 a18 18 0 0 1 18-18 h30 a18 18 0 0 1 18 18 v58" strokeOpacity="0.75" />

      {/* Riser. */}
      <path d="M156 480 h648 v46 h-648 z" />
      <path d="M132 526 h696" />
      {series(6, 216, 744).map((x) => (
        <line key={x} x1={x} y1={480} x2={x} y2={526} strokeOpacity="0.25" />
      ))}

      {/* Uplights washing the backdrop. */}
      {[216, 350, 610, 744].map((x) => (
        <g key={x}>
          <path d={`M${x} 480 L${x - 30} 150 L${x + 30} 150 Z`} fill="currentColor" fillOpacity="0.05" stroke="none" />
          <Candle x={x} y={470} r={4} flame={flame} />
        </g>
      ))}

      {/* Flanking arrangements. */}
      {[172, 788].map((x) => (
        <g key={x}>
          {[
            [0, 0, 22],
            [-24, 34, 15],
            [26, 40, 13],
            [4, -34, 14],
          ].map(([dx, dy, r], i) => (
            <circle
              key={i}
              cx={x + dx}
              cy={420 + dy}
              r={r}
              strokeOpacity="0.65"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}

      <Dim x1={216} y1={578} x2={744} y2={578} label="5 280" />
      <Note x={132} y={86}>
        STAGE — ELEVATION
      </Note>
      <Note x={828} y={86} anchor="end">
        SCALE 1:50
      </Note>
    </>
  )
}

/** Floral study: stems drawn at scale, the way an installation is specified. */
function Bloom() {
  const stems = [
    'M350 780 C 318 660 300 560 316 452 C 330 362 372 300 404 250',
    'M350 780 C 372 662 396 574 448 494 C 490 428 540 392 574 372',
    'M350 780 C 326 664 286 578 226 512 C 178 460 140 434 112 420',
    'M350 780 C 350 690 344 616 336 548',
  ]
  const heads = [
    [404, 250, 34],
    [574, 372, 26],
    [112, 420, 24],
    [336, 548, 19],
    [452, 330, 16],
    [252, 386, 15],
    [498, 452, 13],
    [216, 470, 12],
  ]
  const leaves = [
    [300, 560, -34],
    [430, 512, 28],
    [258, 500, -52],
    [470, 410, 40],
    [330, 620, -20],
  ]
  return (
    <>
      {stems.map((d, i) => (
        <path key={i} d={d} strokeOpacity={0.75 - i * 0.08} />
      ))}

      {leaves.map(([x, y, rot], i) => (
        <path
          key={i}
          d="M0 0 C 22 -16 54 -14 74 0 C 54 14 22 16 0 0 Z"
          transform={`translate(${x} ${y}) rotate(${rot})`}
          strokeOpacity="0.6"
        />
      ))}

      {heads.map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} strokeOpacity="0.8" vectorEffect="non-scaling-stroke" />
          <circle cx={cx} cy={cy} r={r * 0.58} strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
          {/* Petal ticks, only on the specimens large enough to show them. */}
          {r > 20
            ? Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2
                return (
                  <line
                    key={k}
                    x1={cx + Math.cos(a) * r * 0.6}
                    y1={cy + Math.sin(a) * r * 0.6}
                    x2={cx + Math.cos(a) * r}
                    y2={cy + Math.sin(a) * r}
                    strokeOpacity="0.35"
                  />
                )
              })
            : null}
        </g>
      ))}

      {/* Vessel. */}
      <path d="M300 780 C 292 828 296 862 306 884 h88 c10 -22 14 -56 6 -104" strokeOpacity="0.85" />
      <line x1={286} y1={780} x2={414} y2={780} />

      <Dim x1={640} y1={250} x2={640} y2={780} label="1 240" />
      <Note x={72} y={892}>
        INSTALLATION — STUDY
      </Note>
      <Note x={628} y={892} anchor="end">
        8 SPECIMENS
      </Note>
    </>
  )
}

/** Lighting plot: fixtures, beams, and what each is doing. */
function Plot({ flame }: { flame: string }) {
  const fixtures = [
    [180, 190],
    [340, 150],
    [500, 150],
    [660, 190],
    [180, 470],
    [340, 510],
    [500, 510],
    [660, 470],
    [820, 330],
  ]
  return (
    <>
      {/* Grid the plot is drafted on. */}
      {series(9, 100, 900).map((x) => (
        <line key={`v${x}`} x1={x} y1={92} x2={x} y2={596} strokeOpacity="0.12" />
      ))}
      {series(6, 92, 596).map((y) => (
        <line key={`h${y}`} x1={100} y1={y} x2={900} y2={y} strokeOpacity="0.12" />
      ))}

      <rect x={100} y={92} width={800} height={504} strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />

      {fixtures.map(([x, y], i) => (
        <g key={i}>
          <path
            d={`M${x} ${y} L${x - 74} ${y + 190} L${x + 74} ${y + 190} Z`}
            fill="currentColor"
            fillOpacity="0.055"
            stroke="none"
          />
          <circle cx={x} cy={y} r={13} vectorEffect="non-scaling-stroke" />
          <line x1={x - 13} y1={y} x2={x + 13} y2={y} strokeOpacity="0.7" />
          <line x1={x} y1={y - 13} x2={x} y2={y + 13} strokeOpacity="0.7" />
          <Note x={x + 20} y={y - 16}>
            {`F${String(i + 1).padStart(2, '0')}`}
          </Note>
        </g>
      ))}

      {/* Warm wash across the centre of the room. */}
      {series(5, 260, 740).map((x) => (
        <Candle key={x} x={x} y={344} r={4} flame={flame} />
      ))}

      <Note x={100} y={66}>
        LIGHTING PLOT
      </Note>
      <Note x={900} y={66} anchor="end">
        9 FIXTURES — 2700K
      </Note>
      <Note x={100} y={646}>
        WARM WASH + PIN SPOT ON EACH COVER
      </Note>
    </>
  )
}

/** Entrance and aisle in plan: how a guest actually walks in. */
function Aisle({ flame }: { flame: string }) {
  const rows = series(8, 300, 720)
  return (
    <>
      <Centre x={360} y1={70} y2={900} />

      {/* Aisle runner. */}
      <rect x={286} y={200} width={148} height={620} strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />

      {/* Seating, both sides. */}
      {rows.map((y) => (
        <g key={y}>
          {series(4, 108, 258).map((x) => (
            <rect key={`l${x}`} x={x - 18} y={y - 13} width={36} height={26} strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
          ))}
          {series(4, 462, 612).map((x) => (
            <rect key={`r${x}`} x={x - 18} y={y - 13} width={36} height={26} strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      ))}

      {/* Arch at the head of the aisle, seen in plan. */}
      <path d="M232 200 A128 128 0 0 1 488 200" strokeOpacity="0.85" />
      <circle cx={232} cy={200} r={26} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      <circle cx={488} cy={200} r={26} strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      <Note x={360} y={150} anchor="middle">
        CEREMONY ARCH
      </Note>

      {/* Candles marking the aisle edge. */}
      {series(6, 300, 800).map((y) => (
        <g key={y}>
          <Candle x={272} y={y} r={4} flame={flame} />
          <Candle x={448} y={y} r={4} flame={flame} />
        </g>
      ))}

      {/* Entrance gate. */}
      <path d="M286 866 h148" />
      <path d="M254 866 h-40 M466 866 h40" strokeOpacity="0.5" />
      <Note x={360} y={904} anchor="middle">
        ENTRANCE
      </Note>

      <Dim x1={286} y1={252} x2={434} y2={252} label="1 480" />
      <Note x={72} y={110}>
        AISLE — PLAN
      </Note>
      <Note x={648} y={110} anchor="end">
        64 SEATS
      </Note>
    </>
  )
}
