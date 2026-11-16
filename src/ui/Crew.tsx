import { candidates, dataPercent, DEPARTMENTS, edgeWorks, perksOf, ROLE_ORDER, roleResult, useCrew, type CrewMember, type Hires, type Role } from '../game/crew'
import { useLevel } from '../game/level'
import { sfx } from '../game/sfx'
import type { AnyMission, BarSpec, Flight } from '../game/types'
import { Portrait } from './art'
import type { Estimate } from './Guess'

const firstName = (m: CrewMember) => m.name.split(' ')[0]

/** Briefing: one head per department, three candidates each, one edge apiece. */
export function CrewPicker({ mission, hires, onHire }: { mission: AnyMission; hires: Hires; onHire: (role: Role, id: string) => void }) {
  const lv = useLevel()
  return (
    <div className="grid gap-y-8">
      {ROLE_ORDER.map((role) => {
        const dept = DEPARTMENTS[role]
        const decides = mission.steps.filter((s) => s.role === role).map((s) => s.title)
        return (
          <div key={role}>
            <h3 id={`seat-${role}`} className="flex items-center gap-2 text-[1.3rem]">
              <span className="inline-block h-4 w-4 shrink-0 rounded-full border-[3px] border-ink" style={{ backgroundColor: dept.color }} />
              {dept.title}
            </h3>
            <p className="mt-0.5 text-[0.96rem] text-ink-soft">
              Owns {dept.owns}, and wants {dept.wants}.{decides.length > 0 && ` On this mission: ${decides.join(' and ')}.`}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3" role="radiogroup" aria-labelledby={`seat-${role}`}>
              {candidates(role).map((m) => {
                const picked = hires[role] === m.id
                const works = edgeWorks(m, lv.level)
                return (
                  <button
                    type="button"
                    key={m.id}
                    role="radio"
                    aria-checked={picked}
                    onClick={() => {
                      if (!picked) sfx.clunk()
                      onHire(role, m.id)
                    }}
                    className="pick flex h-full flex-col gap-2.5 !p-3"
                  >
                    <span className="flex items-center gap-3">
                      <Portrait look={m.look} color={dept.color} size={62} mood={picked ? 'happy' : 'calm'} />
                      <span className="min-w-0">
                        <span className="display block text-[1.15rem] leading-tight">{m.name}</span>
                        <span className="block text-[0.92rem] font-semibold leading-tight text-ink-soft">{m.field}</span>
                      </span>
                    </span>
                    <span className="block">
                      <span className={`display num block text-[1.02rem] leading-tight ${works ? '' : 'text-ink-soft line-through decoration-2'}`}>{m.edge.short}</span>
                      {works ? (
                        <span className="mt-0.5 block leading-snug">{lv.say(m.edge.plain, m.edge.tech)}</span>
                      ) : (
                        <span className="mt-0.5 block font-semibold leading-snug text-rocket">Switched off at Engineer level: engineers estimate with no help. Hiring {firstName(m)} gives you no edge.</span>
                      )}
                    </span>
                    <span className="mt-auto block text-[0.9rem] leading-snug text-ink-soft">{m.bio}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Build screen: who is on the crew, and the edge each one brings. */
export function CrewRow({ onChange }: { onChange: () => void }) {
  const { crew } = useCrew()
  const lv = useLevel()
  if (crew.length === 0) return null
  return (
    <div className="border-t-[3px] border-dashed border-ink/25 pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="display text-[1.05rem]">Your crew</p>
        <button type="button" onClick={onChange} className="text-[0.92rem] font-semibold text-grape underline decoration-2 underline-offset-4">
          Briefing and crew
        </button>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        {crew.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <Portrait look={m.look} color={DEPARTMENTS[m.role].color} size={42} />
            <span className="min-w-0">
              <span className="block text-[0.92rem] font-bold leading-tight">{firstName(m)}</span>
              <span className="num block text-[0.84rem] leading-tight text-ink-soft">{edgeWorks(m, lv.level) ? m.edge.short : 'No edge at Engineer level'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Flown {
  mission: AnyMission
  design: Record<string, unknown>
  result: { bars: BarSpec[]; loadW: number }
  flight: Flight
  estimates: Record<string, Estimate>
}

/** What one crew member's edge was worth on this flight: the same design, flown without it. */
function worth(m: CrewMember, hires: Hires, { mission, design, result, flight, estimates }: Flown): string {
  const bare = mission.bare ?? mission
  const without = bare.evaluate(design, perksOf({ ...hires, [m.role]: undefined })) as Flown['result']
  const [mass, cost, data] = result.bars
  const [mass0, cost0, data0] = without.bars
  const kg = `${Math.max(0, mass0.value - mass.value).toFixed(0)} kg`
  const usd = `$${Math.max(0, cost0.value - cost.value).toFixed(0)} million`
  switch (m.edge.measure) {
    case 'cost':
      return `saved ${usd}`
    case 'mass':
      return `took ${kg} off the launch mass`
    case 'hardware':
      return `took ${kg} off the launch mass and saved ${usd}`
    case 'power':
      return `cut the electrical load by ${(without.loadW - result.loadW).toFixed(0)} W`
    case 'data':
      return dataPercent(data0) === dataPercent(data) ? `data return stayed at ${dataPercent(data)}%: the radio already had room to spare` : `raised the data sent home from ${dataPercent(data0)}% to ${dataPercent(data)}%`
    case 'science':
      return `added ${Math.max(0, flight.finalScience - bare.fly(design, without).finalScience)} to the science score`
    case 'estimates': {
      const made = Object.keys(estimates).filter((id) => mission.metrics[id])
      // Engineers estimate with no help, so the ballpark was never offered on those.
      const n = made.filter((id) => estimates[id].level !== 'engineer').length
      if (made.length === 0) return 'had no estimates to help with'
      return n === 0 ? 'sat this one out, because engineers estimate with no help' : `gave the ballpark on ${n} estimate${n > 1 ? 's' : ''}`
    }
    case 'sizing': {
      const sized = Object.values(mission.metrics).filter((x) => x.sizes && estimates[x.id] && (x.applies?.(design) ?? true))
      if (sized.length === 0) return 'had no sized parts to add margin to on this design'
      const state = (x: (typeof sized)[number]) => {
        const need = x.truth(design, result) * 0.999
        return Number(design[x.sizes!]) < need ? 'short' : estimates[x.id].value < need ? 'saved' : 'spare'
      }
      const names = (which: string) => sized.filter((x) => state(x) === which).map((x) => x.label.toLowerCase())
      if (names('saved').length > 0) return `the extra 15% saved the ${names('saved').join(' and the ')}`
      if (names('short').length > 0) return `even the extra 15% was not enough for the ${names('short').join(' or the ')}`
      return 'the extra 15% was not needed this time'
    }
  }
}

/** Report: how each department did on its own goal, and what each edge was worth. */
export function CrewDebrief(flown: Flown) {
  const { crew, hires } = useCrew()
  if (crew.length === 0) return null
  const cards = crew.map((m) => ({ m, goal: roleResult(m.role, flown.result.bars, flown.flight), did: worth(m, hires, flown) }))
  const met = cards.filter((c) => c.goal.good).length
  return (
    <section className="mt-10">
      <h2 className="text-[1.5rem]">Crew debrief</h2>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        {met} of {cards.length} departments got what they wanted.{' '}
        {met === cards.length ? 'Nobody had to give anything up, which is rare.' : 'Their goals compete for the same mass and money, so somebody usually pays for somebody else’s choice.'}
      </p>
      <ul className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ m, goal, did }) => (
          <li key={m.id}>
            <div className="flex items-center gap-2.5">
              <Portrait look={m.look} color={DEPARTMENTS[m.role].color} size={52} mood={goal.good ? 'happy' : 'worried'} />
              <div>
                <p className="display text-[1.15rem] leading-tight">{m.name}</p>
                <p className="text-[0.86rem] font-semibold leading-tight text-ink-soft">{DEPARTMENTS[m.role].title}</p>
              </div>
            </div>
            <p className="mt-2 leading-snug">
              <span className={`display num text-[1.5rem] ${goal.good ? '' : 'text-rocket'}`}>{goal.value}</span> <span className="text-[0.92rem]">{goal.line}</span>
            </p>
            <p className="mt-1.5 text-[0.92rem] leading-snug">
              <span className="num font-bold">{m.edge.short}:</span> {did}.
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
