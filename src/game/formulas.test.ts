import { expect, it } from 'vitest'
import { MISSIONS } from '../missions'
import { calculate } from './calc'

it('the calculator handles the notation the notebook teaches', () => {
  expect(calculate('2*pi*sqrt(4)')).toBeCloseTo(4 * Math.PI)
  expect(calculate('1,361 ÷ 5.2²')).toBeCloseTo(1361 / 27.04)
  expect(calculate('-2^2 + (1.5e3 - 500)/10')).toBeCloseTo(96)
  expect(calculate('a*exp(b)', { a: 2, b: 0 })).toBe(2)
  expect(() => calculate('2*')).toThrow()
  expect(() => calculate('nope + 1')).toThrow()
  expect(() => calculate('sqrt(-1)')).toThrow()
})

it('every formula card, typed into the calculator with its own numbers, gives the game’s answer', () => {
  let checked = 0
  for (const mission of MISSIONS) {
    const designs = [mission.starter, mission.nasa?.design].filter(Boolean)
    for (const design of designs) {
      const result = mission.evaluate(design)
      for (const metric of Object.values(mission.metrics)) {
        expect(metric.formula, `${mission.id}/${metric.id} has a formula card`).toBeTypeOf('function')
        const card = metric.formula!(design, result)
        const vars = Object.fromEntries(card.vars.map((v) => [v.name, v.value]))
        const truth = metric.truth(design, result)
        let value: number
        try {
          value = calculate(card.type, vars)
        } catch {
          // A dawn–dusk orbit that never enters the shadow has no real answer; the game shows a floor.
          expect(metric.id, `${mission.id}/${metric.id} failed to evaluate`).toBe('eclipse')
          continue
        }
        expect(Math.abs(value / truth - 1), `${mission.id}/${metric.id}: ${value} vs ${truth}`).toBeLessThan(0.01)
        checked++
      }
    }
  }
  expect(checked).toBeGreaterThan(25)
})
