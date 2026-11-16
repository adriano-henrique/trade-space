import { useEffect, useMemo, useRef, useState } from 'react'
import { missionStars } from '../game/progress'
import { sfx } from '../game/sfx'
import type { AnyMission, Flight, FlightEvent } from '../game/types'
import { Check, Cloud, INK, RocketArt, Stars } from './art'
import { Button, SoundToggle } from './kit'

const FLIGHT_MS = 17000
const HOLD_MS = 1700
/** A mission that fails right after launch still gets this long on screen first. */
const LOSS_WATCH_MS = 3000
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

type Phase = 'pad' | 'ascent' | 'crashed' | 'fly'

/**
 * Countdown on the pad under a blue sky, the climb into the dark, then the mission itself:
 * the clock runs, pauses on every problem, and ends with a stamp.
 */
export function FlightScreen({ mission, design, flight, onDone }: { mission: AnyMission; design: unknown; flight: Flight; onDone: () => void }) {
  const result = mission.evaluate(design)
  const tooHeavy = result.checks.some((c: { id: string; ok: boolean }) => c.id === 'rocket' && !c.ok)
  const [phase, setPhase] = useState<Phase>(() => (reducedMotion() ? (tooHeavy ? 'crashed' : 'fly') : 'pad'))
  const [count, setCount] = useState(3)

  // Pad: 3, 2, 1. Ascent: the climb (or the fall).
  useEffect(() => {
    if (phase !== 'pad') return
    sfx.beep()
    const ids = [
      setTimeout(() => {
        setCount(2)
        sfx.beep()
      }, 800),
      setTimeout(() => {
        setCount(1)
        sfx.beep()
      }, 1600),
      setTimeout(() => {
        setCount(0)
        sfx.beep(true)
        sfx.liftoff(tooHeavy ? 2.2 : 3.4)
        setPhase('ascent')
      }, 2400),
    ]
    return () => ids.forEach(clearTimeout)
  }, [phase, tooHeavy])
  useEffect(() => {
    if (phase !== 'ascent') return
    const thud = tooHeavy ? setTimeout(() => sfx.thud(), 2800) : undefined
    const id = setTimeout(() => setPhase(tooHeavy ? 'crashed' : 'fly'), 3300)
    return () => {
      clearTimeout(id)
      clearTimeout(thud)
    }
  }, [phase, tooHeavy])

  const inSpace = phase === 'fly' || (phase === 'ascent' && !tooHeavy)
  const crash = flight.events.find((e) => e.tone === 'bad')
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="space pointer-events-none fixed inset-0 transition-opacity duration-[2600ms]" style={{ opacity: inSpace ? 1 : 0 }} aria-hidden />
      <div className="relative">
        {phase !== 'fly' ? (
          <LaunchScene
            mission={mission}
            design={design}
            phase={phase}
            count={count}
            tooHeavy={tooHeavy}
            crash={crash}
            onSkip={() => setPhase(tooHeavy ? 'crashed' : 'fly')}
            onDone={onDone}
          />
        ) : (
          <Mission mission={mission} design={design} flight={flight} result={result} onDone={onDone} />
        )}
      </div>
    </div>
  )
}

