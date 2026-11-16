import { useEffect, useState } from 'react'
import type { VizProps } from '../../game/types'
import { EarthArt } from '../../ui/art'
import type { Design, Result } from './model'

const CX = 200
const CY = 152
const R = 68

/** Earth seen from above the north pole with the Sun to the right; the satellite laps it. */
export function SmapViz({ design, result, running, day, flight, dead }: VizProps<Design, Result>) {
  const [angle, setAngle] = useState(0.6)
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      setAngle((a) => (a + ((t - last) / 1000) * 1.5) % (Math.PI * 2))
      last = t
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const r = R + 20 + (design.altitude - 400) / 11
  // Dawn–dusk orbits are seen edge-on to the Sun line; noon orbits cut straight through the shadow.
  const dawnDusk = design.orbit === 'dawn-dusk'
  const x = CX + r * Math.cos(angle)
  const y = CY + r * Math.sin(angle) * (dawnDusk ? 0.28 : 1)
  const half = Math.asin(R / r)
  const inShadow = !dawnDusk && Math.cos(angle) < 0 && Math.abs(Math.sin(angle) * r) < R

  // Battery: each trip through the shadow drains it; sunlight refills it. A battery sized exactly
  // right drains 30% per lap. Undersized ones hit empty.
  const depth = (0.3 * result.batteryNeededWh) / Math.max(1, design.batteryWh)
  const season = flight.events.some((e) => e.title.startsWith('Eclipse season') && day >= e.day && day < e.day + 75)
  let level = 1
  if (dead) level = 0
  else if (season) level = 0.12
  else if (!dawnDusk) {
    const a = (angle + Math.PI * 2) % (Math.PI * 2)
    const enter = Math.PI - half
    const exit = Math.PI + half
    if (a >= enter && a <= exit) level = Math.max(0, 1 - depth * ((a - enter) / (2 * half)))
    else {
      const since = a > exit ? a - exit : a + Math.PI * 2 - exit
      const low = Math.max(0, 1 - depth)
      level = Math.min(1, low + (1 - low) * (since / 1.6))
    }
  }
  const storm = flight.events.find((e) => e.title.startsWith('Geomagnetic storm') && day >= e.day && day < e.day + 22)
  const sleeping = dead || season

  return (
    <svg viewBox="0 0 400 300" className="mx-auto w-full" role="img" aria-label={`Your satellite orbiting Earth at ${design.altitude} km`}>
      {/* Earth's shadow, stretching away from the Sun */}
      <rect x="0" y={CY - R} width={CX} height={R * 2} fill="oklch(0.1 0.03 275)" opacity="0.75" />
      <text x="14" y={CY + 5} fontSize="13" fill="var(--color-star)" opacity="0.6" fontWeight="600">
        Earth’s shadow
      </text>
      <g transform="translate(372 40)">
        <circle r="17" fill="var(--color-sun)" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1="-22" x2="0" y2="-29" stroke="var(--color-sun)" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <ellipse cx={CX} cy={CY} rx={r} ry={r * (dawnDusk ? 0.28 : 1)} fill="none" stroke="var(--color-star)" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      <g transform={`translate(${CX} ${CY})`}>
        <EarthArt r={R} night />
        {storm && (
          <g>
            <circle r={R + 7} fill="none" stroke="var(--color-leaf)" strokeWidth="5" strokeDasharray="10 7" opacity="0.9" style={{ animation: 'twinkle 0.5s linear infinite' }} />
            <circle r={R + 15} fill="none" stroke="var(--color-grape)" strokeWidth="3" strokeDasharray="5 9" opacity="0.8" style={{ animation: 'twinkle 0.7s linear infinite' }} />
          </g>
        )}
      </g>
      {storm && (
        <text x={CX} y="262" textAnchor="middle" fontSize="15" fill="var(--color-leaf)" fontFamily="var(--font-display)">
          Solar storm hits Earth
        </text>
      )}

      {/* the satellite */}
      <g transform={`translate(${x} ${y})`} opacity={inShadow && !sleeping ? 0.75 : 1}>
        <rect x="-17" y="-3.5" width="34" height="7" rx="1.5" fill={sleeping ? 'oklch(0.45 0.02 270)' : 'oklch(0.62 0.14 255)'} stroke="var(--color-space)" strokeWidth="1.5" />
        <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill={sleeping ? 'oklch(0.55 0.02 270)' : 'var(--color-sun)'} stroke="var(--color-space)" strokeWidth="1.5" />
      </g>

      {/* battery gauge */}
      <g transform="translate(16 20)">
        <rect x="0" y="0" width="96" height="30" rx="7" fill="var(--color-space-2)" stroke="var(--color-star)" strokeWidth="3" />
        <rect x="96" y="9" width="6" height="12" rx="2" fill="var(--color-star)" />
        <rect x="5" y="5" width={Math.max(0, 86 * level)} height="20" rx="3.5" fill={level > 0.5 ? 'var(--color-leaf)' : level > 0.2 ? 'var(--color-sun)' : 'var(--color-rocket)'} />
        <text x="0" y="50" fontSize="13" fill="var(--color-star)" fontWeight="600">
          {dead ? 'Battery dead' : season ? 'Safe mode: saving power' : inShadow ? 'In the dark: on battery' : 'In sunlight: charging'}
        </text>
      </g>

      <text x="14" y="288" fontSize="13" fill="var(--color-star)" opacity="0.75" className="num">
        {design.altitude} km up · one lap every {result.period.toFixed(0)} minutes
      </text>
    </svg>
  )
}
