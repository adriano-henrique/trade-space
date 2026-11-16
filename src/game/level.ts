// Three ways to play the same missions with the same physics. The level never changes the
// numbers. It changes how much help you get with an estimate, which words are used, and how
// strictly guesses are graded.
import { createContext, useContext } from 'react'

export type Level = 'explorer' | 'student' | 'engineer'

/** The help on offer before you lock an estimate in. */
export interface Aids {
  /** A ladder of three clues, each one closer to the answer. */
  clues: boolean
  /** The formula, with what every symbol stands for and its value for your design. */
  formula: boolean
  /** A calculator that knows the formula's symbols and can type the formula for you. */
  calculator: boolean
}

export const AIDS: { id: keyof Aids; name: string }[] = [
  { id: 'clues', name: 'Clues' },
  { id: 'formula', name: 'Formula' },
  { id: 'calculator', name: 'Calculator' },
]

export interface LevelInfo {
  id: Level
  name: string
  who: string
  /** What playing at this level is like, in one line. */
  what: string
  aids: Aids
}

/** Easiest first. */
export const LEVELS: LevelInfo[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    who: 'New to space',
    what: 'Plain words, and all the help you want on every guess.',
    aids: { clues: true, formula: true, calculator: true },
  },
  {
    id: 'student',
    name: 'Student',
    who: 'Learning the physics',
    what: 'Real terms and units. You get the formula, and the working out is yours.',
    aids: { clues: false, formula: true, calculator: false },
  },
  {
    id: 'engineer',
    name: 'Engineer',
    who: 'You know your orbits',
    what: 'Engineering briefs and no help. You type your own estimate.',
    aids: { clues: false, formula: false, calculator: false },
  },
]

export const levelInfo = (level: Level) => LEVELS.find((l) => l.id === level)!

/** The easiest of several levels: a flight counts for the easiest level any part of it was played at. */
export function easiest(levels: Level[]): Level {
  return LEVELS.find((l) => levels.includes(l.id))?.id ?? 'engineer'
}

const KEY = 'trade-space-level'

export function loadLevel(): Level {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'explorer' || v === 'student' || v === 'engineer') return v
  } catch {
    // storage blocked
  }
  return 'student'
}

export function saveLevel(level: Level) {
  try {
    localStorage.setItem(KEY, level)
  } catch {
    // storage blocked: the choice lasts for this visit
  }
}

export const LevelContext = createContext<Level>('student')

/** Wording and help for the current level. */
export function useLevel() {
  const level = useContext(LevelContext)
  return {
    level,
    /** The help this level gives with an estimate. */
    aids: levelInfo(level).aids,
    /** A short name: plain for explorers, plain with the real term for students, the real term for engineers. */
    term: (plain: string, tech: string) => (level === 'explorer' ? plain : level === 'student' ? `${plain} (${tech})` : tech),
    /** A sentence: plain for explorers and students, technical for engineers. */
    say: (plain: string, tech: string) => (level === 'engineer' ? tech : plain),
    /** Budget lines, units and the finer numbers: shown to students and engineers. */
    detail: level !== 'explorer',
    expert: level === 'engineer',
  }
}

/** How many times off a guess may be for each medal: [bullseye, gold, silver, bronze]. */
export const MEDAL_LIMITS: Record<Level, [number, number, number, number]> = {
  explorer: [1.25, 2, 5, 10],
  student: [1.2, 1.6, 3, 10],
  engineer: [1.1, 1.3, 2, 5],
}
