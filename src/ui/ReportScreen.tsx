import { useMemo, useState } from 'react'
import { useCrew } from '../game/crew'
import { levelInfo, useLevel, type Level } from '../game/level'
import { formatValue, medal } from '../game/medal'
import { missionStars } from '../game/progress'
import type { AnyMission, Check as CheckT, Flight } from '../game/types'
import { Check, MedalToken, Stars } from './art'
import { CrewDebrief } from './Crew'
import { Message } from './FlightScreen'
import type { Estimate } from './Guess'
import { Button, Say, WhyCard } from './kit'
import { ParetoChart } from './ParetoChart'

export function ReportScreen({
  mission,
  design,
  flight,
  estimates,
  flownAs,
  onRedesign,
  onMenu,
}: {
  mission: AnyMission
  design: Record<string, unknown>
  flight: Flight
  estimates: Record<string, Estimate>
  /** The level this flight's stars count for: the easiest level any of it was played at. */
  flownAs: Level
  onRedesign: () => void
  onMenu: () => void
}) {
  const lv = useLevel()
  const { crew, head } = useCrew()
  const result = mission.evaluate(design)
  // NASA's column is the mission as NASA flew it, without your crew's edges.
  const nasa = useMemo(() => {
    const bare = mission.bare ?? mission
    if (!bare.nasa) return null
    const r = bare.evaluate(bare.nasa.design)
    return { r, f: bare.fly(bare.nasa.design, r) }
  }, [mission])
  const [why, setWhy] = useState<string | null>(null)
  const checks = result.checks as CheckT[]
  const graded = Object.keys(mission.metrics).filter((id) => estimates[id] && (mission.metrics[id].applies?.(design) ?? true))
  const allOk = checks.every((c) => c.ok)
  const stars = missionStars(mission, design, flight)
  const verdict = stars === 0 ? 'Mission lost' : stars === 1 ? 'It flew, but…' : stars === 2 ? 'Mission complete' : 'Perfect mission'
  const lessons = mission.lessons?.(design, result) ?? []
  const echoes = flight.events.filter((e) => e.echo)
  const trouble = flight.events.filter((e) => e.tone === 'bad' || (e.tone === 'warn' && !e.title.startsWith('Geomagnetic')))
  const failed = checks.filter((c) => !c.ok)

  // One sentence on what to do next, from mission control.
  const worst = flight.events.find((e) => e.tone === 'bad')
  const advice = flight.lost
    ? `${worst ? `${worst.title}. ${worst.body}` : 'The spacecraft was lost.'} Fix that and fly again.`
    : failed.length > 0
      ? `It survived! But ${failed.length === 1 ? 'one goal was missed' : `${failed.length} goals were missed`}: ${failed.map((c) => (c.short ?? c.label).toLowerCase()).join(', ')}. Fix ${failed.length === 1 ? 'it' : 'them'} for two stars.`
      : stars === 3
        ? 'Every goal met, and as much science as NASA’s own design. That is as good as it gets.'
        : `Every goal met! ${nasa ? `NASA’s design scored ${nasa.f.finalScience} for science and yours scored ${flight.finalScience}. Beat that for three stars.` : 'Score 100 for science to earn three stars.'}`

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-5">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-soft">
            {mission.name} · mission report · {levelInfo(flownAs).name} level
          </p>
          <h1 className={`text-[2.8rem] sm:text-[3.6rem] ${stars === 0 ? 'text-rocket' : ''}`}>{verdict}</h1>
          <div className="mt-2">
            <Stars n={stars} size={44} />
          </div>
          {flownAs !== lv.level && (
            <p className="mt-1.5 max-w-[52ch] text-[0.94rem] text-ink-soft">
              These stars count for {levelInfo(flownAs).name}, because some of your guesses were made at that level. Redo them as {levelInfo(lv.level).name} to earn {levelInfo(lv.level).name} stars.
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-x-6 text-center">
          {[
            [String(flight.finalScience), 'science score'],
            [flight.usefulDays.toLocaleString('en-US'), 'days of data'],
            [`$${result.costM.toFixed(0)}M`, 'spent'],
          ].map(([v, k]) => (
            <div key={k}>
              <dd className="display num text-[1.7rem]">{v}</dd>
              <dt className="text-[0.88rem] font-semibold text-ink-soft">{k}</dt>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-5 max-w-[720px]">
        <Say mood={stars === 0 ? 'worried' : stars >= 2 ? 'happy' : 'calm'} who={head('director')}>
          {advice}
        </Say>
        <div className="mt-4 flex flex-wrap gap-3 pl-[64px]">
          <Button onClick={onRedesign}>{stars === 3 ? 'Try another design' : 'Fix it and fly again'}</Button>
          <Button variant="plain" onClick={onMenu}>
            Pick another mission
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-2">
        <section>
          <h2 className="text-[1.5rem]">Mission lights</h2>
          <ul className="mt-3 space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <div className="pt-0.5">
                  <Check state={c.ok ? 'ok' : 'bad'} />
                </div>
                <p>
                  <span className="font-semibold">{lv.expert && c.tech ? c.tech.label : c.label}.</span>{' '}
                  <span className={c.ok ? 'text-ink-soft' : 'font-semibold text-rocket'}>{lv.expert && c.tech ? c.tech.detail : c.detail.charAt(0).toUpperCase() + c.detail.slice(1)}.</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[1.5rem]">Your guesses</h2>
          {graded.length === 0 && <p className="mt-3 text-ink-soft">You didn’t guess anything this time. Next flight, tap a purple question mark and try one.</p>}
          <ul className="mt-3 space-y-1">
            {graded.map((id) => {
              const m = mission.metrics[id]
              const truth = m.truth(design, result)
              const guess = estimates[id].value
              // A sized part can be built bigger than the estimate, when the crew adds margin.
              const built = m.sizes ? Number(design[m.sizes]) : guess
              const made = estimates[id]
              const md = medal(guess, truth, made.level)
              const help = [made.hintsUsed ? `${made.hintsUsed} clue${made.hintsUsed > 1 ? 's' : ''}` : '', made.calculator ? 'the calculator' : made.formula ? 'the formula' : ''].filter(Boolean).join(' and ')
              // A sized part that came out too small hurt the mission, however close the guess was.
              const tooSmall = Boolean(m.sizes) && built < truth * 0.999
              return (
                <li key={id}>
                  <button type="button" onClick={() => setWhy(why === id ? null : id)} aria-expanded={why === id} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-paper/70">
                    {tooSmall ? <Check state="bad" size={34} /> : <MedalToken tier={md.tier} />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-tight">{lv.expert && m.tech ? m.tech.label : m.label}</span>
                      <span className="num block text-[0.92rem] text-ink-soft">
                        {m.sizes ? (built === guess ? 'You built' : 'You sized') : 'You said'} {formatValue(guess, m.unit)}
                        {built !== guess && ` · built at ${formatValue(built, m.unit)}`} · {m.sizes ? 'it needed' : 'really'} {formatValue(truth, m.unit)}
                      </span>
                      <span className="block text-[0.86rem] text-ink-soft">
                        {help ? `With ${help}` : 'No help'}
                        {made.level !== flownAs && ` · as ${levelInfo(made.level).name}`}
                      </span>
                    </span>
                    <span className={`display text-[0.95rem] ${tooSmall ? 'text-rocket' : ''}`}>{tooSmall ? 'Too small' : md.label}</span>
                  </button>
                  {why === id && (
                    <div className="mb-2 ml-[54px] mt-1">
                      <WhyCard why={m.why(design, result)} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <CrewDebrief mission={mission} design={design} result={result} flight={flight} estimates={estimates} />

      {trouble.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[1.5rem]">What happened up there</h2>
          <ol className="mt-4 grid gap-x-10 gap-y-5 lg:grid-cols-2">
            {trouble.map((e, i) => (
              <Message key={i} e={{ ...e, echo: undefined }} onDark={false} newest />
            ))}
          </ol>
        </section>
      )}

      {lessons.map((l) => (
        <section key={l.title} className="mt-10 max-w-[720px]">
          <h2 className="text-[1.5rem]">{l.title}</h2>
          <p className="mt-2">{l.body}</p>
        </section>
      ))}

      {echoes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[1.5rem]">It happened for real</h2>
          <div className="mt-3 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {echoes.map((e, i) => (
              <p key={i} className="max-w-[58ch]">
                <span className="display text-grape">{e.echo!.mission}.</span> {e.echo!.story}
              </p>
            ))}
          </div>
        </section>
      )}

      {mission.nasa && nasa && (
        <section className="sheet mt-10 p-4 sm:p-6">
          <h2 className="text-[1.5rem]">You vs NASA</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-[0.9rem] text-ink-soft">
                  <th className="py-1.5 font-semibold" />
                  <th className="py-1.5 font-semibold">You</th>
                  <th className="py-1.5 font-semibold">{mission.nasa.label}</th>
                </tr>
              </thead>
              <tbody className="num">
                {[...mission.nasa.rows(design, result, mission.nasa.design, nasa.r), ['Science score', String(flight.finalScience), `${nasa.f.finalScience}${nasa.f.scoreNote ? ` (${nasa.f.scoreNote})` : ''}`]].map(([label, mine, theirs]) => (
                  <tr key={label} className="border-t-2 border-ink/15">
                    <td className="py-2 pr-3 text-ink-soft">{label}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {mine}
                      {mine === theirs && <span className="ml-2 text-[0.85rem] font-semibold text-[oklch(0.5_0.15_150)]">same as NASA</span>}
                    </td>
                    <td className="py-2">{theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {crew.length > 0 && <p className="mt-3 text-[0.92rem] text-ink-soft">Your column includes your crew’s edges. NASA’s is the mission as it really flew, in this model.</p>}
          <FactList title="What NASA chose, and why" facts={mission.nasa.facts} source={mission.nasa.source} />
        </section>
      )}

      {mission.concept && (
        <section className="sheet mt-10 p-4 sm:p-6">
          <h2 className="text-[1.5rem]">What NASA’s experts proposed</h2>
          <FactList title={mission.concept.label} facts={mission.concept.facts} source={mission.concept.source} />
        </section>
      )}

      {mission.frontier && (
        <section className="sheet mt-10 p-4 sm:p-6">
          <h2 className="text-[1.5rem]">Every design you could have built</h2>
          <div className="mt-3">
            <ParetoChart
              frontier={mission.frontier()}
              describe={mission.describe}
              scale={mission.scoreScale ?? 'exactly meets the goals'}
              you={{ cost: result.costM, science: flight.finalScience, ok: allOk && !flight.lost }}
              nasa={nasa ? { cost: nasa.r.costM, science: nasa.f.finalScience } : undefined}
            />
          </div>
          {crew.length > 0 && (
            <p className="mt-3 max-w-[72ch] text-[0.92rem] text-ink-soft">
              The dots were flown with no crew. Your own point includes your crew’s edges ({crew.map((m) => m.edge.short).join(', ')}), so it can land beyond the line.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function FactList({ title, facts, source }: { title: string; facts: string[]; source: string }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-semibold text-grape">{title}</summary>
      <ul className="mt-2 max-w-[75ch] list-disc space-y-1.5 pl-5">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-3 text-[0.86rem] text-ink-soft">Source: {source}</p>
    </details>
  )
}
