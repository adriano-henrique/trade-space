import { MEDAL_LIMITS, type Level } from './level'
import type { Frontier, FrontierPoint } from './types'

export interface Medal {
  label: string
  emoji: string
  tier: 0 | 1 | 2 | 3 | 4
  factor: number
}

/** Grade by how many times off the estimate is: the way engineers judge back-of-envelope work. */
export function medal(estimate: number, truth: number, level: Level = 'student'): Medal {
  const factor = Math.max(estimate / truth, truth / estimate)
  const [bullseye, gold, silver, bronze] = MEDAL_LIMITS[level]
  if (factor <= bullseye) return { label: 'Bullseye!', emoji: '🎯', tier: 4, factor }
  if (factor <= gold) return { label: 'NASA-grade guess', emoji: '🥇', tier: 3, factor }
  if (factor <= silver) return { label: 'Good instinct', emoji: '🥈', tier: 2, factor }
  if (factor <= bronze) return { label: 'Right ballpark', emoji: '🥉', tier: 1, factor }
  return { label: `Off by ${factor < 10 ? factor.toFixed(1) : factor.toFixed(0)} times`, emoji: '📡', tier: 0, factor }
}

export const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export function formatValue(n: number, unit: string) {
  const digits = n < 10 ? 1 : 0
  return `${fmt(n, digits)} ${unit}`
}

/** A catalogue price in $M. When the crew has changed it, the old price stays visible. */
export function priceText(baseM: number, factor = 1) {
  const now = `$${fmt(Math.round(baseM * factor))} million`
  return factor === 1 ? now : `${now} (was $${fmt(baseM)}M)`
}

/** A catalogue mass in kg, with any crew edge applied. */
export const kgText = (baseKg: number, factor = 1) => `${+(baseKg * factor).toFixed(1)} kg`

/** Keep the points no other point beats on both cost (lower) and science (higher). */
export function paretoFrontier<D>(feasible: FrontierPoint<D>[], searched: number): Frontier<D> {
  const sorted = [...feasible].sort((a, b) => a.cost - b.cost || b.science - a.science)
  const frontier: FrontierPoint<D>[] = []
  let best = -Infinity
  for (const p of sorted) {
    if (p.science > best) {
      frontier.push(p)
      best = p.science
    }
  }
  return { searched, feasible, frontier }
}

export function cheapestFor<D>(science: number, f: Frontier<D>): FrontierPoint<D> | undefined {
  return f.frontier.find((p) => p.science >= science)
}
