// Mission 2 — "Replay History: Juno" (launched 5 Aug 2011, Jupiter orbit 5 Jul 2016).
// Physics: inverse-square sunlight, rocket equation, Hohmann transfer, X-band link budget.
// Catalog masses, powers and costs are game-simplified approximations (see VERIFY.md).
import { NO_PERKS, type Perks } from '../../game/crew'
import type { BarSpec, Check, Evaluation } from '../../game/types'
import { arrayWattsPerM2, AU_KM, downlinkKbps, hohmannYears, lightTimeS, propellantKg } from '../../physics/model'

export type Rocket = 'atlas401' | 'atlas551' | 'deltaIVH'

export interface Design {
  power: 'solar' | 'rtg'
  arrayM2: number
  rtgs: 1 | 2 | 3 | 4
  trajectory: 'direct' | 'flyby'
  orbit: 'polar53' | 'polar14' | 'equatorial'
  vaultCm: 0 | 1 | 2
  hga: 1.5 | 2.5 | 4
  mag: boolean
  mwr: boolean
  gravity: boolean
  particles: boolean
  cam: boolean
  rocket: Rocket
}

export const JUPITER_AU = 5.2
export const MISSION = {
  budgetM: 1200,
  launchDate: '2011-08-05',
  requiredPasses: 30,
  objective:
    'Find out how Jupiter formed: measure the water deep in its atmosphere, map its gravity and magnetic fields to probe the core, and study its giant auroras. You need at least 30 close passes.',
}

/** Launch capacity to the escape energy (C3) each trajectory needs. Approximate, game-balanced. */
export const ROCKETS: Record<Rocket, { name: string; costM: number; capKg: { flyby: number; direct: number }; note: string }> = {
  atlas401: { name: 'Atlas V 401', costM: 130, capKg: { flyby: 2200, direct: 600 }, note: 'No solid boosters. The budget option.' },
  atlas551: { name: 'Atlas V 551', costM: 190, capKg: { flyby: 3800, direct: 1300 }, note: 'Five solid boosters. Juno and New Horizons flew on it.' },
  deltaIVH: { name: 'Delta IV Heavy', costM: 375, capKg: { flyby: 7500, direct: 2800 }, note: 'Three cores side by side. The heaviest US rocket of 2011.' },
}

/** C3 (km²/s²): energy above escape. The Earth flyby trajectory needs far less from the rocket. */
export const C3 = { flyby: 31, direct: 80 }

export const INSTRUMENTS = {
  mag: { name: 'Magnetometer', kg: 25, w: 12, costM: 25, gbPerPass: 0.1, note: 'Maps the magnetic field, made deep inside Jupiter. Needs a boom far from the spacecraft.' },
  mwr: { name: 'Microwave radiometer', kg: 50, w: 45, costM: 70, gbPerPass: 0.4, note: 'Sees hundreds of km below the cloud tops to measure water.' },
  gravity: { name: 'Gravity science (Ka-band radio)', kg: 10, w: 30, costM: 20, gbPerPass: 0, note: 'Tiny Doppler shifts in the radio signal reveal what the interior is made of.' },
  particles: { name: 'Aurora & particles package', kg: 60, w: 35, costM: 80, gbPerPass: 0.6, note: 'Watches the most powerful auroras in the solar system.' },
  cam: { name: 'Public camera (JunoCam-like)', kg: 2, w: 6, costM: 5, gbPerPass: 0.3, note: 'Color pictures for everyone. Not required science.' },
} as const
export type InstrumentId = keyof typeof INSTRUMENTS

const HGA: Record<Design['hga'], { kg: number; costM: number }> = { 1.5: { kg: 20, costM: 8 }, 2.5: { kg: 35, costM: 15 }, 4: { kg: 80, costM: 40 } }
const VAULT_KG_PER_CM = 172 // Juno's ~1 cm titanium vault weighed about 172 kg (NASA/JPL)
const RTG = { bolW: 110, kg: 45, costM: 85, decayPerYear: 0.04 } // MMRTG-class
const ISP_EFFECTIVE = 280 // main engine plus thrusters
const TX_W = 25 // X-band transmitter output
const LILT = 0.9 // cells lose efficiency in Low Intensity, Low Temperature light

/** Close passes the electronics survive, by orbit and vault thickness (rated dose, simplified). */
export function passesSurvivable(d: Design): number {
  const rating = [3, 45, 110][d.vaultCm]
  const dosePerPass = d.orbit === 'equatorial' ? 25 : 1
  return Math.floor(rating / dosePerPass)
}

