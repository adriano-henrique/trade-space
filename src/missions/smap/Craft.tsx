import type { CraftProps } from '../../game/types'
import { INK } from '../../ui/art'
import type { Design, Result } from './model'

const ink = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const DISH_R = { 2: 40, 4: 62, 6: 88 }
const label = { fontSize: 12.5, fill: 'var(--color-ink-soft)', fontFamily: 'var(--font-sans)', fontWeight: 600 }

/** The SMAP-style satellite you are building. Every choice changes a part you can see. */
export function SmapCraft({ design: d }: CraftProps<Design, Result>) {
  const wing = Math.min(140, 26 + 20 * Math.sqrt(d.arrayM2))
  const cells = Math.max(2, Math.round(wing / 24))
  const R = DISH_R[d.dish]
  const lit = Math.max(1, Math.min(5, Math.round(Math.log10(Math.max(10, d.batteryWh)) * 1.5 - 1)))
  return (
    <g>
      {/* solar wings */}
      {[-1, 1].map((side) => (
        // The pop-in animates an inner group: a CSS transform on the outer one would replace its placement.
        <g key={`${side}-${cells}`} transform={`translate(${200 + side * 40} 190) scale(${side} 1)`}>
          <g className="snap">
            <line x1="0" y1="0" x2="10" y2="0" {...ink} />
            <rect x="10" y="-19" width={wing} height="38" rx="3" fill="oklch(0.52 0.14 255)" {...ink} />
            {Array.from({ length: cells - 1 }, (_, i) => (
              <line key={i} x1={10 + ((i + 1) * wing) / cells} y1="-19" x2={10 + ((i + 1) * wing) / cells} y2="19" stroke={INK} strokeWidth="2" />
            ))}
            <line x1="10" y1="0" x2={10 + wing} y2="0" stroke={INK} strokeWidth="2" />
          </g>
        </g>
      ))}
      <text x={250 + wing / 2} y="228" textAnchor="middle" {...label}>
        wings · {d.arrayM2} m²
      </text>

      {/* the big mesh dish on its boom */}
      <g key={`dish-${d.dish}`} className="snap">
        <line x1="200" y1="150" x2="200" y2="104" {...ink} strokeWidth={5} />
        <g transform="rotate(-10 200 96)">
          <ellipse cx="200" cy="92" rx={R} ry={R * 0.3} fill="oklch(0.93 0.07 95)" {...ink} />
          {Array.from({ length: Math.round(R / 11) }, (_, i) => {
            const x = 200 - R + ((i + 1) * 2 * R) / (Math.round(R / 11) + 1)
            const half = R * 0.3 * Math.sqrt(1 - ((x - 200) / R) ** 2)
            return <line key={i} x1={x} y1={92 - half} x2={x} y2={92 + half} stroke={INK} strokeWidth="1.5" opacity="0.55" />
          })}
          <ellipse cx="200" cy="92" rx={R * 0.62} ry={R * 0.18} fill="none" stroke={INK} strokeWidth="1.5" opacity="0.55" />
        </g>
      </g>
      <text x={200 - R - 8} y="72" textAnchor="end" {...label}>
        {d.dish} m dish
      </text>

      {/* radar horn, aimed up at the dish */}
      {d.radar && (
        <g className="snap">
          <path d="M166 150 L160 126 H186 L180 150 Z" fill="var(--color-rocket)" {...ink} />
          <path d="M165 118 Q173 110 181 118 M161 110 Q173 98 185 110" fill="none" stroke="var(--color-rocket)" strokeWidth="3" strokeLinecap="round" />
          <text x="150" y="134" textAnchor="end" {...label}>
            radar
          </text>
        </g>
      )}

      {/* body */}
      <rect x="160" y="150" width="80" height="80" rx="8" fill="oklch(0.84 0.13 85)" {...ink} />
      <path d="M160 176 H240 M213 150 V176" stroke={INK} strokeWidth="2" opacity="0.6" />
      {/* battery cells: more capacity lights more of them */}
      <g>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={169 + i * 13} y="196" width="9" height="20" rx="2" fill={i < lit ? 'var(--color-leaf)' : 'var(--color-paper)'} stroke={INK} strokeWidth="2" />
        ))}
      </g>

      {/* camera looking down */}
      {d.camera && (
        <g className="snap">
          <rect x="207" y="230" width="22" height="16" rx="2" fill={INK} {...ink} />
          <ellipse cx="218" cy="247" rx="8" ry="3.5" fill="var(--color-sky)" stroke={INK} strokeWidth="2.5" />
          <text x="240" y="252" {...label}>
            camera
          </text>
        </g>
      )}

      {/* radio antenna: bigger and dish-shaped for faster radios */}
      <g key={`radio-${d.radio}`} className="snap">
        {d.radio === 'S' ? (
          <>
            <line x1="176" y1="230" x2="168" y2="254" {...ink} />
            <circle cx="167" cy="257" r="4" fill="var(--color-paper)" {...ink} strokeWidth={2.5} />
          </>
        ) : (
          <>
            <line x1="176" y1="230" x2="172" y2="244" {...ink} />
            <path
              d={d.radio === 'X' ? 'M160 246 Q172 262 184 246 Z' : 'M154 246 Q172 270 190 246 Z'}
              fill="var(--color-paper)"
              {...ink}
            />
          </>
        )}
        <text x="150" y="262" textAnchor="end" {...label}>
          radio
        </text>
      </g>
    </g>
  )
}
