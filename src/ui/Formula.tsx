import { useRef, useState } from 'react'
import { calculate } from '../game/calc'
import { useLevel } from '../game/level'
import { medal } from '../game/medal'
import { sfx } from '../game/sfx'
import type { AnyMission, FormulaCard } from '../game/types'
import { AU_KM, EARTH, G0, SOLAR_CONSTANT, SPEED_OF_LIGHT } from '../physics/model'
import { Check, MedalToken } from './art'
import type { Estimate } from './Guess'
import { Button } from './kit'

/** Show a number the way you would write it in a notebook. */
function show(n: number) {
  const a = Math.abs(n)
  if (a !== 0 && (a >= 1e7 || a < 1e-3)) return n.toExponential(3).replace('e+', ' × 10^').replace('e-', ' × 10^−')
  return n.toLocaleString('en-US', { maximumSignificantDigits: a >= 1000 ? 6 : 4 })
}

/**
 * A formula with the player's own numbers. With `calculator` it also works the answer out:
 * typing `2*pi*sqrt(a^3/mu)` works because `a` and `mu` are filled in from the design.
 * Without it the formula and its numbers are all you get, and the working out is yours.
 */
export function FormulaView({ card, unit, calculator, onUse }: { card: FormulaCard; unit: string; calculator: boolean; onUse?: (value: number) => void }) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const vars = Object.fromEntries(card.vars.map((v) => [v.name, v.value]))
  let value: number | null = null
  let error = ''
  if (text.trim()) {
    try {
      value = calculate(text, vars)
    } catch (e) {
      error = e instanceof Error ? e.message : 'I can’t work that out'
    }
  }
  const insert = (s: string) => {
    setText((t) => t + s)
    input.current?.focus()
  }
  return (
    <div className="rounded-2xl border-[3px] border-ink bg-paper p-3.5">
      <p className="display text-grape">{card.title}</p>
      <p className="num mt-1.5 rounded-xl bg-ink px-3 py-2 text-[1.12rem] font-bold leading-snug text-paper">{card.expr}</p>
      <ul className="mt-2.5 space-y-1">
        {card.vars.map((v) => (
          <li key={v.name} className="flex items-baseline gap-2 text-[0.93rem] leading-snug">
            {calculator ? (
              <button type="button" onClick={() => insert(v.name)} title={`Put ${v.name} into the calculator`} className="num shrink-0 rounded-md border-2 border-ink bg-sun px-1.5 font-bold hover:bg-paper-2">
                {v.name}
              </button>
            ) : (
              <span className="num shrink-0 rounded-md border-2 border-ink bg-paper-2 px-1.5 font-bold">{v.name}</span>
            )}
            <span>
              <span className="num font-bold">
                = {show(v.value)} {v.unit}
              </span>
              <span className="text-ink-soft"> · {v.meaning}</span>
            </span>
          </li>
        ))}
      </ul>
      {card.note && <p className="mt-2 text-[0.9rem] text-ink-soft">{card.note}</p>}

      {!calculator && (
        <p className="mt-3 border-t-[3px] border-dashed border-ink/25 pt-2.5 text-[0.9rem] font-semibold">
          No calculator at this level. The working out is yours.
        </p>
      )}
      {calculator && <div className="mt-3 border-t-[3px] border-dashed border-ink/25 pt-3">
        <label className="block text-[0.9rem] font-semibold" htmlFor={`calc-${card.title}`}>
          Calculator. It knows the yellow letters above.
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            ref={input}
            id={`calc-${card.title}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="type the formula here"
            className="num min-w-0 flex-1 rounded-lg border-[3px] border-ink bg-paper px-2 py-1 font-bold placeholder:font-normal placeholder:text-ink-soft"
          />
          <Button
            small
            variant="plain"
            onClick={() => {
              setText(card.type)
              input.current?.focus()
            }}
          >
            Type it for me
          </Button>
        </div>
        <p className="num mt-1.5 min-h-[1.6em] text-[1.05rem]" aria-live="polite">
          {value !== null && (
            <span className="font-bold">
              = {show(value)} {unit}
            </span>
          )}
          {error && <span className="text-[0.9rem] font-semibold text-rocket">{error}</span>}
          {!text.trim() && <span className="text-[0.86rem] text-ink-soft">You can use + − * / ^ ( ) sqrt acos exp pi</span>}
        </p>
        {onUse && value !== null && value > 0 && (
          <Button
            small
            onClick={() => {
              sfx.good()
              onUse(value!)
            }}
          >
            Use {show(value)} as my answer
          </Button>
        )}
      </div>}
    </div>
  )
}

const CONSTANTS: [string, string, string][] = [
  ['Earth’s radius', `${show(EARTH.radius)} km`, 'R'],
  ['Earth’s gravity', `${show(EARTH.mu)} km³/s²`, 'μ'],
  ['Around the equator', `${show(EARTH.equator)} km`, 'C'],
  ['Sunlight at Earth', `${SOLAR_CONSTANT.toLocaleString('en-US')} W/m²`, 'S'],
  ['Speed of light', `${show(SPEED_OF_LIGHT)} km/s`, 'c'],
  ['Earth to Sun (1 AU)', `${show(AU_KM / 1e6)} million km`, 'AU'],
  ['Standard gravity', `${show(G0)} m/s²`, 'g₀'],
  ['Boltzmann’s constant', '1.381 × 10^−23 J/K', 'k'],
]

/**
 * The formula notebook: every formula this mission uses, with your current numbers. It slides
 * in over the spacecraft picture and leaves the build steps free, so you can read and keep building.
 */
export function Notebook({
  mission,
  design,
  result,
  estimates,
  onClose,
}: {
  mission: AnyMission
  design: unknown
  result: unknown
  estimates: Record<string, Estimate>
  onClose: () => void
}) {
  const lv = useLevel()
  const { calculator } = lv.aids
  const metrics = Object.values(mission.metrics).filter((m) => m.formula && (m.applies?.(design) ?? true))
  return (
    <aside className="pop fixed inset-y-0 left-0 z-30 flex w-[min(470px,100vw)] flex-col border-r-[3px] border-ink bg-paper-2 shadow-[8px_0_0_oklch(0.24_0.06_268/0.12)]" aria-label="Formula notebook">
      <header className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-paper px-4 py-3">
        <div>
          <h2 className="text-[1.35rem]">Formula notebook</h2>
          <p className="text-[0.88rem] text-ink-soft">
            {mission.name}: every formula, with the numbers from your design.{calculator ? '' : ' No calculator at this level.'}
          </p>
        </div>
        <Button small variant="plain" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {metrics.map((m) => {
          const card = m.formula!(design, result)
          const e = estimates[m.id]
          const truth = m.truth(design, result)
          const guess = e ? (m.sizes ? Number((design as Record<string, unknown>)[m.sizes]) : e.value) : 0
          return (
            <details key={m.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-paper">
                {e ? <MedalToken tier={medal(guess, truth, e.level).tier} size={28} /> : <Check state="mystery" size={28} />}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{lv.expert && m.tech ? m.tech.label : m.label}</span>
                  <span className="num block truncate text-[0.88rem] text-ink-soft">{card.expr}</span>
                </span>
                <span className="display text-grape group-open:hidden">Open</span>
              </summary>
              <div className="mt-1.5">
                <FormulaView card={card} unit={m.unit} calculator={calculator} />
              </div>
            </details>
          )
        })}

        <section className="pt-3">
          <h3 className="text-[1.1rem]">Numbers worth knowing</h3>
          <dl className="num mt-2 space-y-1 text-[0.92rem]">
            {CONSTANTS.map(([name, value, symbol]) => (
              <div key={name} className="flex items-baseline justify-between gap-3 border-b-2 border-ink/10 pb-1">
                <dt>
                  <span className="font-bold">{symbol}</span> <span className="text-ink-soft">{name}</span>
                </dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  )
}
