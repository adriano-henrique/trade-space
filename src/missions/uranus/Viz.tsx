import type { VizProps } from '../../game/types'
import { JupiterArt, UranusArt } from '../../ui/art'
import { MiniCraft, NeedGauge, Sun } from '../../ui/hud'
import { jdOfYear, planetLongitudes, type Design, type Result } from './model'

const CX = 262
const CY = 160
const r = (au: number) => 8 + 23.5 * Math.sqrt(au) // compressed scale so Earth and Uranus both fit

/** Power right now: nuclear batteries fade 2% a year; solar fades with distance squared. */
function powerNow(d: Design, res: Result, years: number, au: number) {
  return d.power === 'rtg' ? d.rtgs * 245 * 0.98 ** years : d.arrayM2 * res.solarWPerM2 * (19.2 / au) ** 2
}

/** Cruise: real positions of Jupiter and Uranus from JPL ephemerides. At Uranus: the tipped planet. */
export function UranusViz({ design, result, day, dead }: VizProps<Design, Result>) {
  const arrival = Math.round(result.cruiseYears * 365.25)
  if (day >= arrival) return <AtUranus design={design} result={result} day={day - arrival} years={day / 365.25} dead={dead} />
  const jd = jdOfYear(design.launchYear) + day
  const { jupiter, uranus } = planetLongitudes(jd)
  const pt = (au: number, lonDeg: number | null) => {
    const a = ((lonDeg ?? 0) * Math.PI) / 180
    return [CX + r(au) * Math.cos(a), CY - r(au) * Math.sin(a)] as const
  }
  const launchLon = (planetLongitudes(jdOfYear(design.launchYear)).jupiter ?? 0) - 40
  const arriveLon = planetLongitudes(jdOfYear(design.launchYear) + arrival).uranus ?? 0
  let sweep = arriveLon - launchLon
  while (sweep < 0) sweep += 360
  const p = day / arrival
  const au = 1 + ((19.2 - 1) * (1 - Math.cos(Math.PI * Math.min(1, p * 1.1)))) / 2
  const [sx, sy] = pt(au, launchLon + sweep * p)
  const [jx, jy] = pt(5.2, jupiter)
  const [ux, uy] = pt(19.2, uranus)
  const earthA = (day / 365.25) * 2 * Math.PI
  return (
    <svg viewBox="0 0 400 300" className="mx-auto w-full" role="img" aria-label="Your cruise to Uranus, with the real positions of the planets">
      {[1, 5.2, 19.2].map((a) => (
        <circle key={a} cx={CX} cy={CY} r={r(a)} fill="none" stroke="var(--color-star)" strokeOpacity="0.25" strokeWidth="1.5" />
      ))}
      <Sun x={CX} y={CY} r={6} />
      <circle cx={CX + r(1) * Math.cos(earthA)} cy={CY - r(1) * Math.sin(earthA)} r="4" fill="oklch(0.68 0.13 240)" stroke="var(--color-star)" strokeWidth="1.5" />
      <g transform={`translate(${jx} ${jy})`}>
        <JupiterArt r={10} />
      </g>
      <g transform={`translate(${ux} ${uy})`}>
        <UranusArt r={8} />
      </g>
      <MiniCraft x={sx} y={sy} scale={0.7} />
      <NeedGauge
        title={design.power === 'rtg' ? 'Nuclear power' : 'Solar power'}
        value={powerNow(design, result, day / 365.25, au)}
        need={result.powerNeededW}
        unit="watts"
        note={`${(day / 365.25).toFixed(1)} years since launch`}
      />
      <text x="16" y="288" fontSize="13" fill="var(--color-star)" opacity="0.75">
        Real positions of Jupiter and Uranus, from NASA’s JPL
      </text>
    </svg>
  )
}

function AtUranus({ design, result, day, years, dead }: { design: Design; result: Result; day: number; years: number; dead: boolean }) {
  const a = (day / 30) * 2 * Math.PI
  return (
    <svg viewBox="0 0 400 300" className="mx-auto w-full" role="img" aria-label="Your spacecraft orbiting Uranus, which is tipped on its side">
      <ellipse cx="240" cy="160" rx="118" ry="64" fill="none" stroke="var(--color-star)" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      <g transform="translate(240 160)">
        <UranusArt r={40} />
      </g>
      <MiniCraft x={240 + 118 * Math.cos(a)} y={160 + 64 * Math.sin(a)} dead={dead} scale={0.8} />
      <NeedGauge
        title={design.power === 'rtg' ? 'Nuclear power' : 'Solar power'}
        value={dead ? 0 : powerNow(design, result, years, 19.2)}
        need={result.powerNeededW}
        unit="watts"
        note={`${years.toFixed(1)} years since launch`}
      />
      <text x="16" y="288" fontSize="13" fill="var(--color-star)" opacity="0.75">
        Uranus is tipped on its side · {design.tourYears}-year tour
      </text>
    </svg>
  )
}
