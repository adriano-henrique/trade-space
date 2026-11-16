// Mission 3 — "Design the Future: Uranus Orbiter & Probe" (2022 Planetary Decadal Survey's top
// flagship). No right answer exists yet. Launch windows come from real JPL Horizons positions of
// Jupiter and Uranus; parts are game-simplified approximations (see VERIFY.md).
import ephem from '../../data/jupiter-uranus.json'
import { NO_PERKS, type Perks } from '../../game/crew'
import type { BarSpec, Check, Evaluation } from '../../game/types'
import { arrayWattsPerM2, AU_KM, downlinkKbps, hohmannYears, lightTimeS, propellantKg } from '../../physics/model'

export const URANUS_AU = 19.2
/**
 * Uranus reached equinox in Dec 2007; the next is ~2049 (seasons last ~21 years). Until then the
 * moons' northern hemispheres, never seen by Voyager 2 in 1986, are in sunlight. Arrive after the
 * equinox and those halves slide into a decades-long night.
 */
export const NEXT_EQUINOX = 2049
export const MISSION = { budgetM: 3500, maxCruiseYears: 15, objective: 'Uranus has been visited once, by Voyager 2’s flyby in 1986. Design the orbiter (and maybe the atmospheric probe) that answers how ice giants form, why Uranus is tipped on its side, and what its moons and rings are made of.' }

export type Rocket = 'vulcan' | 'falconHeavy' | 'sls'
export const ROCKETS: Record<Rocket, { name: string; baseKg: number; costM: number; note: string }> = {
  vulcan: { name: 'Vulcan Centaur VC6', baseKg: 5000, costM: 200, note: 'New American heavy-lift rocket.' },
  falconHeavy: { name: 'Falcon Heavy (expendable)', baseKg: 7500, costM: 300, note: 'All three cores thrown away for maximum energy. NASA’s study baseline.' },
  sls: { name: 'SLS Block 1B', baseKg: 14000, costM: 2200, note: 'Enormous capability, enormous price.' },
}

export const INSTRUMENTS = {
  cam: { name: 'Narrow & wide-angle cameras', kg: 30, w: 20, costM: 60, gbYr: 4, value: 20, note: 'Moons, rings, storms.' },
  mag: { name: 'Magnetometer', kg: 20, w: 8, costM: 30, gbYr: 0.3, value: 20, note: 'Uranus’s field is tilted ~60° and off-centre. Why?' },
  irs: { name: 'Infrared/thermal spectrometer', kg: 35, w: 25, costM: 70, gbYr: 2, value: 15, note: 'Why does Uranus give off so little internal heat?' },
  dust: { name: 'Dust & plasma package', kg: 25, w: 12, costM: 40, gbYr: 0.5, value: 15, note: 'Rings and the strange magnetosphere.' },
} as const
export type InstrumentId = keyof typeof INSTRUMENTS

export interface Design {
  launchYear: number
  assist: 'jupiter' | 'none'
  rocket: Rocket
  power: 'rtg' | 'solar'
  rtgs: 2 | 3 | 4
  arrayM2: number
  probe: boolean
  capture: 'propulsive' | 'aerocapture'
  tourYears: 2 | 4 | 6
  hga: 2.5 | 4
  cam: boolean
  mag: boolean
  irs: boolean
  dust: boolean
}

export const LAUNCH_YEARS = [2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2038, 2040, 2042, 2044, 2045, 2046, 2047]

// ---- Real geometry: how well is Jupiter placed to fling a spacecraft toward Uranus?
const JD_2026 = 2461041.5
type Row = [number, number, number]
function longitude(body: 'jupiter' | 'uranus', jd: number): number | null {
  const rows = ephem.bodies[body] as Row[]
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i][0] <= jd && jd <= rows[i + 1][0]) {
      const t = (jd - rows[i][0]) / (rows[i + 1][0] - rows[i][0])
      let a = rows[i][1]
      let b = rows[i + 1][1]
      if (b - a > 180) b -= 360
      if (a - b > 180) b += 360
      return (((a + t * (b - a)) % 360) + 360) % 360
    }
  }
  return null
}
export const jdOfYear = (year: number) => JD_2026 + (year + 0.45 - 2026) * 365.25

/**
 * After a Jupiter flyby the spacecraft sweeps roughly half an orbit (~170°) on its way out, so the
 * assist works when Uranus, at arrival, sits ~170° beyond where Jupiter was at the flyby.
 * Returns 0 (useless) … 1 (perfect), plus the angle, from real ephemerides.
 */
export function jupiterAlignment(launchYear: number): { quality: number; angle: number | null } {
  const lj = longitude('jupiter', jdOfYear(launchYear) + 1.6 * 365.25)
  const lu = longitude('uranus', jdOfYear(launchYear) + 12 * 365.25)
  if (lj === null || lu === null) return { quality: 0, angle: null }
  const angle = (((lu - lj) % 360) + 360) % 360
  return { quality: Math.max(0, 1 - Math.abs(angle - 170) / 45), angle }
}

