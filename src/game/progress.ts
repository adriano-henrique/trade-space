// Stars per mission and per level, kept in the browser so the mission map remembers what you flew.
import { LEVELS, loadLevel, type Level } from './level'
import type { AnyMission, Check, Flight } from './types'

/** Stars before levels kept their own: one number per mission. */
const OLD_KEY = 'trade-space-stars'
const KEY = 'trade-space-stars-by-level'

/** Best stars for each mission, at each level. */
export type StarBook = Record<Level, Record<string, number>>

const empty = (): StarBook => ({ explorer: {}, student: {}, engineer: {} })

export function loadStars(): StarBook {
  const book = empty()
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<StarBook>
      for (const l of LEVELS) book[l.id] = { ...parsed[l.id] }
      return book
    }
    // Stars earned before levels kept their own count for the level you last played at.
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      book[loadLevel()] = JSON.parse(old) as Record<string, number>
      localStorage.setItem(KEY, JSON.stringify(book))
    }
  } catch {
    // storage blocked or unreadable: start fresh
  }
  return book
}

export function saveStars(level: Level, missionId: string, stars: number): StarBook {
  const book = loadStars()
  if ((book[level][missionId] ?? -1) < stars) book[level][missionId] = stars
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {
    // storage blocked: progress lasts for this visit only
  }
  return book
}

/**
 * 0 = spacecraft lost. 1 = it flew but missed a goal. 2 = every goal met.
 * 3 = every goal met and at least as much science as the benchmark (NASA's design, or 100).
 */
export function starsFor(flight: Flight, checks: Check[], benchmark: number): 0 | 1 | 2 | 3 {
  if (flight.lost) return 0
  if (!checks.every((c) => c.ok)) return 1
  return flight.finalScience >= benchmark ? 3 : 2
}

/** Stars for a flight of this mission. Three stars means matching NASA's own design. */
export function missionStars(mission: AnyMission, design: unknown, flight: Flight): 0 | 1 | 2 | 3 {
  const checks = (mission.evaluate(design) as { checks: Check[] }).checks
  // NASA flew without your crew: the benchmark is the mission with no edges.
  const bare = mission.bare ?? mission
  const benchmark = bare.nasa ? bare.fly(bare.nasa.design, bare.evaluate(bare.nasa.design)).finalScience : 100
  return starsFor(flight, checks, benchmark)
}
