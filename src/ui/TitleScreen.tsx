import { useEffect, useState } from 'react'
import voyager from '../data/voyager1-range.json'
import { SPEED_OF_LIGHT } from '../physics/model'
import { LEVELS, MEDAL_LIMITS, type Level } from '../game/level'
import type { StarBook } from '../game/progress'
import { sfx } from '../game/sfx'
import type { AnyMission } from '../game/types'
import { Cloud, PlanetArt, Stars } from './art'
import { AidMarks, Button, SoundToggle } from './kit'

const LEVEL = ['Start here', 'Harder', 'Hardest']
const PLANET_R = { earth: 74, jupiter: 98, uranus: 66 }
// The three missions sit on a rising arc, like stops on a flight path.
const LIFT = ['md:mt-14', 'md:mt-5', 'md:mt-0']

export function TitleScreen({
  missions,
  stars,
  level,
  onLevel,
  onPlay,
}: {
  missions: AnyMission[]
  stars: StarBook
  level: Level
  onLevel: (l: Level) => void
  onPlay: (id: string) => void
}) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-[1180px] flex-col px-4 pb-6 pt-4">
      <svg viewBox="0 0 1180 300" className="pointer-events-none absolute inset-x-0 top-6 w-full" aria-hidden>
        <Cloud x={980} y={70} s={1.6} />
        <Cloud x={640} y={36} s={0.9} />
        <Cloud x={120} y={250} s={1.1} />
      </svg>

      <div className="relative flex justify-end">
        <SoundToggle />
      </div>

      <div className="relative -mt-6 grid items-start gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <header>
          <h1 className="text-[clamp(3.2rem,10vw,6.4rem)] leading-[0.92]">
            Trade <span className="text-rocket">Space</span>
          </h1>
          <p className="mt-3 max-w-[34ch] text-[1.3rem] leading-snug">
            Hire a crew. Build a real space mission. Launch it. <span className="font-semibold">Find out if it survives.</span>
          </p>
        </header>
        <fieldset className="lg:mt-10 lg:w-[440px]">
          <legend className="display text-[1.15rem]">Who’s flying?</legend>
          <p className="mt-0.5 text-[0.94rem] leading-snug">Same missions, same physics. Your level sets how much help you get on each guess, and how close a guess must be for a medal.</p>
          <div className="mt-2.5 grid gap-2" role="radiogroup" aria-label="Level">
            {LEVELS.map((l) => {
              const earned = missions.reduce((sum, m) => sum + (stars[l.id][m.id] ?? 0), 0)
              return (
                <button
                  type="button"
                  key={l.id}
                  role="radio"
                  aria-checked={level === l.id}
                  onClick={() => {
                    sfx.clunk()
                    onLevel(l.id)
                  }}
                  className="pick !py-2"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="display text-[1.05rem]">{l.name}</span>
                    <span className="text-[0.88rem] font-semibold">{l.who}</span>
                  </span>
                  <span className="block text-[0.9rem] leading-snug">{l.what}</span>
                  <span className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                    <AidMarks level={l.id} />
                    <span className="num text-[0.86rem] font-semibold">Gold medal within {MEDAL_LIMITS[l.id][1]}×</span>
                  </span>
                  {earned > 0 && (
                    <span className="num mt-1 block text-[0.84rem] font-semibold text-ink-soft">
                      {earned} of {missions.length * 3} stars earned
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <section className="relative mt-8" aria-label="Missions">
        <svg viewBox="0 0 1180 420" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" aria-hidden>
          <path d="M200 150 C 360 60, 480 110, 590 90 S 880 10, 990 50" fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" />
        </svg>
        <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          {missions.map((m, i) => {
            const r = PLANET_R[m.place as keyof typeof PLANET_R]
            const pad = m.place === 'uranus' ? 1.85 : 1.1
            const earned = stars[level][m.id]
            return (
              <li key={m.id} className={`flex flex-col items-center text-center ${LIFT[i]}`}>
                <button type="button" onClick={() => onPlay(m.id)} aria-label={`Play ${m.name}`} className="rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-grape" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                  <svg viewBox={`${-r * pad} ${-r * pad} ${r * pad * 2} ${r * pad * 2}`} width={r * pad * 2} height={r * pad * 2} aria-hidden className={`block ${i === 0 ? 'bob' : ''}`}>
                    <PlanetArt place={m.place} r={r} />
                  </svg>
                </button>
                <p className="font-semibold text-ink-soft">
                  Mission {i + 1} · {LEVEL[i]}
                </p>
                <h2 className="mt-0.5 text-[1.9rem]">{m.name}</h2>
                <p className="mt-1 max-w-[32ch]">{level === 'engineer' ? m.teaser : m.pitch}</p>
                {earned !== undefined && (
                  <div className="mt-2">
                    <Stars n={earned} size={28} />
                  </div>
                )}
                <Button onClick={() => onPlay(m.id)} variant={i === 0 && earned === undefined ? 'go' : 'primary'} className="mt-3">
                  {earned !== undefined ? 'Fly again' : 'Play'}
                </Button>
              </li>
            )
          })}
        </ol>
      </section>

      <footer className="relative mt-auto pt-12">
        <VoyagerLine />
        <p className="mt-3 text-[0.84rem] text-ink-soft">Real data: NASA DONKI space weather, JPL Horizons planet positions, NASA/JPL mission pages. Built for the NASA Space Apps Challenge 2026.</p>
      </footer>
    </div>
  )
}

/** Voyager 1's live one-way light time, interpolated from a JPL Horizons ephemeris table. */
function VoyagerLine() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const km = rangeAt(now)
  if (km === null) return null
  const s = km / SPEED_OF_LIGHT
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <p className="max-w-[70ch] text-[1.02rem]">
      <span className="display">Happening right now:</span> Voyager 1 is so far away that a radio “hello” takes{' '}
      <span className="display num whitespace-nowrap">
        {h}h {pad(m)}m {pad(sec)}s
      </span>{' '}
      to reach it. {s >= 86400 ? 'That is more than a whole day at the speed of light, a first for any spacecraft.' : 'This week that becomes a whole day at the speed of light, a first for any spacecraft.'}
    </p>
  )
}

function rangeAt(t: number): number | null {
  const rows = voyager.rows as [number, number][]
  if (t < rows[0][0] || t > rows[rows.length - 1][0]) return null
  let i = rows.findIndex((r) => r[0] > t) - 1
  if (i < 0) i = rows.length - 2
  const [t0, d0] = rows[i]
  const [t1, d1] = rows[i + 1]
  return d0 + ((t - t0) / (t1 - t0)) * (d1 - d0)
}
