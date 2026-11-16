// The contract every mission implements. Screens are generic; missions supply physics, controls,
// estimation prompts, history and the real NASA design to compare against.
import type { ComponentType } from 'react'
import type { Perks, Role } from './crew'

export interface Check {
  id: string
  label: string
  /** One or two words for the mission-light chip. */
  short?: string
  /** The same requirement in engineering terms, for the Engineer level. */
  tech?: { label: string; detail: string }
  ok: boolean
  detail: string
  /** Sized by the player's estimate: the verdict stays hidden until the mission flies. */
  hiddenUntilFlight?: boolean
}

export interface BarSpec {
  label: string
  value: number
  max: number
  unit: string
  detail: string
  /** true when bigger is better (e.g. data sent home vs collected). */
  invert?: boolean
}

export interface Evaluation {
  costM: number
  checks: Check[]
  bars: BarSpec[]
  /** The crew edges this evaluation was made with. */
  perks: Perks
}

export interface Why {
  plain: string
  formula: string
  source: string
}

/** One symbol of a formula: the name you type in the calculator, your value for it, and what it is. */
export interface FormulaVar {
  name: string
  value: number
  unit: string
  meaning: string
}

/** A formula the player can use: written out, with their own numbers, and typed for the calculator. */
export interface FormulaCard {
  title: string
  /** The formula as you would write it on paper. */
  expr: string
  vars: FormulaVar[]
  /** The same formula as the calculator reads it, using the names in `vars`. Gives the answer in the metric's unit. */
  type: string
  /** One line on a trap or a unit to watch. */
  note?: string
}

export interface Metric<D, R> {
  id: string
  label: string
  unit: string
  question: (d: D, r: R) => string
  min: number
  max: number
  truth: (d: D, r: R) => number
  hints: (d: D, r: R) => [string, string, string]
  why: (d: D, r: R) => Why
  /** Engineer mode: the estimate becomes this design field and is graded after flight. */
  sizes?: keyof D & string
  /** A sized part that only exists for some designs (solar wings when you chose solar). */
  applies?: (d: D) => boolean
  /** The formula behind this number, for the Student hint and the formula notebook. */
  formula?: (d: D, r: R) => FormulaCard
  /** Label and question in engineering terms, for the Engineer level. */
  tech?: { label: string; question: (d: D, r: R) => string }
}

export type Tone = 'good' | 'warn' | 'bad' | 'info'

export interface Echo {
  mission: string
  year: string
  story: string
}

export interface FlightEvent {
  date: string
  day: number
  title: string
  body: string
  tone: Tone
  echo?: Echo
  link?: string
}

export interface Flight {
  events: FlightEvent[]
  lost: boolean
  totalDays: number
  finalScience: number
  /** Extra line under the score, e.g. "incl. +4 from radar". */
  scoreNote?: string
  usefulDays: number
}

export interface Lesson {
  title: string
  body: string
}

export interface FrontierPoint<D> {
  design: D
  cost: number
  science: number
}

export interface Frontier<D> {
  searched: number
  feasible: FrontierPoint<D>[]
  frontier: FrontierPoint<D>[]
}

export interface ControlsProps<D, R> {
  design: D
  result: R
  /** Id of the build step being shown; Controls renders only that step. */
  step: string
  set: (patch: Partial<D>) => void
  openGut: (id: string) => void
  estimated: (id: string) => boolean
}

export interface VizProps<D, R> {
  design: D
  result: R
  day: number
  running: boolean
  flight: Flight
  /** The mission has ended in a loss and the spacecraft should look dead. */
  dead: boolean
}

export interface CraftProps<D, R> {
  design: D
  result: R
}

/** One decision at a time: a build step with a short line from mission control. */
export interface Step<D, R> {
  id: string
  title: string
  /** The department head who owns this decision and talks you through it. */
  role: Role
  /** The trade-off in a few words, for the mission briefing. */
  brief: string
  say: (d: D, r: R) => string
  /** The same guidance as a terse engineering note, for the Engineer level. */
  techSay?: (d: D, r: R) => string
  /** Metrics the player guesses in this step. */
  guesses?: string[]
}

export interface RocketLook {
  name: string
  /** 1 (small) to 4 (huge): how tall it is drawn. */
  size: 1 | 2 | 3 | 4
  boosters?: number
  /** Body colour, when it is not white. */
  body?: string
}

export interface Mission<D, R extends Evaluation> {
  id: string
  kicker: string
  name: string
  year: string
  objective: string
  budgetM: number
  launchDate: string
  /** When the launch date depends on the design (e.g. a chosen launch year). */
  launchDateOf?: (d: D) => string
  tags: string[]
  teaser: string
  /** One sentence a ten-year-old gets. */
  pitch: string
  /** Where it goes, for the mission map. */
  place: 'earth' | 'jupiter' | 'uranus'
  /** The mission at a glance, shown before the build. Must not give away an answer the player estimates. */
  briefing: {
    /** Where the spacecraft goes, in a few words. */
    where: string
    /** Why anyone would pay for this mission. */
    why: string
    /** What makes it hard: a title, plain words, and the same thing in engineering terms. */
    hard: { title: string; plain: string; tech: string }[]
  }
  steps: Step<D, R>[]
  /** The spacecraft drawn from the design, inside a 400x300 box. */
  Craft: ComponentType<CraftProps<D, R>>
  rocketLook: (d: D) => RocketLook
  /** Budget lines shown at Student and Engineer levels. Never reveals a requirement the player sizes by guess. */
  readout?: (d: D, r: R) => [string, string][]
  starter: D
  /** Without `perks` the design is evaluated as NASA would fly it, with no crew edges. */
  evaluate: (d: D, perks?: Perks) => R
  /** Set on a mission wrapped by a crew: the same mission with no crew edges. */
  bare?: Mission<D, R>
  fly: (d: D, r: R) => Flight
  metrics: Record<string, Metric<D, R>>
  /** Metrics shown as "??" cells in the live budget until estimated. */
  quizIds: string[]
  Controls: ComponentType<ControlsProps<D, R>>
  Viz: ComponentType<VizProps<D, R>>
  /** Short one-line summary of a design, for the frontier chart. */
  describe: (d: D) => string
  /** Present for "Replay history" missions. */
  nasa?: {
    design: D
    label: string
    facts: string[]
    source: string
    rows: (mine: D, mineR: R, theirs: D, theirsR: R) => [string, string, string][]
  }
  /** Present for "Design the future" missions: published concept-study numbers to compare with. */
  concept?: { label: string; facts: string[]; source: string }
  frontier?: () => Frontier<D>
  lessons?: (d: D, r: R) => Lesson[]
  dataNote: string
  /** What a science score of 100 means for this mission. */
  scoreScale?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMission = Mission<any, any>
