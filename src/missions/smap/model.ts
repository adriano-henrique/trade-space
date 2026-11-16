// Mission 1 — "Replay History: SMAP" (Soil Moisture Active Passive, launched 31 Jan 2015).
// Physics comes from ../physics/model. Catalog masses, powers and costs are game-simplified
// approximations, flagged `approx` and listed in VERIFY.md; they are tuned so NASA's real
// choices land near SMAP's real 944 kg launch mass.
import {
  arrayPowerNeededW,
  arrayWattsPerM2,
  batteryNeededWh,
  dragDvPerYear,
  eclipseMin,
  footprintKm,
  maxPassMin,
  orbitPeriodMin,
  propellantKg,
  revisitDays,
  sunSyncInclinationDeg,
  swathKm,
  worstBetaDeg,
} from '../../physics/model'
import { NO_PERKS, type Perks } from '../../game/crew'
import type { BarSpec, Check, Evaluation } from '../../game/types'

export type Rocket = 'pegasus' | 'minotaur' | 'delta2' | 'falcon9'
export type Radio = 'S' | 'X' | 'Ka'
export type Stations = 'one' | 'polar' | 'polar3'

export interface Design {
  altitude: number
  orbit: 'dawn-dusk' | 'noon'
  dish: 2 | 4 | 6
  radar: boolean
  camera: boolean
  arrayM2: number
  batteryWh: number
  radio: Radio
  stations: Stations
  rocket: Rocket
}

export const MISSION = {
  id: 'smap',
  name: 'SMAP',
  fullName: 'Soil Moisture Active Passive',
  year: 2015,
  launchDate: '2015-01-31',
  lifetimeYears: 3,
  budgetM: 1000,
  objective:
    'Map the water in the top 5 cm of soil across the whole planet, every 2–3 days, to improve weather and flood forecasts and track droughts.',
  requirements: {
    resolutionKm: 40,
    revisitDays: 3,
    dataReturn: 0.95,
  },
  wavelengthM: 0.21, // L-band, 1.41 GHz — sees through clouds and senses soil water
}

export const ROCKETS: Record<Rocket, { name: string; capacityKg: number; costM: number; note: string }> = {
  pegasus: { name: 'Pegasus XL', capacityKg: 300, costM: 45, note: 'Air-launched from a jet. Cheap, tiny.' },
  minotaur: { name: 'Minotaur IV', capacityKg: 750, costM: 55, note: 'Built from retired missile stages.' },
  delta2: { name: 'Delta II 7320', capacityKg: 1100, costM: 100, note: 'Workhorse of NASA science, 1989–2018.' },
  falcon9: { name: 'Falcon 9', capacityKg: 8000, costM: 75, note: 'New in 2015 — a lot of rocket for a small satellite.' },
}

export const RADIOS: Record<Radio, { name: string; mbps: number; kg: number; w: number; costM: number }> = {
  S: { name: 'S-band', mbps: 2, kg: 5, w: 30, costM: 5 },
  X: { name: 'X-band', mbps: 130, kg: 12, w: 80, costM: 15 },
  Ka: { name: 'Ka-band', mbps: 600, kg: 15, w: 120, costM: 30 },
}

export const STATIONS: Record<Stations, { name: string; passesPerDay: (orbitsPerDay: number) => number; costM: number }> = {
  one: { name: '1 mid-latitude station', passesPerDay: () => 4, costM: 5 },
  polar: { name: 'Polar pair (Svalbard + Alaska)', passesPerDay: (n) => n * 1.0, costM: 20 },
  polar3: { name: 'Polar pair + McMurdo (Antarctica)', passesPerDay: (n) => n * 1.5, costM: 30 },
}

const DISH: Record<Design['dish'], { kg: number; costM: number }> = {
  2: { kg: 15, costM: 20 },
  4: { kg: 35, costM: 45 },
  6: { kg: 60, costM: 80 },
}

export const NASA_DESIGN: Design = {
  altitude: 685,
  orbit: 'dawn-dusk',
  dish: 6,
  radar: true,
  camera: false,
  arrayM2: 6,
  batteryWh: 1200,
  radio: 'X',
  stations: 'polar3',
  rocket: 'delta2',
}

export const NASA_FACTS = [
  'Orbit: 685 km, sun-synchronous, crossing the equator at 6 a.m./6 p.m. (dawn–dusk)',
  'A 6 m mesh reflector spinning at 14.6 rpm sweeps a ~1000 km swath',
  'L-band radiometer (~40 km pixels) + L-band radar (1–3 km pixels)',
  'Launch mass 944 kg on a Delta II from Vandenberg, 31 January 2015',
  'July 2015: the radar’s power amplifier failed. The radiometer carried the mission on.',
]

