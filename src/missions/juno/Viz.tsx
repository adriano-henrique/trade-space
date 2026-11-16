import type { VizProps } from '../../game/types'
import { JupiterArt } from '../../ui/art'
import { MiniCraft, NeedGauge, Sun } from '../../ui/hud'
import { MISSION, type Design, type Result } from './model'

const LAUNCH = Date.parse(MISSION.launchDate)
const FLYBY_DAY = Math.round((Date.parse('2013-10-09') - LAUNCH) / 86400000)

/** Cruise: the inner solar system with the real shape of the path. At Jupiter: the orbit vs the belts. */
export function JunoViz({ design, result, day, dead }: VizProps<Design, Result>) {
  const arrival = design.trajectory === 'flyby' ? Math.round((Date.parse('2016-07-05') - LAUNCH) / 86400000) : Math.round(result.cruiseYears * 365)
  return day < arrival ? <Cruise design={design} result={result} day={day} arrival={arrival} /> : <AtJupiter design={design} result={result} day={day - arrival} dead={dead} />
}

const SCALE = 21 // px per AU
const CX = 262
const CY = 160

function Cruise({ design, result, day, arrival }: { design: Design; result: Result; day: number; arrival: number }) {
  // Path: flyby = out to ~2.2 AU and back to Earth (1 AU), then out to Jupiter. Direct = straight spiral out.
  const pos = (t: number) => {
    let r: number
    let theta: number
    if (design.trajectory === 'flyby' && t < FLYBY_DAY) {
      const p = t / FLYBY_DAY
      r = 1 + 1.2 * Math.sin(Math.PI * p)
      theta = p * 2 * Math.PI
    } else {
      const start = design.trajectory === 'flyby' ? FLYBY_DAY : 0
      const p = (t - start) / (arrival - start)
      r = 1 + ((5.2 - 1) * (1 - Math.cos(Math.PI * p))) / 2
      theta = (design.trajectory === 'flyby' ? 2 * Math.PI : 0) + p * Math.PI
    }
    return { r, x: CX + r * SCALE * Math.cos(theta), y: CY - r * SCALE * Math.sin(theta) }
  }
  const pts: string[] = []
  for (let t = 0; t <= arrival; t += 10) {
    const p = pos(t)
    pts.push(`${p.x},${p.y}`)
  }
  const here = pos(day)
  const earthAngle = (day / 365.25) * 2 * Math.PI
  const jupiterArrivalAngle = (design.trajectory === 'flyby' ? 3 : 1) * Math.PI
  const jAngle = jupiterArrivalAngle - ((arrival - day) / (11.86 * 365.25)) * 2 * Math.PI
  // Sunlight falls off with the square of the distance, so solar power does too.
  const power = design.power === 'solar' ? design.arrayM2 * result.wPerM2AtJupiter * (5.2 / here.r) ** 2 : result.powerW
  return (
    <svg viewBox="0 0 400 300" className="mx-auto w-full" role="img" aria-label="Your path from Earth to Jupiter">
      <circle cx={CX} cy={CY} r={SCALE} fill="none" stroke="var(--color-star)" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={SCALE * 5.2} fill="none" stroke="var(--color-star)" strokeOpacity="0.25" strokeWidth="1.5" />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--color-sun)" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      <Sun x={CX} y={CY} r={8} />
      <circle cx={CX + SCALE * Math.cos(earthAngle)} cy={CY - SCALE * Math.sin(earthAngle)} r="5" fill="oklch(0.68 0.13 240)" stroke="var(--color-star)" strokeWidth="1.5" />
      <g transform={`translate(${CX + SCALE * 5.2 * Math.cos(jAngle)} ${CY - SCALE * 5.2 * Math.sin(jAngle)})`}>
        <JupiterArt r={11} />
      </g>
      <MiniCraft x={here.x} y={here.y} scale={0.75} />
      <NeedGauge
        title={design.power === 'solar' ? 'Solar power' : 'Nuclear power'}
        value={power}
        need={result.powerNeededW}
        unit="watts"
        note={design.power === 'solar' ? `${here.r.toFixed(1)} times as far from the Sun as Earth` : undefined}
      />
      <text x="16" y="288" fontSize="13" fill="var(--color-star)" opacity="0.75">
        {design.trajectory === 'flyby' ? (day < FLYBY_DAY ? 'Looping back toward Earth for a boost' : 'Boosted by Earth, heading for Jupiter') : 'Straight to Jupiter'}
      </text>
    </svg>
  )
}

function AtJupiter({ design, result, day, dead }: { design: Design; result: Result; day: number; dead: boolean }) {
  const polar = design.orbit !== 'equatorial'
  const period = result.orbitDays
  const a = ((day % period) / period) * 2 * Math.PI
  // Highly elliptical polar orbit drawn vertically; equatorial drawn as a flat ellipse through the belts.
  const x = polar ? 230 + 26 * Math.sin(a) : 230 + 105 * Math.cos(a)
  const y = polar ? 92 + 92 * Math.cos(a) : 150 + 20 * Math.sin(a)
  const passes = Math.floor(day / period)
  return (
    <svg viewBox="0 0 400 300" className="mx-auto w-full" role="img" aria-label={polar ? 'Polar orbit diving under the radiation belts' : 'Orbit inside the radiation belts'}>
      <ellipse cx="230" cy="150" rx="135" ry="26" fill="var(--color-grape)" opacity="0.35" />
      <ellipse cx="230" cy="150" rx="96" ry="18" fill="var(--color-grape)" opacity="0.5" />
      <text x="366" y="118" textAnchor="end" fontSize="13" fill="oklch(0.8 0.12 300)" fontWeight="600">
        radiation belts
      </text>
      <g transform="translate(230 150)">
        <JupiterArt r={40} />
      </g>
      {polar ? (
        <ellipse cx="230" cy="92" rx="26" ry="92" fill="none" stroke="var(--color-star)" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      ) : (
        <ellipse cx="230" cy="150" rx="105" ry="20" fill="none" stroke="var(--color-star)" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      )}
      <MiniCraft x={x} y={y} dead={dead} scale={0.8} />
      <g transform="translate(16 18)">
        <text x="0" y="0" fontSize="13" fill="var(--color-star)" fontWeight="700">
          Close passes
        </text>
        <text x="0" y="30" fontSize="26" fill="var(--color-star)" fontFamily="var(--font-display)" className="num">
          {Math.min(passes, result.survivable)}
        </text>
        <text x="0" y="48" fontSize="13" fill="var(--color-star)" opacity="0.75">
          you need {MISSION.requiredPasses}
        </text>
        <text x="0" y="65" fontSize="13" fill={result.survivable >= MISSION.requiredPasses ? 'var(--color-star)' : 'var(--color-rocket)'} opacity="0.9">
          electronics last {result.survivable}
        </text>
      </g>
      <text x="16" y="288" fontSize="13" fill="var(--color-star)" opacity="0.75">
        {polar ? 'Over the poles: ducking under the belts' : 'Around the middle: through the belts on every lap'}
      </text>
    </svg>
  )
}
