import { expect, it } from 'vitest'
import { evaluate, jupiterAlignment, type Design } from './model'

const study: Design = { launchYear: 2031, assist: 'jupiter', rocket: 'falconHeavy', power: 'rtg', rtgs: 3, arrayM2: 0, probe: true, capture: 'propulsive', tourYears: 4, hga: 4, cam: true, mag: true, irs: true, dust: true }

it('launch windows from real ephemerides peak in 2031–32 and return in the mid-2040s', () => {
  const q = (y: number) => jupiterAlignment(y).quality
  expect(q(2031)).toBeGreaterThan(0.5)
  expect(q(2032)).toBeGreaterThan(0.5)
  expect(q(2036)).toBe(0)
  expect(q(2045)).toBeGreaterThan(0.5)
})

it('a study-like design closes', () => {
  const r = evaluate(study)
  console.log(JSON.stringify({ cruise: r.cruiseYears.toFixed(1), power: r.powerEndW.toFixed(0), need: r.powerNeededW.toFixed(0), kbps: r.kbps.toFixed(1), data: r.dataReturn.toFixed(2), wet: r.wetKg.toFixed(0), cap: r.capKg, cost: r.costM.toFixed(0), science: r.science, checks: r.checks.map((c) => `${c.ok ? 'OK' : 'XX'} ${c.label}: ${c.detail}`) }, null, 1))
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(evaluate({ ...study, rtgs: 2 }).checks.find((c) => c.id === 'power')!.ok).toBe(false)
})

import { uranusMission } from './index'

it('Uranus frontier search runs and finds designs', () => {
  const t = performance.now()
  const f = uranusMission.frontier!()
  console.log('uranus searched', f.searched, 'feasible', f.feasible.length, 'frontier', f.frontier.length, 'ms', (performance.now() - t).toFixed(0))
  for (const p of f.frontier) console.log(p.cost.toFixed(0), p.science, uranusMission.describe(p.design))
  expect(f.feasible.length).toBeGreaterThan(5)
})
