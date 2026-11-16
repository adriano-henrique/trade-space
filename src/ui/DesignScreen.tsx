import { useEffect, useRef, useState } from 'react'
import { DEPARTMENTS, useCrew } from '../game/crew'
import { useLevel, type Level } from '../game/level'
import { formatValue, medal } from '../game/medal'
import { sfx } from '../game/sfx'
import type { AnyMission, Check as CheckT, Evaluation } from '../game/types'
import { Check, Cloud, INK, MedalToken, RocketArt, rocketHeight } from './art'
import { CrewRow } from './Crew'
import { Notebook } from './Formula'
import type { Estimate } from './Guess'
import { GuessCard } from './Guess'
import { AidMarks, Button, Gauge, LevelSwitch, Say, SoundToggle } from './kit'

export function DesignScreen({
  mission,
  design,
  estimates,
  onLevel,
  onDesign,
  onEstimate,
  onLaunch,
  onBriefing,
  onBack,
}: {
  mission: AnyMission
  design: unknown
  estimates: Record<string, Estimate>
  onLevel: (l: Level) => void
  onDesign: (d: unknown) => void
  onEstimate: (id: string, e: Estimate) => void
  onLaunch: () => void
  onBriefing: () => void
  onBack: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [notebook, setNotebook] = useState(false)
  const lv = useLevel()
  const { head } = useCrew()
  const result: Evaluation & Record<string, unknown> = mission.evaluate(design)
  const step = mission.steps[stepIndex]
  const { Controls } = mission
  const last = stepIndex === mission.steps.length - 1

  const failing = result.checks.filter((c) => !c.ok && !c.hiddenUntilFlight)
  const unsized = Object.values(mission.metrics).filter((m) => m.sizes && (m.applies?.(design) ?? true) && !estimates[m.id])
  const ready = failing.length === 0 && unsized.length === 0

  useCheckSounds(result.checks)

  const goStep = (i: number) => {
    setStepIndex(i)
    setOpen(null)
    setConfirming(false)
    sfx.tap()
  }
  const launch = () => {
    if (ready || confirming) onLaunch()
    else {
      setConfirming(true)
      sfx.alarm()
    }
  }
  const openGuess = (id: string) => {
    setOpen(id)
    requestAnimationFrame(() => document.getElementById('guess')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const warning = [
    failing.length > 0 ? `${failing.length} light${failing.length > 1 ? 's are' : ' is'} still red` : '',
    unsized.length > 0 ? `you haven’t sized the ${unsized.map((m) => (lv.expert && m.tech ? m.tech.label : m.label).toLowerCase()).join(' or the ')}` : '',
  ]
    .filter(Boolean)
    .join(', and ')

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-4">
      {notebook && lv.aids.formula && <Notebook mission={mission} design={design} result={result} estimates={estimates} onClose={() => setNotebook(false)} />}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Button small variant="plain" onClick={onBack}>
          ← Missions
        </Button>
        <h1 className="order-last w-full text-[1.9rem] sm:order-none sm:w-auto sm:flex-1 sm:text-[2.3rem]">{mission.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <LevelSwitch value={lv.level} onChange={onLevel} />
          <Button small variant="plain" onClick={onBriefing}>
            Briefing
          </Button>
          {lv.aids.formula && (
            <Button small variant={notebook ? 'primary' : 'plain'} onClick={() => setNotebook(!notebook)}>
              Notebook
            </Button>
          )}
          <SoundToggle />
        </div>
      </header>
      <p className="mt-1 max-w-[70ch] text-[1.05rem]">
        {lv.say(mission.pitch, mission.objective)} <span className="font-semibold">{lv.say('Turn every light green, then launch.', 'Meet every requirement, then launch.')}</span>
      </p>

      {/* On a phone the spacecraft stays pinned to the top while you scroll the steps. */}
      <div className="mt-4 grid items-start gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <section className="contents lg:sticky lg:top-4 lg:block" aria-label="Your spacecraft">
          <div className="sticky top-0 z-10 -mx-4 bg-sky px-4 lg:static lg:mx-0 lg:px-0">
            <Stage mission={mission} design={design} result={result} />
          </div>
          <Lights checks={result.checks} />
          <div className="order-last grid items-start gap-x-5 gap-y-3 sm:grid-cols-3 lg:order-none lg:mt-4">
            {result.bars.map((b) => (
              <Gauge key={b.label} {...b} label={lv.expert ? b.label : (GAUGE_WORDS[b.label] ?? b.label)} />
            ))}
            {lv.detail && mission.readout && (
              <dl className="num grid grid-cols-2 gap-x-6 gap-y-1 border-t-[3px] border-dashed border-ink/25 pt-3 text-[0.9rem] sm:col-span-3 sm:grid-cols-3">
                {mission.readout(design, result).map(([k, v]: [string, string]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-ink-soft">{k}</dt>
                    <dd className="font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="sm:col-span-3">
              <CrewRow onChange={onBriefing} />
            </div>
          </div>
        </section>

        <section className="sheet p-4 sm:p-5" aria-label="Build steps">
          <nav className="flex gap-1.5" aria-label="Steps">
            {mission.steps.map((s, i) => (
              <button
                type="button"
                key={s.id}
                onClick={() => goStep(i)}
                aria-current={i === stepIndex ? 'step' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border-[3px] px-1 py-1.5 transition-colors ${
                  i === stepIndex ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-soft hover:bg-paper-2'
                }`}
              >
                <span className="display flex items-center gap-1 text-lg leading-none">
                  {i + 1}
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current" style={{ backgroundColor: DEPARTMENTS[s.role].color }} />
                </span>
                <span className="w-full truncate text-center text-[0.82rem] font-semibold">{s.title}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4" key={step.id}>
            <Say who={head(step.role)}>{lv.expert && step.techSay ? step.techSay(design, result) : step.say(design, result)}</Say>
            <div className="pop mt-5">
              <Controls
                step={step.id}
                design={design}
                result={result}
                set={(patch: object) => onDesign({ ...(design as object), ...patch })}
                openGut={openGuess}
                estimated={(id: string) => Boolean(estimates[id])}
              />
            </div>

            {(step.guesses?.length ?? 0) > 0 && (
              <div className="mt-5 border-t-[3px] border-dashed border-ink/25 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="display text-grape">{lv.say('Can you guess?', 'Estimate before you look')}</p>
                  <AidMarks level={lv.level} />
                </div>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {step.guesses!.map((id: string) => {
                    const m = mission.metrics[id]
                    const e = estimates[id]
                    const truth = m.truth(design, result)
                    return (
                      <li key={id}>
                        <button type="button" onClick={() => openGuess(id)} aria-expanded={open === id} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-grape/12">
                          {e ? <MedalToken tier={medal(e.value, truth, e.level).tier} size={30} /> : <Check state="mystery" size={30} />}
                          <span className="min-w-0">
                            <span className="block font-semibold leading-tight">{lv.expert && m.tech ? m.tech.label : m.label}</span>
                            <span className="num block text-[0.9rem] text-ink-soft">{e ? formatValue(truth, m.unit) : lv.say('Tap to guess', `?? ${m.unit}`)}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {open && (
              <div id="guess" className="mt-4 scroll-mt-4">
                <GuessCard
                  key={open}
                  metric={mission.metrics[open]}
                  design={design}
                  result={result}
                  previous={mission.metrics[open].sizes ? undefined : estimates[open]}
                  sizedAt={mission.metrics[open].sizes && estimates[open] ? estimates[open].value : undefined}
                  onClose={() => setOpen(null)}
                  onLock={(e) => {
                    onEstimate(open, e)
                    const field = mission.metrics[open].sizes
                    // The size it is built at follows from the estimate and the crew's margin.
                    if (field) onDesign({ ...(design as object), [field]: e.value })
                  }}
                />
              </div>
            )}
          </div>

          {confirming && !ready && (
            <div className="pop mt-5">
              <Say mood="worried" who={head('director')}>
                Hold on: {warning}. You can launch anyway and see what happens.</Say>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="plain" onClick={() => goStep(stepIndex - 1)} disabled={stepIndex === 0}>
              Back
            </Button>
            {last ? (
              <Button variant="go" onClick={launch} className="text-[1.2rem]">
                {confirming && !ready ? 'Launch anyway' : 'Launch!'}
              </Button>
            ) : (
              <Button onClick={() => goStep(stepIndex + 1)}>
                Next: {mission.steps[stepIndex + 1].title} <span className="nudge inline-block">→</span>
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const GAUGE_WORDS: Record<string, string> = {
  'Mass on the rocket': 'Weight',
  Cost: 'Money',
  'Data sent home': 'Data that gets home',
}

/** The build site: your spacecraft on its stand, the rocket waiting on the pad. */
function Stage({ mission, design, result }: { mission: AnyMission; design: unknown; result: Evaluation }) {
  const { Craft } = mission
  const look = mission.rocketLook(design)
  const tooHeavy = result.checks.some((c) => c.id === 'rocket' && !c.ok)
  return (
    <svg viewBox="0 0 640 400" className="w-full" role="img" aria-label={`Your ${mission.name} spacecraft and its ${look.name} rocket`}>
      <Cloud x={110} y={52} s={1.1} />
      <Cloud x={470} y={86} s={0.8} />
      <Cloud x={300} y={30} s={0.6} />
      {/* ground */}
      <path d="M0 360 H640 V400 H0 Z" fill="oklch(0.8 0.09 135)" />
      <path d="M0 360 H640" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* work stand, with a post that reaches up behind the spacecraft */}
      <path d="M240 306 V236" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M190 360 L214 306 H266 L290 360 M202 333 H278" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      <svg x="0" y="-16" width="480" height="360" viewBox="0 0 400 300" overflow="visible">
        <Craft design={design} result={result} />
      </svg>
      {/* pad, tower and rocket */}
      <g transform="translate(562 360)">
        <path d={`M38 0 V${-rocketHeight(look.size) * 0.92} M38 ${-rocketHeight(look.size) * 0.55} H18 M38 ${-rocketHeight(look.size) * 0.85} H14`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <rect x="-44" y="0" width="96" height="9" rx="2" fill="var(--color-paper-2)" stroke={INK} strokeWidth="3" />
        <g key={look.name} className="snap">
          <RocketArt look={look} />
        </g>
        <text y="-8" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="var(--font-sans)" transform={`translate(0 ${-rocketHeight(look.size) - 12})`}>
          <tspan x="0" fill={INK}>
            {look.name}
          </tspan>
        </text>
        {tooHeavy && (
          <text y="30" textAnchor="middle" fontSize="15" fill="var(--color-rocket)" fontFamily="var(--font-display)">
            Too small!
          </text>
        )}
      </g>
    </svg>
  )
}

/** Mission lights: one per goal. Green = met, red = not yet, purple = you find out in flight. */
function Lights({ checks }: { checks: CheckT[] }) {
  const firstBad = checks.find((c) => !c.ok && !c.hiddenUntilFlight)
  const [picked, setPicked] = useState<string | null>(null)
  const shown = checks.find((c) => c.id === picked) ?? firstBad ?? checks[0]
  const lv = useLevel()
  const label = lv.expert && shown.tech ? shown.tech.label : shown.label
  const detail = lv.expert && shown.tech ? shown.tech.detail : cap(shown.detail)
  return (
    <div className="mt-1">
      <ul className="flex flex-wrap gap-2">
        {checks.map((c) => {
          const state = c.hiddenUntilFlight ? 'mystery' : c.ok ? 'ok' : 'bad'
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setPicked(c.id)}
                aria-pressed={shown.id === c.id}
                className={`chip flex items-center gap-1.5 rounded-full border-[3px] border-ink py-1 pl-1 pr-3 text-[0.92rem] font-semibold transition-colors ${
                  shown.id === c.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2'
                }`}
              >
                <Check state={state} />
                {c.short ?? c.label}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 min-h-[2.9em] text-[0.98rem]" aria-live="polite">
        <span className="font-semibold">{label}.</span>{' '}
        {shown.hiddenUntilFlight ? lv.say('You size this yourself, so you only find out in flight.', 'Sized by your estimate. Verified in flight.') : <span className={shown.ok ? '' : 'font-semibold text-rocket'}>{detail}.</span>}
      </p>
    </div>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A light turning green dings, one turning red buzzes. */
function useCheckSounds(checks: CheckT[]) {
  const before = useRef<string | null>(null)
  const key = checks.map((c) => (c.hiddenUntilFlight ? '?' : c.ok ? '1' : '0')).join('')
  useEffect(() => {
    const prev = before.current
    before.current = key
    if (prev === null || prev === key || prev.length !== key.length) return
    let better = 0
    let worse = 0
    for (let i = 0; i < key.length; i++) {
      if (prev[i] === '0' && key[i] === '1') better++
      if (prev[i] === '1' && key[i] === '0') worse++
    }
    if (worse > 0) sfx.bad()
    else if (better > 0) sfx.good()
  }, [key])
}