export const STARTER: Design = {
  altitude: 550,
  orbit: 'noon',
  dish: 4,
  radar: false,
  camera: true,
  arrayM2: 3,
  batteryWh: 300,
  radio: 'S',
  stations: 'one',
  rocket: 'minotaur',
}

export interface Result extends Evaluation {
  /** Downlink rate of the chosen radio, with any crew edge. */
  mbps: number
  period: number
  inclination: number
  eclipse: number
  footprint: number
  swath: number
  revisit: number
  loadW: number
  arrayW: number
  arrayNeededW: number
  batteryNeededWh: number
  collectGbDay: number
  downlinkGbDay: number
  dataReturn: number
  dryKg: number
  propKg: number
  wetKg: number
  rocketCapKg: number
  costM: number
  deltaV: number
  science: number
  checks: Check[]
  bars: BarSpec[]
}

export function evaluate(d: Design, p: Perks = NO_PERKS): Result {
  const period = orbitPeriodMin(d.altitude)
  const inclination = sunSyncInclinationDeg(d.altitude)
  const eclipse = eclipseMin(d.altitude, worstBetaDeg(d.orbit, inclination))
  const footprint = footprintKm(d.dish, d.altitude, MISSION.wavelengthM)
  const swath = swathKm(d.altitude)
  const revisit = revisitDays(d.altitude, swath)

  // Power (approx loads): bus 400 W, radiometer 100 W, radar 350 W, camera 40 W, spinning dish 60 W
  const radio = RADIOS[d.radio]
  const loadW = 400 * p.busPower + 100 + (d.radar ? 350 : 0) + (d.camera ? 40 : 0) + 60 + radio.w
  const arrayW = d.arrayM2 * arrayWattsPerM2(1)
  const arrayNeededW = arrayPowerNeededW(loadW, period, eclipse)
  const batteryNeeded = batteryNeededWh(loadW, eclipse)

  // Data (approx volumes): radiometer 4 GB/day, radar 100 GB/day, camera 30 GB/day
  const collectGbDay = 4 + (d.radar ? 100 : 0) + (d.camera ? 30 : 0)
  const orbitsPerDay = 1440 / period
  const passMin = maxPassMin(d.altitude) * 0.7 // average pass is shorter than an overhead one
  const passes = STATIONS[d.stations].passesPerDay(orbitsPerDay)
  const mbps = radio.mbps * p.txPower
  const downlinkGbDay = (mbps * 1e6 * passMin * 60 * passes) / 8 / 1e9
  const dataReturn = Math.min(1, downlinkGbDay / collectGbDay)

  // Mass (approx): bus 350 kg, payload, structure 15% of payload, arrays 3.5 kg/m², battery 100 Wh/kg
  // The reflector is both an instrument and an antenna, so both kinds of crew edge apply to it.
  const payloadKg = (40 + DISH[d.dish].kg * p.antenna + 45 + (d.radar ? 90 : 0) + (d.camera ? 30 : 0)) * p.instrumentMass
  const baseDry = 350 + payloadKg * 1.15 + d.arrayM2 * 3.5 + d.batteryWh / 100 + radio.kg * p.antenna
  const dryKg = baseDry * 1.25 * p.dryMass // 25% contingency, standard at the concept stage
  const deltaV = (30 + MISSION.lifetimeYears * dragDvPerYear(d.altitude) + (d.altitude > 600 ? 60 : 0)) * p.deltaV
  const propKg = propellantKg(dryKg, deltaV, 220) // hydrazine thrusters
  const wetKg = dryKg + propKg
  const rocket = ROCKETS[d.rocket]

  const costM =
    260 + // bus and integration
    (60 + DISH[d.dish].costM * p.antenna + (d.radar ? 120 : 0) + (d.camera ? 40 : 0)) * p.instrumentCost + // radiometer, reflector, extras
    d.arrayM2 * 1.5 +
    d.batteryWh * 0.01 +
    radio.costM * p.antenna +
    (30 + STATIONS[d.stations].costM) * MISSION.lifetimeYears * p.opsCost + // operations team and ground stations, per year
    rocket.costM * p.launchCost

  const checks: Check[] = [
    {
      id: 'resolution',
      label: `Map is sharp enough: dots ${MISSION.requirements.resolutionKm} km wide or smaller`,
      short: 'Sharp map',
      tech: { label: `Radiometer footprint ≤ ${MISSION.requirements.resolutionKm} km`, detail: `${footprint.toFixed(1)} km (diffraction limit at 1.41 GHz)` },
      ok: footprint <= MISSION.requirements.resolutionKm * 1.05,
      detail: `yours are ${footprint.toFixed(0)} km wide`,
    },
    {
      id: 'revisit',
      label: `Sees the whole planet every ${MISSION.requirements.revisitDays} days or faster`,
      short: 'Whole planet',
      tech: { label: `Global revisit ≤ ${MISSION.requirements.revisitDays} days`, detail: `${revisit.toFixed(2)} days with a ${swath.toFixed(0)} km swath` },
      ok: revisit <= MISSION.requirements.revisitDays,
      detail: `yours takes ${revisit.toFixed(1)} days`,
    },
    {
      id: 'data',
      label: 'Almost all the data gets home',
      short: 'Data home',
      tech: { label: `Data return ≥ ${MISSION.requirements.dataReturn * 100}%`, detail: `${(dataReturn * 100).toFixed(0)}% (${downlinkGbDay.toFixed(1)} GB/day downlink vs ${collectGbDay} GB/day collected)` },
      ok: dataReturn >= MISSION.requirements.dataReturn,
      detail: `${(dataReturn * 100).toFixed(0)}% gets home`,
    },
    {
      id: 'array',
      label: 'Solar wings make enough power',
      short: 'Sun power',
      tech: { label: 'Array output ≥ load plus battery recharge', detail: `${arrayW.toFixed(0)} W of ${arrayNeededW.toFixed(0)} W` },
      ok: arrayW >= arrayNeededW,
      detail: `${arrayW.toFixed(0)} of ${arrayNeededW.toFixed(0)} watts needed`,
      hiddenUntilFlight: true,
    },
    {
      id: 'battery',
      label: 'Battery lasts through the dark',
      short: 'Battery',
      tech: { label: 'Battery covers worst-case eclipse at 30% depth of discharge', detail: `${d.batteryWh} Wh of ${batteryNeeded.toFixed(0)} Wh` },
      ok: d.batteryWh >= batteryNeeded,
      detail: `${d.batteryWh} of ${batteryNeeded.toFixed(0)} Wh needed`,
      hiddenUntilFlight: true,
    },
    {
      id: 'rocket',
      label: `Light enough for ${rocket.name}`,
      short: 'Rocket',
      tech: { label: `Wet mass within ${rocket.name} capacity to this orbit`, detail: `${wetKg.toFixed(0)} / ${rocket.capacityKg} kg` },
      ok: wetKg <= rocket.capacityKg,
      detail: `${wetKg.toFixed(0)} of ${rocket.capacityKg.toLocaleString('en-US')} kg`,
    },
    {
      id: 'budget',
      label: `Costs less than $${MISSION.budgetM.toLocaleString('en-US')} million`,
      short: 'Budget',
      tech: { label: 'Life-cycle cost within the cost cap', detail: `${costM.toFixed(0)} / ${MISSION.budgetM} $M` },
      ok: costM <= MISSION.budgetM,
      detail: `$${costM.toFixed(0)} million`,
    },
  ]

  const instrumentValue = 60 + (d.radar ? 30 : 0) // camera adds nothing: optical light can't see soil water under clouds
  const science = Math.round(instrumentValue * dataReturn * (checks.every((c) => c.ok) ? 1 : 0.6) * p.science)

  return {
    perks: p,
    mbps,
    period,
    inclination,
    eclipse,
    footprint,
    swath,
    revisit,
    loadW,
    arrayW,
    arrayNeededW,
    batteryNeededWh: batteryNeeded,
    collectGbDay,
    downlinkGbDay,
    dataReturn,
    dryKg,
    propKg,
    wetKg,
    rocketCapKg: rocket.capacityKg,
    costM,
    deltaV,
    science,
    checks,
    bars: [
      { label: 'Mass on the rocket', value: wetKg, max: rocket.capacityKg, unit: 'kg', detail: `${dryKg.toFixed(0)} dry (incl. 25% margin) + ${propKg.toFixed(0)} fuel` },
      { label: 'Cost', value: costM, max: MISSION.budgetM, unit: '$M', detail: 'spacecraft, instruments, rocket, 3 years of operations' },
      { label: 'Data sent home', value: downlinkGbDay, max: collectGbDay, unit: 'GB/day', detail: `collecting ${collectGbDay.toFixed(0)} GB/day`, invert: true },
    ],
  }
}