export interface Result extends Evaluation {
  /** Radio transmitter output, W. */
  txW: number
  loadW: number
  powerW: number
  powerNeededW: number
  wPerM2AtJupiter: number
  sunlightFactor: number
  lightMin: number
  cruiseYears: number
  hohmann: number
  kbps: number
  gbPerPass: number
  gbDownPerOrbit: number
  dataReturn: number
  orbitDays: number
  survivable: number
  dryKg: number
  propKg: number
  wetKg: number
  capKg: number
  deltaV: number
  costM: number
  checks: Check[]
  bars: BarSpec[]
}

export function evaluate(d: Design, p: Perks = NO_PERKS): Result {
  const yearsToJupiter = d.trajectory === 'flyby' ? 4.9 : 2.5
  const hohmann = hohmannYears(1, JUPITER_AU)
  const sunlightFactor = JUPITER_AU ** 2
  const wPerM2AtJupiter = arrayWattsPerM2(JUPITER_AU) * LILT

  const on = (Object.keys(INSTRUMENTS) as InstrumentId[]).filter((k) => d[k])
  const loadW = 300 * p.busPower + on.reduce((s, k) => s + INSTRUMENTS[k].w, 0) // bus: avionics, heaters, radio
  const powerNeededW = loadW * 1.1 // 10% margin
  const powerW = d.power === 'solar' ? d.arrayM2 * wPerM2AtJupiter : d.rtgs * RTG.bolW * (1 - RTG.decayPerYear) ** (yearsToJupiter + 1)

  const orbitDays = d.orbit === 'polar53' ? 53 : d.orbit === 'polar14' ? 14 : 3
  const txW = TX_W * p.txPower
  const kbps = downlinkKbps(d.hga, JUPITER_AU, txW)
  const gbPerPass = on.reduce((s, k) => s + INSTRUMENTS[k].gbPerPass, 0)
  const gbDownPerOrbit = (kbps * 1000 * 8 * 3600 * orbitDays) / 8 / 1e9 // 8 h of Deep Space Network time a day
  const dataReturn = gbPerPass === 0 ? 1 : Math.min(1, gbDownPerOrbit / gbPerPass)
  const survivable = passesSurvivable(d)

  const baseDry =
    750 + // bus: structure, avionics, propulsion hardware, tanks
    on.reduce((s, k) => s + INSTRUMENTS[k].kg, 0) * p.instrumentMass +
    (d.power === 'solar' ? d.arrayM2 * 4.8 : d.rtgs * RTG.kg) +
    d.vaultCm * VAULT_KG_PER_CM +
    HGA[d.hga].kg * p.antenna
  const dryKg = baseDry * 1.25 * p.dryMass // concept-stage contingency
  // Δv: deep-space maneuvers (flyby only), Jupiter orbit insertion, period reduction (14-day), trims
  const deltaV = Math.round(((d.trajectory === 'flyby' ? 720 : 0) + 545 + (d.orbit === 'polar14' ? 400 : d.orbit === 'equatorial' ? 900 : 0) + 200) * p.deltaV)
  const propKg = propellantKg(dryKg, deltaV, ISP_EFFECTIVE)
  const wetKg = dryKg + propKg
  const rocket = ROCKETS[d.rocket]
  const capKg = rocket.capKg[d.trajectory]

  const passYears = (MISSION.requiredPasses * orbitDays) / 365
  const costM =
    350 +
    on.reduce((s, k) => s + INSTRUMENTS[k].costM, 0) * p.instrumentCost +
    (d.power === 'solar' ? d.arrayM2 * 1.2 : d.rtgs * RTG.costM) +
    d.vaultCm * 40 +
    HGA[d.hga].costM * p.antenna +
    (yearsToJupiter * 15 + passYears * 35) * p.opsCost + // cruise and science operations
    rocket.costM * p.launchCost

  const checks: Check[] = [
    { id: 'mwr', label: 'Can measure water deep in the clouds', short: 'Deep water', tech: { label: 'Microwave radiometer (deep atmospheric water)', detail: d.mwr ? 'on board' : 'missing' }, ok: d.mwr, detail: d.mwr ? 'microwave radiometer on board' : 'needs the microwave radiometer' },
    { id: 'gravity', label: 'Can weigh what Jupiter is made of inside', short: 'Gravity', tech: { label: 'Gravity science (interior structure, core)', detail: d.gravity ? 'on board' : 'missing' }, ok: d.gravity, detail: d.gravity ? 'gravity science on board' : 'needs gravity science' },
    { id: 'mag', label: 'Can map the magnetic field', short: 'Magnets', tech: { label: 'Magnetometer (dynamo region)', detail: d.mag ? 'on board' : 'missing' }, ok: d.mag, detail: d.mag ? 'magnetometer on board' : 'needs the magnetometer' },
    {
      id: 'passes',
      label: `Survives ${MISSION.requiredPasses} close passes through the radiation`,
      short: 'Radiation',
      tech: { label: `Total dose margin for ≥ ${MISSION.requiredPasses} perijove passes`, detail: `electronics rated for ${survivable} passes in this orbit` },
      ok: survivable >= MISSION.requiredPasses,
      detail: `your electronics last ${survivable} passes`,
    },
    { id: 'data', label: 'Almost all the data gets home', short: 'Data home', tech: { label: 'Downlink ≥ 90% of each perijove data set', detail: `${(dataReturn * 100).toFixed(0)}%` }, ok: dataReturn >= 0.9, detail: `${(dataReturn * 100).toFixed(0)}% gets home` },
    {
      id: 'power',
      label: 'Enough power at Jupiter',
      short: 'Power',
      tech: { label: 'Power at 5.2 AU ≥ load + 10% margin', detail: `${powerW.toFixed(0)} / ${powerNeededW.toFixed(0)} W` },
      ok: powerW >= powerNeededW,
      detail: `${powerW.toFixed(0)} of ${powerNeededW.toFixed(0)} watts needed`,
      hiddenUntilFlight: d.power === 'solar',
    },
    { id: 'rocket', label: `Light enough for ${rocket.name} on this path`, short: 'Rocket', tech: { label: `Wet mass within ${rocket.name} capacity at C3 = ${C3[d.trajectory]} km²/s²`, detail: `${wetKg.toFixed(0)} / ${capKg} kg` }, ok: wetKg <= capKg, detail: `${wetKg.toFixed(0)} of ${capKg.toLocaleString('en-US')} kg` },
    { id: 'budget', label: `Costs less than $${MISSION.budgetM.toLocaleString('en-US')} million`, short: 'Budget', tech: { label: 'Life-cycle cost within the cost cap', detail: `${costM.toFixed(0)} / ${MISSION.budgetM} $M` }, ok: costM <= MISSION.budgetM, detail: `$${costM.toFixed(0)} million` },
  ]

  return {
    perks: p,
    txW,
    loadW,
    powerW,
    powerNeededW,
    wPerM2AtJupiter,
    sunlightFactor,
    lightMin: lightTimeS(JUPITER_AU * AU_KM) / 60,
    cruiseYears: yearsToJupiter,
    hohmann,
    kbps,
    gbPerPass,
    gbDownPerOrbit,
    dataReturn,
    orbitDays,
    survivable,
    dryKg,
    propKg,
    wetKg,
    capKg,
    deltaV,
    costM,
    checks,
    bars: [
      { label: 'Mass on the rocket', value: wetKg, max: capKg, unit: 'kg', detail: `${dryKg.toFixed(0)} dry (incl. 25% margin) + ${propKg.toFixed(0)} propellant for ${deltaV} m/s` },
      { label: 'Cost', value: costM, max: MISSION.budgetM, unit: '$M', detail: `incl. ${yearsToJupiter} years of cruise and ${passYears.toFixed(1)} years of science operations` },
      {
        label: 'Data sent home',
        value: Math.min(gbDownPerOrbit, gbPerPass * 1.5),
        max: gbPerPass || 1,
        unit: 'GB/orbit',
        detail: `${kbps.toFixed(0)} kbps from Jupiter · collecting ${gbPerPass.toFixed(1)} GB per pass`,
        invert: true,
      },
    ],
  }
}

