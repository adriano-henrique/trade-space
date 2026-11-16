import { expect, it } from 'vitest'
import { NASA_DESIGN, STARTER, evaluate } from './model'

it('NASA design passes every requirement and lands near the real 944 kg', () => {
  const r = evaluate(NASA_DESIGN)
  console.log(JSON.stringify({ ...r, checks: r.checks.map((c) => `${c.ok ? 'OK ' : 'XX '}${c.label}: ${c.detail}`) }, null, 1))
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.wetKg).toBeGreaterThan(800)
  expect(r.wetKg).toBeLessThan(1100)
})

it('starter design fails several requirements', () => {
  const r = evaluate(STARTER)
  expect(r.checks.filter((c) => !c.ok).length).toBeGreaterThan(2)
})

import { fly } from './flight'

it('NASA design survives 2015: St. Patrick’s Day storm and the real radar failure both appear', () => {
  const r = evaluate(NASA_DESIGN)
  const f = fly(NASA_DESIGN, r)
  expect(f.lost).toBe(false)
  expect(f.events.some((e) => e.date === '2015-03-17' && e.title.includes('Kp 8'))).toBe(true)
  expect(f.events.some((e) => e.date === '2015-07-07')).toBe(true)
  expect(f.finalScience).toBeGreaterThan(60)
  console.log('NASA science', f.finalScience)
})