function LaunchScene({
  mission,
  design,
  phase,
  count,
  tooHeavy,
  crash,
  onSkip,
  onDone,
}: {
  mission: AnyMission
  design: unknown
  phase: Phase
  count: number
  tooHeavy: boolean
  crash?: FlightEvent
  onSkip: () => void
  onDone: () => void
}) {
  const look = mission.rocketLook(design)
  const up = phase === 'ascent' || phase === 'crashed'
  useEffect(() => {
    if (phase === 'crashed') sfx.lose()
  }, [phase])
  return (
    <div className="relative h-screen overflow-hidden">
      {phase !== 'crashed' && (
        <div className="absolute right-4 top-4 z-10">
          <Button small variant="plain" onClick={onSkip}>
            Skip
          </Button>
        </div>
      )}
      <div className="absolute inset-0">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice" className={`h-full w-full ${up && !tooHeavy ? 'shake' : ''}`} role="img" aria-label={`${look.name} on the launch pad`}>
          <g className={up && !tooHeavy ? 'sink' : ''}>
            <Cloud x={170} y={120} s={1.2} />
            <Cloud x={640} y={170} s={0.9} />
            <Cloud x={520} y={60} s={0.6} />
            <path d="M-600 372 H1400 V520 H-600 Z" fill="oklch(0.8 0.09 135)" />
            <path d="M-600 372 H1400" stroke={INK} strokeWidth="3.5" />
            <rect x="350" y="372" width="100" height="10" rx="2" fill="var(--color-paper-2)" stroke={INK} strokeWidth="3" />
            <path d="M446 372 V150 M446 230 H422 M446 180 H418" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </g>
          <g transform="translate(400 372)">
            <g className={up ? (tooHeavy ? 'struggle' : 'climb') : ''}>
              <RocketArt look={look} flame={phase === 'ascent' ? 1 : 0} />
            </g>
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-[12%] text-center" aria-live="assertive">
          {phase === 'pad' && (
            <p key={count} className="count display text-[7rem] leading-none text-ink">
              {count}
            </p>
          )}
          {phase === 'ascent' && <p className="pop display text-[2.6rem] leading-none text-ink">{tooHeavy ? 'Too heavy…' : 'Liftoff!'}</p>}
        </div>
        {phase === 'crashed' && (
          <div className="absolute inset-x-0 top-[8%] px-4 text-center">
            <p className="stamp display inline-block rounded-2xl border-[5px] border-rocket bg-paper px-6 py-3 text-[2.4rem] leading-none text-rocket sm:text-[3rem]">Mission lost</p>
            <div className="pop mx-auto mt-4 max-w-[46ch] rounded-3xl bg-sky/90 px-5 py-4" style={{ animationDelay: '0.35s' }}>
              <p className="display text-[1.4rem]">{crash?.title ?? 'Too heavy for the rocket'}</p>
              <p className="mt-1">{crash?.body}</p>
              <div className="mt-3">
                <Stars n={0} size={40} />
              </div>
              <Button onClick={onDone} className="mt-3 text-[1.15rem]">
                What went wrong? →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Mission({ mission, design, flight, result, onDone }: { mission: AnyMission; design: unknown; flight: Flight; result: unknown; onDone: () => void }) {
  const total = flight.totalDays
  const lastDay = flight.lost ? Math.max(...flight.events.map((e) => e.day)) : total
  const [day, setDay] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const clock = useRef({ t: 0, last: 0, hold: 0 })

  // An event that says the same thing as an earlier one (another storm) is shown small.
  const repeats = useMemo(() => {
    const seen = new Set<string>()
    return flight.events.map((e) => {
      const again = seen.has(e.body)
      seen.add(e.body)
      return again
    })
  }, [flight])

  useEffect(() => {
    let raf = 0
    clock.current.last = performance.now()
    const tick = (now: number) => {
      const c = clock.current
      if (now >= c.hold) c.t += now - c.last
      c.last = now
      const p = Math.min(1, c.t / FLIGHT_MS)
      setDay(Math.round(p * total))
      setElapsed(c.t)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total])

  // A loss is first seen (the battery draining, the craft going dark), then announced.
  const lostAt = Math.max((lastDay / total) * FLIGHT_MS, LOSS_WATCH_MS)
  const dead = flight.lost && elapsed >= lostAt
  const visible = (e: FlightEvent) => e.day <= day && !(flight.lost && e.tone === 'bad' && e.day >= lastDay && !dead)
  const shownCount = flight.events.filter(visible).length
  const finished = day >= total || (flight.lost && elapsed >= lostAt + 1500)
  const shownDay = Math.min(day, lastDay)
  const stars = useMemo(() => missionStars(mission, design, flight), [mission, design, flight])

  // Pause the clock on each new problem so there is time to read it.
  const announced = useRef(0)
  useEffect(() => {
    if (shownCount <= announced.current) return
    const fresh = flight.events.slice(announced.current, shownCount).filter((_, i) => !repeats[announced.current + i])
    announced.current = shownCount
    if (fresh.length === 0) return
    const serious = fresh.some((e) => e.tone === 'bad' || e.tone === 'warn')
    if (serious) {
      clock.current.hold = performance.now() + HOLD_MS
      sfx.alarm()
    } else sfx.ping()
  }, [shownCount, flight, repeats])

  const ended = useRef(false)
  const verdictBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!finished || ended.current) return
    ended.current = true
    if (stars >= 2) sfx.win()
    else sfx.lose()
    verdictBox.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [finished, stars])

  const date = new Date(Date.parse(mission.launchDateOf?.(design) ?? mission.launchDate) + shownDay * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const { Viz } = mission
  const feed = useRef<HTMLOListElement>(null)
  useEffect(() => {
    feed.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [shownCount])

  const shown = flight.events.map((e, i) => ({ e, repeat: repeats[i] })).filter(({ e }) => visible(e))
  const verdict = stars === 0 ? 'Mission lost' : stars === 1 ? 'It flew, but…' : stars === 2 ? 'Mission complete' : 'Perfect mission'

  return (
    <div className="pop mx-auto grid max-w-[1240px] gap-x-8 gap-y-4 px-4 py-4 text-star lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section>
        <div className="flex items-center justify-between gap-3">
          <p className="display num text-[1.5rem] text-star">{date}</p>
          <div className="flex gap-2">
            <SoundToggle onDark />
            {!finished && (
              <button
                type="button"
                className="btn btn-small btn-plain btn-dark"
                onClick={() => {
                  clock.current.t = FLIGHT_MS
                  clock.current.hold = 0
                }}
              >
                Skip
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Viz design={design} result={result} day={shownDay} running={!finished && !dead} flight={flight} dead={dead} />
        </div>
        <Timeline flight={flight} day={shownDay} total={total} lost={dead} />
        <p className="mt-2 text-[0.88rem] text-star/65">{mission.dataNote}</p>
      </section>

      <section aria-label="Messages from your spacecraft">
        {finished && (
          <div ref={verdictBox} className="mb-6 scroll-mt-4">
            <p
              className={`stamp display inline-block rounded-2xl border-[5px] px-6 py-3 text-[2.4rem] leading-none sm:text-[3rem] ${
                stars === 0 ? 'border-rocket text-rocket' : stars === 1 ? 'border-sun text-sun' : 'border-leaf text-leaf'
              }`}
            >
              {verdict}
            </p>
            <div className="pop mt-4 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ animationDelay: '0.35s' }}>
              <Stars n={stars} size={44} onDark />
              <Button onClick={onDone} className="btn-dark text-[1.15rem]">
                {stars === 0 ? 'What went wrong?' : 'See the report'} →
              </Button>
            </div>
          </div>
        )}
        <h2 className="text-[1.3rem] text-star">Radio from space</h2>
        <ol ref={feed} className="mt-3 flex max-h-[78vh] flex-col gap-4 overflow-y-auto pr-1" aria-live="polite">
          {shown
            .map(({ e, repeat }, i) => <Message key={i} e={e} small={repeat} newest={i === shown.length - 1} />)
            .reverse()}
        </ol>
      </section>
    </div>
  )
}

function Timeline({ flight, day, total, lost }: { flight: Flight; day: number; total: number; lost: boolean }) {
  return (
    <div className="mt-2">
      <div className="relative h-4 rounded-full border-[3px] border-star bg-space-2">
        <div className={`h-full origin-left rounded-full ${lost ? 'bg-rocket' : 'bg-sun'}`} style={{ transform: `scaleX(${day / total})` }} />
        {flight.events
          .filter((e) => e.tone === 'bad' || e.tone === 'warn')
          .map((e, i) => (
            <span
              key={i}
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-space ${e.day <= day ? (e.tone === 'bad' ? 'bg-rocket' : 'bg-sun') : 'bg-star/40'}`}
              style={{ left: `${Math.min(99, Math.max(1, (e.day / total) * 100))}%` }}
            />
          ))}
      </div>
      <p className="num mt-1 text-[0.92rem] font-semibold text-star/80">
        Day {day.toLocaleString('en-US')} of {total.toLocaleString('en-US')}
      </p>
    </div>
  )
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function Message({ e, small, newest, onDark = true }: { e: FlightEvent; small?: boolean; newest?: boolean; onDark?: boolean }) {
  const soft = onDark ? 'text-star/70' : 'text-ink-soft'
  if (small)
    return (
      <li className={`flex items-center gap-2 text-[0.92rem] ${soft}`}>
        <Tone tone={e.tone} size={18} />
        <span className="font-semibold">{e.title}</span>
        <span className="num">· {shortDate(e.date)}</span>
      </li>
    )
  return (
    <li className={`pop flex gap-3 ${newest ? '' : 'opacity-80'}`}>
      <div className="pt-0.5">
        <Tone tone={e.tone} size={newest ? 30 : 24} />
      </div>
      <div className="min-w-0">
        <p className={`display leading-tight ${newest ? 'text-[1.45rem]' : 'text-[1.1rem]'} ${e.tone === 'bad' ? 'text-rocket' : ''}`}>{e.title}</p>
        <p className={`num text-[0.86rem] ${soft}`}>{shortDate(e.date)}</p>
        <p className="mt-1 max-w-[58ch]">{e.body}</p>
        {e.echo && (
          <p className={`mt-2 max-w-[58ch] border-t-2 border-dashed pt-2 ${onDark ? 'border-star/30' : 'border-ink/25'}`}>
            <span className={`display ${onDark ? 'text-sun' : 'text-grape'}`}>This really happened: {e.echo.mission}.</span> {e.echo.story}
          </p>
        )}
        {e.link && (
          <a href={e.link} target="_blank" rel="noreferrer" className={`mt-1 inline-block text-[0.9rem] font-semibold underline underline-offset-4 ${onDark ? 'text-sun' : 'text-grape'}`}>
            See NASA’s record of it
          </a>
        )}
      </div>
    </li>
  )
}

function Tone({ tone, size }: { tone: FlightEvent['tone']; size: number }) {
  if (tone === 'good') return <Check state="ok" size={size} />
  if (tone === 'bad') return <Check state="bad" size={size} />
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <circle r="10" fill={tone === 'warn' ? 'var(--color-sun)' : 'var(--color-sky)'} stroke={INK} strokeWidth="2.5" />
      {tone === 'warn' ? (
        <path d="M0 -5 V1.5 M0 5.2 V5.3" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M-4 3 Q0 -6 4 3" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  )
}
