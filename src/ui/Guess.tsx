import { useState } from 'react'
import { builtSize, edgeWorks, useCrew } from '../game/crew'
import { easiest, levelInfo, useLevel, type Level } from '../game/level'
import { formatValue, medal } from '../game/medal'
import { sfx } from '../game/sfx'
import type { Metric } from '../game/types'
import { MedalToken } from './art'
import { FormulaView } from './Formula'
import { Button, LogSlider, WhyCard } from './kit'

export interface Estimate {
  value: number
  hintsUsed: number
  /** The player opened the formula card before answering. */
  formula?: boolean
  /** The answer came out of the calculator. */
  calculator?: boolean
  /** The level it was made at: it is graded by that level's medals, whatever is picked later. */
  level: Level
}

/**
 * Guess first, then find out. Sits inside the build step (no pop-up). The slider never starts
 * on the right answer, and you have to commit a value before you can lock in. The level sets
 * the help: explorers get clues, the formula and a calculator; students get the formula and do
 * the working out; engineers get nothing, type a number and are graded strictly.
 */
export function GuessCard({
  metric,
  design,
  result,
  previous,
  sizedAt,
  onClose,
  onLock,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metric: Metric<any, any>
  design: unknown
  result: unknown
  previous?: Estimate
  /** For a sized part that was already guessed: the size it has now. */
  sizedAt?: number
  onClose: () => void
  onLock: (e: Estimate) => void
}) {
  const lv = useLevel()
  const truth = metric.truth(design, result)
  const [value, setValue] = useState(() => previous?.value ?? sizedAt ?? neutralStart(metric.min, metric.max, truth))
  const [typed, setTyped] = useState(() => (previous || sizedAt !== undefined ? String(previous?.value ?? sizedAt) : ''))
  const [moved, setMoved] = useState(Boolean(previous) || sizedAt !== undefined)
  const [hints, setHints] = useState(previous?.hintsUsed ?? 0)
  const [revealed, setRevealed] = useState(Boolean(previous) && !metric.sizes)
  const [locked, setLocked] = useState(false)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [usedFormula, setUsedFormula] = useState(previous?.formula ?? false)
  const [usedCalculator, setUsedCalculator] = useState(previous?.calculator ?? false)
  // Help taken at an easier level still counts if the level is switched before locking in.
  const [helpLevel, setHelpLevel] = useState<Level | null>(null)
  const { aids } = lv
  const canUseFormula = aids.formula && Boolean(metric.formula)
  const gradedAt = previous?.level ?? (helpLevel ? easiest([helpLevel, lv.level]) : lv.level)
  const m = medal(value, truth, gradedAt)
  const helpUsed = [hints ? `${hints} clue${hints > 1 ? 's' : ''}` : '', usedCalculator ? 'the calculator' : usedFormula ? 'the formula' : ''].filter(Boolean).join(' and ')
  const hintList = metric.hints(design, result)
  const question = lv.expert && metric.tech ? metric.tech.question(design, result) : metric.question(design, result)
  const clamp = (v: number) => Math.max(metric.min, Math.min(metric.max, v))
  // Crew edges that act on estimates: a ballpark before you commit, and margin on what you size.
  const { crew, perks } = useCrew()
  const coach = crew.find((c) => c.edge.perks.ballpark && edgeWorks(c, lv.level))
  const decade = 10 ** Math.floor(Math.log10(truth))
  const ballpark: [number, number] | undefined = coach && truth > 0 ? [decade, decade * 10] : undefined
  const careful = metric.sizes ? crew.find((c) => (c.edge.perks.reserve ?? 1) > 1) : undefined
  // A ballpark you have seen is help taken at this level, even if the level changes before you lock in.
  const seenAt = easiest([helpLevel ?? lv.level, lv.level])
  if (ballpark && !revealed && !locked && helpLevel !== seenAt) setHelpLevel(seenAt)

  return (
    <div className="pop rounded-2xl bg-grape/12 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="display text-grape">{metric.sizes ? (lv.expert ? 'Size it' : 'You decide') : lv.expert ? 'Estimate first' : 'Guess first'}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-xl font-bold text-ink-soft hover:bg-paper">
          ×
        </button>
      </div>
      <h3 className="mt-1 text-[1.35rem] leading-tight">{question}</h3>

      {!revealed && !locked && (
        <>
          {lv.expert ? (
            <label className="mt-4 flex items-baseline justify-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={metric.min}
                max={metric.max}
                value={typed}
                placeholder="?"
                aria-label={`Your estimate in ${metric.unit}`}
                onChange={(e) => {
                  setTyped(e.target.value)
                  setUsedCalculator(false)
                  const v = Number(e.target.value)
                  if (e.target.value !== '' && Number.isFinite(v) && v > 0) {
                    setValue(clamp(v))
                    setMoved(true)
                  } else setMoved(false)
                }}
                className="display num w-44 rounded-xl border-[3px] border-ink bg-paper px-3 py-1 text-right text-[2.2rem] leading-none"
              />
              <span className="display text-[1.4rem]">{metric.unit}</span>
            </label>
          ) : (
            <p className="display num mt-4 text-center text-[2.6rem] leading-none" aria-live="polite">
              {formatValue(value, metric.unit)}
            </p>
          )}
          <div className="mt-3">
            <LogSlider
              value={value}
              min={metric.min}
              max={metric.max}
              unit={metric.unit}
              decades={lv.expert}
              band={ballpark}
              onChange={(v) => {
                setValue(v)
                setTyped(String(v))
                setMoved(true)
                setUsedCalculator(false)
              }}
            />
          </div>
          {coach && ballpark && (
            <p className="mb-1.5 text-[0.96rem]">
              <span className="font-bold">{coach.name.split(' ')[0]}’s ballpark:</span> somewhere between <span className="num font-semibold">{plain(ballpark[0])}</span> and{' '}
              <span className="num font-semibold">
                {plain(ballpark[1])} {metric.unit}
              </span>
              .
            </p>
          )}
          {lv.detail && <p className="text-[0.84rem] text-ink-soft">The scale is logarithmic: each step along it multiplies the value. Getting the order of magnitude right is what counts.</p>}

          {formulaOpen && canUseFormula && metric.formula && (
            <div className="pop mt-3">
              <FormulaView
                card={metric.formula(design, result)}
                unit={metric.unit}
                calculator={aids.calculator}
                onUse={(v) => {
                  const c = clamp(v)
                  setValue(c)
                  setTyped(String(Number(c.toPrecision(4))))
                  setMoved(true)
                  setUsedCalculator(true)
                }}
              />
            </div>
          )}

          {aids.clues && hints > 0 && (
            <ul className="mt-2 space-y-1.5">
              {hintList.slice(0, hints).map((h, i) => (
                <li key={i} className="pop flex gap-2 rounded-xl bg-paper px-3 py-2 text-[0.96rem]">
                  <span className="display text-grape">{i + 1}</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {!aids.clues && !aids.formula && <p className="mt-2 text-[0.88rem] font-semibold">Engineer level: no clues and no formula. Work it out your way.</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {canUseFormula && !formulaOpen && (
                <Button
                  small
                  variant="plain"
                  onClick={() => {
                    setFormulaOpen(true)
                    setUsedFormula(true)
                    setHelpLevel(easiest([helpLevel ?? lv.level, lv.level]))
                  }}
                >
                  {aids.calculator ? 'Formula and calculator' : 'Show the formula'}
                </Button>
              )}
              {aids.clues && hints < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setHints(hints + 1)
                    setHelpLevel(easiest([helpLevel ?? lv.level, lv.level]))
                  }}
                  className="font-semibold text-grape underline decoration-2 underline-offset-4"
                >
                  {hints === 0 ? 'Give me a clue' : 'Another clue'}
                </button>
              )}
            </div>
            <Button
              disabled={!moved}
              onClick={() => {
                onLock({ value, hintsUsed: hints, formula: usedFormula, calculator: usedCalculator, level: gradedAt })
                if (metric.sizes) {
                  setLocked(true)
                  sfx.lock()
                } else {
                  setRevealed(true)
                  sfx.medal(m.tier)
                }
              }}
            >
              {moved ? 'Lock it in' : lv.expert ? 'Enter an estimate' : 'Drag the slider to guess'}
            </Button>
          </div>
        </>
      )}

      {locked && (
        <div className="pop mt-4">
          <p className="text-[1.05rem]">
            Locked in at <span className="display num">{formatValue(value, metric.unit)}</span>.{' '}
            {careful && (
              <>
                {careful.name.split(' ')[0]} builds it at <span className="display num">{formatValue(builtSize(value, perks), metric.unit)}</span>, to be safe.{' '}
              </>
            )}
            {lv.expert ? 'The requirement stays hidden until the mission flies.' : 'Is that enough? You will find out in space.'}
          </p>
          <div className="mt-3 flex justify-end">
            <Button onClick={onClose}>OK</Button>
          </div>
        </div>
      )}

      {revealed && (
        <div className="pop mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[0.92rem] font-semibold text-ink-soft">You said</p>
              <p className="display num text-[1.7rem]">{formatValue(value, metric.unit)}</p>
            </div>
            <div>
              <p className="text-[0.92rem] font-semibold text-ink-soft">{lv.expert ? 'Physics says' : 'Real answer'}</p>
              <p className="display num text-[1.7rem] text-grape">{formatValue(truth, metric.unit)}</p>
            </div>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <MedalToken tier={m.tier} size={38} />
            <span className="display text-[1.2rem]">{m.label}</span>
            <span className="num text-[0.9rem] text-ink-soft">
              {lv.detail && `off by a factor of ${m.factor.toFixed(2)}, `}
              {helpUsed ? `with ${helpUsed}` : 'with no help'}
              {gradedAt !== lv.level && ` · graded as ${levelInfo(gradedAt).name}`}
            </span>
          </p>
          <div className="mt-3">
            <WhyCard why={metric.why(design, result)} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={onClose}>Got it</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A power of ten written out: 0.01, 1, 1,000. */
const plain = (n: number) => (n >= 1 ? n.toLocaleString('en-US') : String(Number(n.toPrecision(1))))

/** Middle of the scale, unless that happens to be the answer: then start well below it. */
function neutralStart(min: number, max: number, truth: number) {
  const mid = Math.sqrt(min * max)
  const off = Math.max(mid / truth, truth / mid)
  const start = off < 1.5 ? Math.max(min, mid / 4) : mid
  return start < 10 ? Math.round(start * 10) / 10 : Math.round(start)
}
