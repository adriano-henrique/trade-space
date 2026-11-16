import type { CraftProps } from '../../game/types'
import { INK } from '../../ui/art'
import type { Design, Result } from './model'

const ink = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const label = { fontSize: 12.5, fill: 'var(--color-ink-soft)', fontFamily: 'var(--font-sans)', fontWeight: 600 }
const CX = 200
const CY = 158
const DISH_R = { 1.5: 17, 2.5: 25, 4: 35 }

/** Juno seen from above: a six-sided body, three giant wings (or nuclear batteries), a dish on top. */
export function JunoCraft({ design: d }: CraftProps<Design, Result>) {
  const wing = Math.min(150, 26 + 9.5 * Math.sqrt(d.arrayM2))
  const cells = Math.max(2, Math.round(wing / 22))
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i
    return `${CX + 38 * Math.cos(a)},${CY + 38 * Math.sin(a)}`
  }).join(' ')
  return (
    <g>
      {d.power === 'solar'
        ? [-90, 30, 150].map((deg, i) => (
            // The pop-in animates an inner group: a CSS transform on the outer one would replace its placement.
            <g key={`${deg}-${cells}`} transform={`translate(${CX} ${CY}) rotate(${deg})`}>
              <g className="snap">
                <rect x="36" y="-17" width={wing} height="34" rx="3" fill="oklch(0.52 0.14 255)" {...ink} />
                {Array.from({ length: cells - 1 }, (_, k) => (
                  <line key={k} x1={36 + ((k + 1) * wing) / cells} y1="-17" x2={36 + ((k + 1) * wing) / cells} y2="17" stroke={INK} strokeWidth="2" />
                ))}
                {/* the magnetometer rides on the tip of one wing, far from the electronics */}
                {i === 1 && d.mag && (
                  <g>
                    <line x1={36 + wing} y1="0" x2={52 + wing} y2="0" {...ink} />
                    <rect x={52 + wing} y="-7" width="14" height="14" rx="3" fill="var(--color-grape)" {...ink} strokeWidth={2.5} />
                  </g>
                )}
              </g>
            </g>
          ))
        : Array.from({ length: d.rtgs }, (_, i) => {
            const deg = [-150, -30, 150, 30][i]
            return (
              <g key={deg} transform={`translate(${CX} ${CY}) rotate(${deg})`}>
                <g className="snap">
                  <line x1="36" y1="0" x2="62" y2="0" {...ink} strokeWidth={5} />
                  <rect x="62" y="-11" width="44" height="22" rx="6" fill="var(--color-ink)" {...ink} />
                  {[72, 84, 96].map((x) => (
                    <line key={x} x1={x} y1="-17" x2={x} y2="17" stroke="var(--color-rocket)" strokeWidth="4" strokeLinecap="round" />
                  ))}
                </g>
              </g>
            )
          })}
      {d.power === 'rtg' && d.mag && (
        <g className="snap">
          <line x1={CX + 36} y1={CY + 20} x2={CX + 96} y2={CY + 54} {...ink} />
          <rect x={CX + 92} y={CY + 48} width="14" height="14" rx="3" fill="var(--color-grape)" {...ink} strokeWidth={2.5} />
        </g>
      )}

      <polygon points={hex} fill="oklch(0.84 0.13 85)" {...ink} />

      {/* radiation vault: thicker walls draw a thicker box */}
      {d.vaultCm > 0 && (
        <rect key={d.vaultCm} x={CX - 30} y={CY + 8} width="22" height="20" rx="3" fill="oklch(0.82 0.02 250)" stroke={INK} strokeWidth={2 + d.vaultCm * 2.5} className="snap" />
      )}
      {d.mwr && <rect x={CX + 8} y={CY + 10} width="22" height="14" rx="2" fill="var(--color-paper)" {...ink} strokeWidth={2.5} className="snap" />}
      {d.particles && <path d={`M${CX - 32} ${CY - 14} l-12 -8 l4 14 Z`} fill="var(--color-leaf)" {...ink} strokeWidth={2.5} className="snap" />}
      {d.cam && (
        <g className="snap">
          <circle cx={CX + 34} cy={CY - 14} r="7" fill={INK} />
          <circle cx={CX + 35} cy={CY - 15} r="3" fill="var(--color-sky)" />
        </g>
      )}

      {/* the dish that talks to Earth */}
      <g key={d.hga} className="snap">
        <circle cx={CX} cy={CY - 6} r={DISH_R[d.hga]} fill="var(--color-paper)" {...ink} />
        <circle cx={CX} cy={CY - 6} r={DISH_R[d.hga] * 0.45} fill="none" stroke={d.gravity ? 'var(--color-rocket)' : INK} strokeWidth="2.5" />
        <circle cx={CX} cy={CY - 6} r="3" fill={INK} />
      </g>

      <text x="14" y="26" {...label}>
        {d.power === 'solar' ? `solar wings · ${d.arrayM2} m²` : `${d.rtgs} nuclear ${d.rtgs > 1 ? 'batteries' : 'battery'}`}
      </text>
      <text x="14" y="44" {...label}>
        {d.hga} m dish{d.vaultCm > 0 ? ` · ${d.vaultCm} cm armour` : ' · no armour'}
      </text>
    </g>
  )
}
