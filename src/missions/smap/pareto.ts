// Searches every combination of design choices, sizes power for each, flies it, and keeps the
// ones that meet every requirement. The Pareto frontier is the set of designs where you cannot get
// more science without paying more.
import { paretoFrontier } from '../../game/medal'
import type { Frontier, FrontierPoint } from '../../game/types'
import { arrayWattsPerM2 } from '../../physics/model'
import { fly } from './flight'
import { evaluate, RADIOS, ROCKETS, STATIONS, type Design } from './model'

type Point = FrontierPoint<Design>

/** Give a design exactly the power system it needs (+5%), so the search compares architectures. */
export function autoSize(d: Design): Design {
  const r = evaluate({ ...d, arrayM2: 1, batteryWh: 1 })
  return {
    ...d,
    arrayM2: Math.ceil(((r.arrayNeededW * 1.05) / arrayWattsPerM2(1)) * 10) / 10,
    batteryWh: Math.ceil((r.batteryNeededWh * 1.05) / 10) * 10,
  }
}

let cache: Frontier<Design> | null = null

export function searchFrontier(): Frontier<Design> {
  if (cache) return cache
  const feasible: Point[] = []
  let searched = 0
  for (let altitude = 400; altitude <= 850; altitude += 25)
    for (const orbit of ['dawn-dusk', 'noon'] as const)
      for (const dish of [2, 4, 6] as const)
        for (const radar of [false, true])
          for (const camera of [false, true])
            for (const radio of Object.keys(RADIOS) as Design['radio'][])
              for (const stations of Object.keys(STATIONS) as Design['stations'][])
                for (const rocket of Object.keys(ROCKETS) as Design['rocket'][]) {
                  searched++
                  const d = autoSize({ altitude, orbit, dish, radar, camera, radio, stations, rocket, arrayM2: 0, batteryWh: 0 })
                  const r = evaluate(d)
                  if (!r.checks.every((c) => c.ok)) continue
                  const f = fly(d, r)
                  feasible.push({ design: d, cost: r.costM, science: f.finalScience })
                }

  cache = paretoFrontier(feasible, searched)
  return cache
}