export const STARTER: Design = {
  power: 'solar',
  arrayM2: 20,
  rtgs: 2,
  trajectory: 'direct',
  orbit: 'equatorial',
  vaultCm: 0,
  hga: 1.5,
  mag: true,
  mwr: false,
  gravity: false,
  particles: true,
  cam: true,
  rocket: 'atlas551',
}

export const NASA_DESIGN: Design = {
  power: 'solar',
  arrayM2: 60,
  rtgs: 1,
  trajectory: 'flyby',
  orbit: 'polar14',
  vaultCm: 1,
  hga: 2.5,
  mag: true,
  mwr: true,
  gravity: true,
  particles: true,
  cam: true,
  rocket: 'atlas551',
}

export const NASA_FACTS = [
  'Solar power at Jupiter: three wings, about 60 m² and 18,698 cells, giving roughly 14 kW near Earth and about 500 W at Jupiter',
  'The first solar-powered spacecraft to reach Jupiter. Earlier Jupiter missions (Galileo, Cassini’s flyby) used nuclear RTGs',
  'Launched 5 Aug 2011 on an Atlas V 551 weighing 3,625 kg; an Earth flyby on 9 Oct 2013 gave it the speed to reach Jupiter',
  'Electronics live inside a titanium vault with walls about 1 cm thick, weighing about 172 kg',
  'A polar orbit dives under the worst radiation belts. NASA planned a 14-day orbit, but a sticky valve in Oct 2016 made them stay in the 53-day orbit',
  'JunoCam was included for the public: amateur image processors around the world turn its raw images into the pictures you’ve seen',
]
