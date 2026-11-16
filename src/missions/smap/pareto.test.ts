import { expect, it } from 'vitest'
import { searchFrontier } from './pareto'

it('finds feasible designs and a monotone frontier', () => {
  const t = performance.now()
  const f = searchFrontier()
  const ms = performance.now() - t
  console.log('searched', f.searched, 'feasible', f.feasible.length, 'frontier', f.frontier.length, 'ms', ms.toFixed(0))
  for (const p of f.frontier) console.log(p.cost.toFixed(0), p.science, JSON.stringify(p.design))
  expect(f.feasible.length).toBeGreaterThan(10)
  for (let i = 1; i < f.frontier.length; i++) {
    expect(f.frontier[i].cost).toBeGreaterThanOrEqual(f.frontier[i - 1].cost)
    expect(f.frontier[i].science).toBeGreaterThan(f.frontier[i - 1].science)
  }
})