export function planetLongitudes(jd: number) {
  return { jupiter: longitude('jupiter', jd), uranus: longitude('uranus', jd) }
}

const RTG = { bolW: 245, kg: 60, costM: 90, decay: 0.02 } // Next-Generation RTG class
const ISP = 320
const TX_W = 25 // X-band transmitter output

export interface Result extends Evaluation {
  /** Radio transmitter output, W. */
  txW: number
  northLit: boolean
  alignment: number
  alignAngle: number | null
  cruiseYears: number
  arrivalYear: number
  hohmann: number
  sunlightFactor: number
  lightHours: number
  loadW: number
  powerNeededW: number
  powerEndW: number
  rtgEachEndW: number
  solarWPerM2: number
  kbps: number
  gbPerYear: number
  gbDownPerYear: number
  dataReturn: number
  dryKg: number
  propKg: number
  aeroshellKg: number
  wetKg: number
  capKg: number
  deltaV: number
  costM: number
  science: number
  checks: Check[]
  bars: BarSpec[]
}

export function evaluate(d: Design, p: Perks = NO_PERKS): Result {
  const { quality, angle } = jupiterAlignment(d.launchYear)
  const useAssist = d.assist === 'jupiter' && quality > 0
  const cruiseYears = useAssist ? 12 + 4 * (1 - quality) : 16
  const arrivalYear = d.launchYear + cruiseYears

  const on = (Object.keys(INSTRUMENTS) as InstrumentId[]).filter((k) => d[k])
  const loadW = 280 * p.busPower + on.reduce((s, k) => s + INSTRUMENTS[k].w, 0)
  const powerNeededW = loadW * 1.1
  const ageEnd = cruiseYears + d.tourYears
  const rtgEachEndW = RTG.bolW * (1 - RTG.decay) ** ageEnd
  const solarWPerM2 = arrayWattsPerM2(URANUS_AU) * 0.8 // very cold, very dim light
  const powerEndW = d.power === 'rtg' ? d.rtgs * rtgEachEndW : d.arrayM2 * solarWPerM2

  const txW = TX_W * p.txPower
  const kbps = downlinkKbps(d.hga, URANUS_AU, txW)
  const gbPerYear = on.reduce((s, k) => s + INSTRUMENTS[k].gbYr, 0)
  const gbDownPerYear = (kbps * 1000 * 8 * 3600 * 365) / 8 / 1e9
  const dataReturn = gbPerYear === 0 ? 1 : Math.min(1, gbDownPerYear / gbPerYear)

  const instrumentsKg = on.reduce((s, k) => s + INSTRUMENTS[k].kg, 0) * p.instrumentMass
  const baseDry = 1100 + instrumentsKg + (d.probe ? 330 : 0) + (d.power === 'rtg' ? d.rtgs * RTG.kg : d.arrayM2 * 3) + (d.hga === 4 ? 80 : 40) * p.antenna
  const dryKg = baseDry * 1.25 * p.dryMass
  const aeroshellKg = d.capture === 'aerocapture' ? dryKg * 0.3 : 0
  const deltaV = Math.round((100 + (d.capture === 'propulsive' ? 1650 : 150) + 300) * p.deltaV)
  const propKg = propellantKg(dryKg + aeroshellKg, deltaV, ISP)
  const wetKg = dryKg + aeroshellKg + propKg
  const capKg = Math.round(ROCKETS[d.rocket].baseKg * (useAssist ? 0.35 + 0.65 * quality : 0.3))

  const costM =
    1100 +
    on.reduce((s, k) => s + INSTRUMENTS[k].costM, 0) * p.instrumentCost +
    (d.probe ? 450 : 0) +
    (d.power === 'rtg' ? d.rtgs * RTG.costM : d.arrayM2 * 0.4) +
    (d.hga === 4 ? 45 : 20) * p.antenna +
    (d.capture === 'aerocapture' ? 300 : 0) +
    (cruiseYears * 20 + d.tourYears * 70) * p.opsCost + // cruise and tour operations
    ROCKETS[d.rocket].costM * p.launchCost

  const northLit = arrivalYear < NEXT_EQUINOX
  const seasonFactor = (k: InstrumentId) => (k === 'cam' || k === 'irs') && !northLit ? 0.4 : 1
  const instrumentValue = on.reduce((s, k) => s + INSTRUMENTS[k].value * seasonFactor(k), 0) + (d.probe ? 30 : 0)
  const tourFactor = Math.min(1.3, (d.tourYears / 4) ** 0.6)
  const risk = d.capture === 'aerocapture' ? 0.85 : 1
  const science = Math.round(instrumentValue * tourFactor * dataReturn * risk * p.science)

  const checks: Check[] = [
    {
      id: 'power',
      label: 'Still enough power at the very end',
      short: 'Power',
      tech: { label: 'End-of-mission power ≥ load', detail: `${powerEndW.toFixed(0)} / ${powerNeededW.toFixed(0)} W at T+${ageEnd.toFixed(1)} yr` },
      ok: powerEndW >= powerNeededW,
      detail: `${powerEndW.toFixed(0)} of ${powerNeededW.toFixed(0)} watts needed, ${ageEnd.toFixed(0)} years after launch`,
      hiddenUntilFlight: d.power === 'solar',
    },
    { id: 'rocket', label: `Light enough for ${ROCKETS[d.rocket].name}`, short: 'Rocket', tech: { label: `Wet mass within ${ROCKETS[d.rocket].name} capacity for this window`, detail: `${wetKg.toFixed(0)} / ${capKg} kg` }, ok: wetKg <= capKg, detail: `${wetKg.toFixed(0)} of ${capKg.toLocaleString('en-US')} kg` },
    {
      id: 'season',
      label: `Arrives before ${NEXT_EQUINOX}, while the moons’ never-seen sides are in sunlight`,
      short: 'In time',
      tech: { label: `Arrival before the ${NEXT_EQUINOX} equinox (northern moon hemispheres sunlit)`, detail: `arrival ${arrivalYear.toFixed(1)}` },
      ok: northLit,
      detail: `you arrive in ${Math.floor(arrivalYear)}`,
    },
    {
      id: 'cruise',
      label: `The trip takes ${MISSION.maxCruiseYears} years or less`,
      short: 'Trip length',
      tech: { label: `Cruise ≤ ${MISSION.maxCruiseYears} years`, detail: `${cruiseYears.toFixed(1)} yr` },
      ok: cruiseYears <= MISSION.maxCruiseYears,
      detail: `yours takes ${cruiseYears.toFixed(1)} years`,
    },
    { id: 'data', label: 'Most of the data gets home', short: 'Data home', tech: { label: 'Data return ≥ 80%', detail: `${(dataReturn * 100).toFixed(0)}% from 19.2 AU` }, ok: dataReturn >= 0.8, detail: `${(dataReturn * 100).toFixed(0)}% gets home` },
    {
      id: 'budget',
      label: `Costs less than $${(MISSION.budgetM / 1000).toFixed(1)} billion`,
      short: 'Budget',
      tech: { label: 'Life-cycle cost within the cost cap', detail: `${costM.toFixed(0)} / ${MISSION.budgetM} $M` },
      ok: costM <= MISSION.budgetM,
      detail: `$${(costM / 1000).toFixed(2)} billion`,
    },
  ]

  return {
    perks: p,
    txW,
    northLit,
    alignment: useAssist ? quality : 0,
    alignAngle: angle,
    cruiseYears,
    arrivalYear,
    hohmann: hohmannYears(1, URANUS_AU),
    sunlightFactor: URANUS_AU ** 2,
    lightHours: lightTimeS(URANUS_AU * AU_KM) / 3600,
    loadW,
    powerNeededW,
    powerEndW,
    rtgEachEndW,
    solarWPerM2,
    kbps,
    gbPerYear,
    gbDownPerYear,
    dataReturn,
    dryKg,
    propKg,
    aeroshellKg,
    wetKg,
    capKg,
    deltaV,
    costM,
    science,
    checks,
    bars: [
      {
        label: 'Mass on the rocket',
        value: wetKg,
        max: capKg,
        unit: 'kg',
        detail: `${dryKg.toFixed(0)} dry + ${aeroshellKg ? `${aeroshellKg.toFixed(0)} heat shield + ` : ''}${propKg.toFixed(0)} propellant for ${deltaV} m/s`,
      },
      { label: 'Cost', value: costM, max: MISSION.budgetM, unit: '$M', detail: `incl. ${cruiseYears.toFixed(1)} years of cruise and a ${d.tourYears}-year tour` },
      { label: 'Data sent home', value: gbDownPerYear, max: gbPerYear || 1, unit: 'GB/yr', detail: `${kbps.toFixed(1)} kbps from 19 AU`, invert: true },
    ],
  }
}

export const STARTER: Design = {
  launchYear: 2036,
  assist: 'jupiter',
  rocket: 'vulcan',
  power: 'solar',
  rtgs: 3,
  arrayM2: 40,
  probe: false,
  capture: 'propulsive',
  tourYears: 4,
  hga: 2.5,
  cam: true,
  mag: true,
  irs: false,
  dust: false,
}

export const CONCEPT_FACTS = [
  'Ranked the highest-priority new Flagship mission by the 2022 Planetary Science and Astrobiology Decadal Survey',
  'Baseline: launch in June 2031 or April 2032 on a Falcon Heavy (expendable), Jupiter gravity assist, about 13 years of cruise, arrival in 2044',
  'Power from three next-generation radioisotope generators (RTGs). At 19 AU sunlight is about 370 times weaker than at Earth',
  'Carries an atmospheric probe, then spends about 4.5 years touring the planet, rings and moons',
  'Arriving before Uranus’s ~2049 equinox matters: until then the moons’ northern hemispheres, never seen by Voyager 2, are in sunlight',
  'Later studies warn that if the 2031–32 window is missed, the next Jupiter-assisted trajectory is not available until the 2040s',
]
