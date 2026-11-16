import type { CraftProps } from '../../game/types'
import { INK } from '../../ui/art'
import type { Design, Result } from './model'

const ink = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const label = { fontSize: 12.5, fill: 'var(--color-ink-soft)', fontFamily: 'var(--font-sans)', fontWeight: 600 }

/** The Uranus orbiter: big dish, nuclear batteries on a boom, and a probe to drop into the clouds. */
export function UranusCraft({ design: d }: CraftProps<Design, Result>) {
  const dish = d.hga === 4 ? 78 : 54
  const wing = Math.min(150, 20 + 7 * Math.sqrt(d.arrayM2))
  const cells = Math.max(2, Math.round(wing / 24))
  return (
    <g>
      {/* power: nuclear batteries on a boom, or solar wings */}
      {d.power === 'rtg' ? (
        <g key={`rtg-${d.rtgs}`} className="snap">
          <line x1="160" y1="182" x2={104 - d.rtgs * 6} y2="182" {...ink} strokeWidth={5} />
          {Array.from({ length: d.rtgs }, (_, i) => (
            <g key={i} transform={`translate(${96 - i * 30} 182)`}>
              <rect x="-11" y="-26" width="22" height="52" rx="6" fill="var(--color-ink)" {...ink} />
              {[-13, 0, 13].map((y) => (
                <line key={y} x1="-17" y1={y} x2="17" y2={y} stroke="var(--color-rocket)" strokeWidth="4" strokeLinecap="round" />
              ))}
            </g>
          ))}
        </g>
      ) : (
        [-1, 1].map((side) => (
          <g key={side} transform={`translate(${200 + side * 40} 182) scale(${side} 1)`}>
            <g className="snap">
              <rect x="6" y="-20" width={wing} height="40" rx="3" fill="oklch(0.52 0.14 255)" {...ink} />
              {Array.from({ length: cells - 1 }, (_, k) => (
                <line key={k} x1={6 + ((k + 1) * wing) / cells} y1="-20" x2={6 + ((k + 1) * wing) / cells} y2="20" stroke={INK} strokeWidth="2" />
              ))}
            </g>
          </g>
        ))
      )}

      {/* magnetometer on a long boom, away from the electronics */}
      {d.mag && (
        <g className="snap">
          <line x1="240" y1="170" x2="330" y2="150" {...ink} />
          <rect x="326" y="141" width="15" height="15" rx="3" fill="var(--color-grape)" {...ink} strokeWidth={2.5} />
        </g>
      )}

      {/* heat shield for aerocapture */}
      {d.capture === 'aerocapture' && <path d="M140 250 Q200 292 260 250 Z" fill="var(--color-sun)" {...ink} className="snap" />}

      {/* the probe, a cone that will fall into Uranus */}
      {d.probe && (
        <g className="snap">
          <path d="M178 224 H222 L212 250 H188 Z" fill="var(--color-rocket)" {...ink} />
          <text x="230" y="246" {...label}>
            probe
          </text>
        </g>
      )}

      <rect x="160" y="140" width="80" height="84" rx="8" fill="oklch(0.84 0.13 85)" {...ink} />
      <path d="M160 168 H240" stroke={INK} strokeWidth="2" opacity="0.6" />
      {d.cam && (
        <g className="snap">
          <circle cx="222" cy="198" r="9" fill={INK} />
          <circle cx="223" cy="197" r="4" fill="var(--color-sky)" />
        </g>
      )}
      {d.irs && <rect x="170" y="188" width="20" height="14" rx="2" fill="var(--color-paper)" {...ink} strokeWidth={2.5} className="snap" />}
      {d.dust && <path d="M160 150 l-14 -8 v16 Z" fill="var(--color-leaf)" {...ink} strokeWidth={2.5} className="snap" />}

      {/* the dish that talks to Earth from 3 billion km */}
      <g key={d.hga} className="snap">
        <line x1="200" y1="140" x2="200" y2="118" {...ink} strokeWidth={5} />
        <path d={`M${200 - dish} 92 Q200 ${92 + dish * 0.62} ${200 + dish} 92 Z`} fill="var(--color-paper)" {...ink} />
        <line x1="200" y1="92" x2="200" y2="70" {...ink} />
        <circle cx="200" cy="68" r="4" fill={INK} />
      </g>

      <text x="14" y="26" {...label}>
        {d.power === 'rtg' ? `${d.rtgs} nuclear batteries` : `solar wings · ${d.arrayM2} m²`}
      </text>
      <text x="14" y="44" {...label}>
        {d.hga} m dish
      </text>
    </g>
  )
}
