import { expect, it } from 'vitest'
import { evaluate, NASA_DESIGN, STARTER } from './model'

it('NASA Juno design passes every requirement and lands near 3,625 kg', () => {
  const r = evaluate(NASA_DESIGN)
  console.log(JSON.stringify({ load: r.loadW, power: r.powerW.toFixed(0), need: r.powerNeededW.toFixed(0), kbps: r.kbps.toFixed(1), data: r.dataReturn.toFixed(2), dry: r.dryKg.toFixed(0), prop: r.propKg.toFixed(0), wet: r.wetKg.toFixed(0), cost: r.costM.toFixed(0), checks: r.checks.map((c) => `${c.ok ? 'OK' : 'XX'} ${c.label}: ${c.detail}`) }, null, 1))
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.wetKg).toBeGreaterThan(3000)
  expect(r.wetKg).toBeLessThan(3800)
})

it('starter design fails', () => {
  expect(evaluate(STARTER).checks.filter((c) => !c.ok).length).toBeGreaterThan(2)
})

import { fly } from './flight'
import { junoMission } from './index'

it('NASA Juno flies its history and the frontier has choices', () => {
  const r = evaluate(NASA_DESIGN)
  const f = fly(NASA_DESIGN, r)
  console.log('nasa juno science', f.finalScience, 'lost', f.lost, 'days', f.totalDays)
  for (const e of f.events) console.log(e.date, e.title)
  expect(f.lost).toBe(false)
  expect(f.events.some((e) => e.date === '2016-07-05')).toBe(true)
  const t = performance.now()
  const fr = junoMission.frontier!()
  console.log('juno searched', fr.searched, 'feasible', fr.feasible.length, 'frontier', fr.frontier.length, 'ms', (performance.now() - t).toFixed(0))
  for (const p of fr.frontier) console.log(p.cost.toFixed(0), p.science, junoMission.describe(p.design))
  expect(fr.feasible.length).toBeGreaterThan(5)
})
