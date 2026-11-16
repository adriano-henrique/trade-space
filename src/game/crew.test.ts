import { expect, it } from 'vitest'
import { MISSIONS } from '../missions'
import { calculate } from './calc'
import { builtSize, candidates, edgeWorks, fillSeats, fullCrew, hired, NO_PERKS, perksOf, ROLE_ORDER, ROSTER, withCrew, type Hires } from './crew'
import { missionStars } from './progress'

/** Every way to fill the four seats: 3 × 3 × 3 × 3. */
function everyCrew(): Hires[] {
  let out: Hires[] = [{}]
  for (const role of ROLE_ORDER) out = out.flatMap((h) => candidates(role).map((m) => ({ ...h, [role]: m.id })))
  return out
}

const designsOf = (mission: (typeof MISSIONS)[number]) => [mission.starter, mission.nasa?.design].filter(Boolean)

it('has three candidates for each of the four seats, and no edge is a blank', () => {
  for (const role of ROLE_ORDER) expect(candidates(role)).toHaveLength(3)
  expect(new Set(ROSTER.map((m) => m.id)).size).toBe(ROSTER.length)
  for (const m of ROSTER) expect(perksOf({ [m.role]: m.id }), m.id).not.toEqual(NO_PERKS)
  expect(everyCrew()).toHaveLength(81)
})

it('an empty or unknown crew changes nothing', () => {
  expect(perksOf({})).toEqual(NO_PERKS)
  expect(perksOf({ director: 'nobody' })).toEqual(NO_PERKS)
  // A candidate can only sit in their own department's seat.
  expect(hired({ director: 'rafael' })).toEqual([])
  for (const mission of MISSIONS) {
    const r = mission.evaluate(mission.starter)
    expect(mission.evaluate(mission.starter, perksOf({})).costM).toBe(r.costM)
    expect(r.perks).toEqual(NO_PERKS)
  }
})

it('picking the rest fills every seat and keeps the seats already chosen', () => {
  const h = fillSeats({ science: 'nia' })
  expect(fullCrew(h)).toBe(true)
  expect(h.science).toBe('nia')
  expect(fullCrew({ science: 'nia' })).toBe(false)
})

it('the ballpark edge is off for engineers, and picking the rest never hires it for them', () => {
  const sam = ROSTER.find((m) => m.edge.perks.ballpark)!
  expect(edgeWorks(sam, 'explorer')).toBe(true)
  expect(edgeWorks(sam, 'student')).toBe(true)
  expect(edgeWorks(sam, 'engineer')).toBe(false)
  // Every other edge works at every level.
  for (const m of ROSTER) if (m !== sam) expect(edgeWorks(m, 'engineer')).toBe(true)
  for (let i = 0; i < 40; i++) expect(fillSeats({}, 'engineer')[sam.role]).not.toBe(sam.id)
})

it('every edge that acts on the spacecraft moves its own number the right way, on every mission', () => {
  for (const mission of MISSIONS) {
    for (const design of designsOf(mission)) {
      const base = mission.evaluate(design)
      const [mass0, cost0] = base.bars
      for (const m of ROSTER) {
        const r = mission.evaluate(design, perksOf({ [m.role]: m.id }))
        const [mass, cost] = r.bars
        const where = `${mission.id}/${m.id}`
        if (m.edge.measure === 'cost') expect(cost.value, where).toBeLessThan(cost0.value)
        if (m.edge.measure === 'mass') expect(mass.value, where).toBeLessThan(mass0.value)
        if (m.edge.measure === 'hardware') {
          expect(mass.value, where).toBeLessThan(mass0.value)
          expect(cost.value, where).toBeLessThan(cost0.value)
        }
        if (m.edge.measure === 'power') expect(r.loadW, where).toBeLessThan(base.loadW)
        if (m.edge.measure === 'data') expect((r.kbps ?? r.mbps) / (base.kbps ?? base.mbps), where).toBeCloseTo(1.6, 5)
        // Nobody makes anything heavier or dearer.
        expect(mass.value, where).toBeLessThanOrEqual(mass0.value + 1e-9)
        expect(cost.value, where).toBeLessThanOrEqual(cost0.value + 1e-9)
      }
    }
  }
})

it('the science edge raises the score of a mission that survives', () => {
  for (const mission of MISSIONS) {
    const design = mission.nasa?.design
    if (!design) continue
    const plain = mission.fly(design, mission.evaluate(design))
    const boosted = mission.fly(design, mission.evaluate(design, perksOf({ science: 'nia' })))
    expect(plain.lost).toBe(false)
    expect(boosted.finalScience / plain.finalScience, mission.id).toBeCloseTo(1.08, 1)
  }
})

it('formula cards still give the game’s answer under every possible crew', () => {
  let checked = 0
  for (const hires of everyCrew()) {
    const perks = perksOf(hires)
    for (const mission of MISSIONS) {
      for (const design of designsOf(mission)) {
        const result = mission.evaluate(design, perks)
        for (const metric of Object.values(mission.metrics)) {
          const card = metric.formula!(design, result)
          const truth = metric.truth(design, result)
          let value: number
          try {
            value = calculate(card.type, Object.fromEntries(card.vars.map((v) => [v.name, v.value])))
          } catch {
            expect(metric.id).toBe('eclipse')
            continue
          }
          expect(Math.abs(value / truth - 1), `${mission.id}/${metric.id} with ${Object.values(hires).join('+')}: ${value} vs ${truth}`).toBeLessThan(0.01)
          checked++
        }
      }
    }
  }
  expect(checked).toBeGreaterThan(81 * 25)
})

it('margin on sized parts rounds like a part you could order', () => {
  expect(builtSize(60, NO_PERKS)).toBe(60)
  expect(builtSize(60, perksOf({ systems: 'leila' }))).toBe(69)
  expect(builtSize(5, perksOf({ systems: 'leila' }))).toBe(5.8)
})

it('a crewed mission is graded against NASA flying with no crew', () => {
  for (const base of MISSIONS) {
    if (!base.nasa) continue
    const crewed = withCrew(base, perksOf({ director: 'amara', systems: 'rafael', science: 'nia', comms: 'diego' }))
    expect(crewed.bare).toBe(base)
    const design = base.nasa.design
    // NASA's own design, flown by a crew with a science edge, beats the bare benchmark.
    expect(missionStars(crewed, design, crewed.fly(design, crewed.evaluate(design)))).toBe(3)
    expect(missionStars(base, design, base.fly(design, base.evaluate(design)))).toBe(3)
  }
})
