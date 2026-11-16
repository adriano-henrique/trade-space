import { DEPARTMENTS, fillSeats, fullCrew, hired, ROLE_ORDER, type Hires } from '../game/crew'
import { levelInfo, useLevel, type Level } from '../game/level'
import type { AnyMission, Check as CheckT } from '../game/types'
import { Check, Cloud, PlanetArt, Stars } from './art'
import { CrewPicker } from './Crew'
import { AidMarks, Button, LevelSwitch, SoundToggle } from './kit'

const PLANET_R = { earth: 78, jupiter: 96, uranus: 62 }

const launchText = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const budgetText = (m: number) => (m >= 1000 ? `$${(m / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} billion` : `$${m} million`)

/**
 * The mission at a glance, before anything is built: where it goes, why, what counts as success,
 * what makes it hard and which decisions are coming. Then the player hires the crew.
 */
export function BriefingScreen({
  mission,
  hires,
  resuming,
  onHire,
  onLevel,
  onStart,
  onBack,
}: {
  mission: AnyMission
  hires: Hires
  /** The player came back from the build, so the button returns there. */
  resuming: boolean
  /** Fill one or more seats. Seats not named keep whoever holds them. */
  onHire: (seats: Hires) => void
  onLevel: (l: Level) => void
  onStart: () => void
  onBack: () => void
}) {
  const lv = useLevel()
  const checks = mission.evaluate(mission.starter).checks as CheckT[]
  const r = PLANET_R[mission.place]
  const pad = mission.place === 'uranus' ? 1.85 : 1.08
  const crew = hired(hires)
  const full = fullCrew(hires)
  const facts: [string, string][] = [
    [budgetText(mission.budgetM), 'budget cap'],
    [mission.launchDateOf ? 'You choose' : launchText(mission.launchDate), 'launch date'],
    [String(mission.steps.length), 'decisions to make'],
    [String(checks.length), 'goals to meet'],
  ]

  return (
    <div className="relative mx-auto max-w-[1180px] px-4 pb-16 pt-4">
      <svg viewBox="0 0 1180 260" className="pointer-events-none absolute inset-x-0 top-10 w-full" aria-hidden>
        <Cloud x={1010} y={60} s={1.5} />
        <Cloud x={560} y={30} s={0.8} />
      </svg>

      <header className="relative flex flex-wrap items-center justify-between gap-3">
        <Button small variant="plain" onClick={onBack}>
          ← Missions
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <LevelSwitch value={lv.level} onChange={onLevel} />
          <SoundToggle />
        </div>
      </header>

      <p className="relative mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[0.9rem]">
        <span>
          <span className="font-bold">{levelInfo(lv.level).name}.</span> {levelInfo(lv.level).what}
        </span>
        <AidMarks level={lv.level} />
      </p>

      <section className="relative mt-5 grid items-center gap-x-9 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)]">
        <svg viewBox={`${-r * pad} ${-r * pad} ${r * pad * 2} ${r * pad * 2}`} width={r * pad * 2} height={r * pad * 2} aria-hidden className="bob mx-auto block max-w-[46vw] md:mx-0">
          <PlanetArt place={mission.place} r={r} />
        </svg>
        <div>
          <p className="font-semibold text-ink-soft">Mission briefing · {mission.kicker}</p>
          <h1 className="text-[clamp(2.8rem,8vw,4.8rem)] leading-[0.95]">{mission.name}</h1>
          <p className="mt-2 font-semibold">{mission.briefing.where}.</p>
          <p className="mt-2 max-w-[62ch] text-[1.22rem] leading-snug">{mission.objective}</p>
        </div>
      </section>

      <dl className="relative mt-7 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {facts.map(([v, k]) => (
          <div key={k}>
            <dd className="display num text-[1.7rem]">{v}</dd>
            <dt className="text-[0.92rem] font-semibold text-ink-soft">{k}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <section>
          <h2 className="text-[1.5rem]">Why fly it</h2>
          <p className="mt-2 max-w-[60ch]">{mission.briefing.why}</p>

          <h2 className="mt-8 text-[1.5rem]">What counts as success</h2>
          <p className="mt-1 text-ink-soft">{lv.say('Every goal is a light on the build screen. Turn them all green.', 'Each requirement is a light on the build screen. All of them must close.')}</p>
          <ul className="mt-3 space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <div className="pt-0.5">{c.hiddenUntilFlight ? <Check state="mystery" /> : <Goal />}</div>
                <p>
                  {goalText(c, lv.expert)}
                  {c.hiddenUntilFlight && <span className="text-ink-soft"> {lv.say('When you size this part yourself, you only find out in flight.', 'Verified in flight when sized by your estimate.')}</span>}
                </p>
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-1.5">
            {[
              [1, 'It flies, but misses a goal.'],
              [2, 'Every goal met.'],
              [3, mission.nasa ? 'Every goal met, and at least as much science as NASA’s own design.' : 'Every goal met, and a science score of 100 or more.'],
            ].map(([n, text]) => (
              <li key={n} className="flex items-center gap-3">
                <Stars n={n as number} size={22} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          {mission.scoreScale && <p className="mt-3 text-[0.94rem] text-ink-soft">A science score of 100 means {mission.scoreScale}.</p>}
        </section>

        <section>
          <h2 className="text-[1.5rem]">What makes it hard</h2>
          <ul className="mt-3 space-y-4">
            {mission.briefing.hard.map((h) => (
              <li key={h.title}>
                <h3 className="text-[1.15rem]">{h.title}</h3>
                <p className="mt-0.5 max-w-[58ch]">{lv.expert ? h.tech : h.plain}</p>
                {lv.level === 'student' && <p className="mt-0.5 max-w-[58ch] text-[0.92rem] text-ink-soft">{h.tech}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-[1.5rem]">Your flight plan</h2>
        <p className="mt-1 text-ink-soft">One decision at a time, each one owned by a department.</p>
        <ol className="mt-4 grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
          {mission.steps.map((s, i) => (
            <li key={s.id} className="flex gap-3 lg:block">
              <span className="display grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-paper text-[1.15rem]">{i + 1}</span>
              <div className="lg:mt-2">
                <h3 className="text-[1.15rem]">{s.title}</h3>
                <p className="mt-0.5 text-[0.96rem] leading-snug">{s.brief}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[0.86rem] font-semibold text-ink-soft">
                  <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: DEPARTMENTS[s.role].color }} />
                  {DEPARTMENTS[s.role].title}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="sheet mt-10 p-4 sm:p-6" aria-labelledby="crew-heading">
        <h2 id="crew-heading" className="text-[1.7rem]">
          Hire your crew
        </h2>
        <p className="mt-1 max-w-[70ch]">
          Four departments, three candidates each. Everyone brings one edge, and you can only take one per seat.{' '}
          {lv.say('The physics stays the same whoever you hire.', 'Edges change programme and engineering numbers. The physics does not move.')}
        </p>
        <div className="mt-6">
          <CrewPicker mission={mission} hires={hires} onHire={(role, id) => onHire({ [role]: id })} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-[3px] border-dashed border-ink/25 pt-5">
          <p className="font-semibold" aria-live="polite">
            {full ? `Crew ready: ${crew.map((m) => m.name.split(' ')[0]).join(', ')}.` : `${crew.length} of ${ROLE_ORDER.length} hired. Pick one head for each department.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!full && (
              <Button variant="plain" onClick={() => onHire(fillSeats(hires, lv.level))}>
                Pick the rest for me
              </Button>
            )}
            <Button variant="go" disabled={!full} onClick={onStart} className="text-[1.2rem]">
              {resuming ? 'Back to the build' : 'Start building'} <span className={full ? 'nudge inline-block' : 'inline-block'}>→</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

/** The rocket goal names the starter rocket, which the player has not chosen yet. */
function goalText(c: CheckT, expert: boolean) {
  if (c.id === 'rocket') return expert ? 'Wet mass within the launch capacity of the rocket you choose.' : 'Light enough for the rocket you pick.'
  return `${expert && c.tech ? c.tech.label : c.label}.`
}

/** A goal not yet met: an empty light. */
function Goal() {
  return (
    <svg viewBox="-12 -12 24 24" width="22" height="22" aria-hidden className="shrink-0">
      <circle r="10" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" />
    </svg>
  )
}
