// The crew: four department heads you hire for each mission. Every candidate brings one edge.
// Edges change engineering and programme numbers (a price, a mass, a margin). They never change
// the physics: sunlight still falls with distance squared, whoever you hire.
import { createContext, useContext } from 'react'
import type { Level } from './level'
import type { AnyMission, BarSpec, Flight } from './types'

export type Role = 'director' | 'systems' | 'science' | 'comms'

export const ROLE_ORDER: Role[] = ['director', 'systems', 'science', 'comms']

export const DEPARTMENTS: Record<Role, { title: string; owns: string; wants: string; color: string }> = {
  director: { title: 'Mission Director', owns: 'the orbit, the path and the rocket', wants: 'money left in the budget', color: 'oklch(0.87 0.17 92)' },
  systems: { title: 'Head of Engineering', owns: 'power and survival', wants: 'mass to spare on the rocket', color: 'oklch(0.8 0.15 150)' },
  science: { title: 'Chief Scientist', owns: 'the instruments', wants: 'the highest science score', color: 'oklch(0.8 0.11 300)' },
  comms: { title: 'Head of Comms', owns: 'the radio and the data', wants: 'every bit of data home', color: 'oklch(0.8 0.13 40)' },
}

/** Every number a crew member can move. 1 (or false) means no change. */
export interface Perks {
  /** × launch price. */
  launchCost: number
  /** × total Δv. */
  deltaV: number
  /** × operations cost: flight team, ground stations, antenna time. */
  opsCost: number
  /** × dry mass. */
  dryMass: number
  /** × electrical load of the spacecraft bus (not the instruments). */
  busPower: number
  /** × size of every part the player sizes by estimate. Applied when the estimate is locked in. */
  reserve: number
  /** × instrument cost. */
  instrumentCost: number
  /** × instrument mass. */
  instrumentMass: number
  /** × science score. */
  science: number
  /** × radio transmitter output, and so × data rate. */
  txPower: number
  /** × mass and cost of dishes and radios. */
  antenna: number
  /** Tell the player which power of ten each estimate is in. */
  ballpark: boolean
}

export const NO_PERKS: Perks = {
  launchCost: 1,
  deltaV: 1,
  opsCost: 1,
  dryMass: 1,
  busPower: 1,
  reserve: 1,
  instrumentCost: 1,
  instrumentMass: 1,
  science: 1,
  txPower: 1,
  antenna: 1,
  ballpark: false,
}

/** What the debrief measures to show what an edge was worth on this flight. */
export type Measure = 'cost' | 'mass' | 'hardware' | 'power' | 'science' | 'data' | 'sizing' | 'estimates'

export interface Look {
  skin: string
  hair: string
  style: 'short' | 'swoop' | 'bun' | 'long' | 'bob' | 'curly' | 'bald' | 'wrap'
  glasses?: boolean
  beard?: boolean
  headset?: boolean
}

export interface CrewMember {
  id: string
  role: Role
  name: string
  /** Their specialty, in two or three words. */
  field: string
  bio: string
  edge: {
    /** A few characters for a chip: "Launch −20%". */
    short: string
    plain: string
    tech: string
    perks: Partial<Perks>
    measure: Measure
  }
  look: Look
}

const SKIN = { light: 'oklch(0.9 0.045 62)', tan: 'oklch(0.81 0.07 68)', olive: 'oklch(0.73 0.08 72)', brown: 'oklch(0.62 0.09 55)', deep: 'oklch(0.52 0.08 48)' }
const HAIR = { black: 'oklch(0.27 0.03 270)', brown: 'oklch(0.42 0.07 50)', auburn: 'oklch(0.56 0.15 42)', blond: 'oklch(0.86 0.11 92)', grey: 'oklch(0.82 0.012 260)', cloth: 'oklch(0.62 0.13 250)' }

export const ROSTER: CrewMember[] = [
  {
    id: 'amara',
    role: 'director',
    name: 'Amara Okafor',
    field: 'Launch contracts',
    bio: 'Fifteen years of buying rockets. Knows what every launch company really charges.',
    edge: { short: 'Rocket −20%', plain: 'Gets 20% off any rocket.', tech: 'Launch service price −20%.', perks: { launchCost: 0.8 }, measure: 'cost' },
    look: { skin: SKIN.deep, hair: HAIR.black, style: 'curly' },
  },
  {
    id: 'kenji',
    role: 'director',
    name: 'Kenji Mori',
    field: 'Trajectory design',
    bio: 'A former flight dynamics officer who plans every engine burn to the metre per second.',
    edge: {
      short: 'Delta-v −10%',
      plain: 'Finds a gentler path. Every engine burn is 10% smaller, so you carry less fuel.',
      tech: 'Total Δv −10%. Propellant follows from the rocket equation.',
      perks: { deltaV: 0.9 },
      measure: 'mass',
    },
    look: { skin: SKIN.tan, hair: HAIR.black, style: 'short', glasses: true },
  },
  {
    id: 'ingrid',
    role: 'director',
    name: 'Ingrid Solberg',
    field: 'Flight operations',
    bio: 'Has flown three missions with half the usual flight team.',
    edge: {
      short: 'Operations −25%',
      plain: 'Flying the mission costs 25% less, year after year.',
      tech: 'Operations cost −25%: flight team, ground stations, antenna time.',
      perks: { opsCost: 0.75 },
      measure: 'cost',
    },
    look: { skin: SKIN.light, hair: HAIR.blond, style: 'bun' },
  },
  {
    id: 'rafael',
    role: 'systems',
    name: 'Rafael Souza',
    field: 'Structures',
    bio: 'Builds spacecraft frames out of carbon fibre and printed titanium.',
    edge: { short: 'Dry mass −10%', plain: 'Your spacecraft weighs 10% less before fuel.', tech: 'Dry mass −10%.', perks: { dryMass: 0.9 }, measure: 'mass' },
    look: { skin: SKIN.tan, hair: HAIR.brown, style: 'swoop', beard: true },
  },
  {
    id: 'priya',
    role: 'systems',
    name: 'Priya Nair',
    field: 'Power electronics',
    bio: 'Designs flight computers and heaters that sip power.',
    edge: {
      short: 'Bus power −20%',
      plain: 'The spacecraft itself uses 20% less electricity, so its power supply can be smaller.',
      tech: 'Bus load −20% (avionics, heaters). Instrument loads unchanged.',
      perks: { busPower: 0.8 },
      measure: 'power',
    },
    look: { skin: SKIN.brown, hair: HAIR.black, style: 'long' },
  },
  {
    id: 'leila',
    role: 'systems',
    name: 'Leila Haddad',
    field: 'Design margins',
    bio: 'Has watched a mission die for want of one spare watt. Never again.',
    edge: {
      short: 'Sized parts +15%',
      plain: 'Builds every part you size 15% bigger than you asked, just in case. Bigger parts weigh and cost a little more.',
      tech: '+15% margin on every part sized by your estimate (arrays, batteries). Its mass and cost are included.',
      perks: { reserve: 1.15 },
      measure: 'sizing',
    },
    look: { skin: SKIN.olive, hair: HAIR.cloth, style: 'wrap' },
  },
  {
    id: 'mei',
    role: 'science',
    name: 'Mei Chen',
    field: 'Instrument building',
    bio: 'Reuses designs that have already flown. No surprises, no overruns.',
    edge: { short: 'Instruments −20% cost', plain: 'Science instruments cost 20% less.', tech: 'Instrument cost −20%.', perks: { instrumentCost: 0.8 }, measure: 'cost' },
    look: { skin: SKIN.light, hair: HAIR.black, style: 'bob', glasses: true },
  },
  {
    id: 'oskar',
    role: 'science',
    name: 'Oskar Lind',
    field: 'Miniaturisation',
    bio: 'Shrinks an instrument until it fits in a shoebox, then shrinks it again.',
    edge: { short: 'Instruments −25% mass', plain: 'Science instruments weigh 25% less.', tech: 'Instrument mass −25%.', perks: { instrumentMass: 0.75 }, measure: 'mass' },
    look: { skin: SKIN.light, hair: HAIR.grey, style: 'bald', beard: true },
  },
  {
    id: 'nia',
    role: 'science',
    name: 'Nia Thompson',
    field: 'Observation planning',
    bio: 'Plans every orbit so that no pass over the target is wasted.',
    edge: { short: 'Science +8%', plain: 'Gets 8% more science out of the same spacecraft.', tech: 'Science score +8%.', perks: { science: 1.08 }, measure: 'science' },
    look: { skin: SKIN.deep, hair: HAIR.black, style: 'bun' },
  },
  {
    id: 'diego',
    role: 'comms',
    name: 'Diego Fuentes',
    field: 'Radio engineering',
    bio: 'Builds radio amplifiers that waste almost nothing as heat.',
    edge: {
      short: 'Data rate ×1.6',
      plain: 'A stronger radio. Data flows home 1.6 times faster.',
      tech: 'Transmitter output ×1.6 (+2 dB) for the same input power, so data rate ×1.6.',
      perks: { txPower: 1.6 },
      measure: 'data',
    },
    look: { skin: SKIN.olive, hair: HAIR.black, style: 'short', beard: true, headset: true },
  },
  {
    id: 'aroha',
    role: 'comms',
    name: 'Aroha Ngata',
    field: 'Antenna design',
    bio: 'Folds enormous mesh dishes into something the size of a suitcase.',
    edge: {
      short: 'Dishes and radios −50%',
      plain: 'Every dish and radio on board weighs half as much and costs half as much.',
      tech: 'Antenna and radio hardware: mass and cost −50%.',
      perks: { antenna: 0.5 },
      measure: 'hardware',
    },
    look: { skin: SKIN.brown, hair: HAIR.brown, style: 'long', headset: true },
  },
  {
    id: 'sam',
    role: 'comms',
    name: 'Sam Rivera',
    field: 'Capcom',
    bio: 'The calm voice on the loop, with a feel for the size of everything.',
    edge: {
      short: 'Ballpark on guesses',
      plain: 'Before every guess, tells you which power of ten the answer is in.',
      tech: 'Gives the decade of every estimate before you commit.',
      perks: { ballpark: true },
      measure: 'estimates',
    },
    look: { skin: SKIN.light, hair: HAIR.auburn, style: 'swoop', headset: true },
  },
]

export const candidates = (role: Role) => ROSTER.filter((m) => m.role === role)

/** Who holds each seat, by crew member id. Chosen per mission. */
export type Hires = Partial<Record<Role, string>>

export function hired(hires: Hires): CrewMember[] {
  return ROLE_ORDER.map((r) => ROSTER.find((m) => m.role === r && m.id === hires[r])).filter((m): m is CrewMember => Boolean(m))
}

export const fullCrew = (hires: Hires) => hired(hires).length === ROLE_ORDER.length

export function perksOf(hires: Hires): Perks {
  return Object.assign({}, NO_PERKS, ...hired(hires).map((m) => m.edge.perks)) as Perks
}

/** An edge that helps with guesses does nothing for engineers, who estimate with no help at all. */
export const edgeWorks = (m: CrewMember, level: Level) => !(m.edge.perks.ballpark && level === 'engineer')

/** Fill the empty seats at random, for players who would rather get building. Never picks an edge that is off at this level. */
export function fillSeats(hires: Hires, level?: Level): Hires {
  const out = { ...hires }
  for (const r of ROLE_ORDER) {
    if (hired(out).some((m) => m.role === r)) continue
    const pool = candidates(r).filter((m) => !level || edgeWorks(m, level))
    out[r] = pool[Math.floor(Math.random() * pool.length)].id
  }
  return out
}

/** The size a part is built at, from the size the player estimated. */
export function builtSize(estimate: number, perks: Perks): number {
  if (perks.reserve === 1) return estimate
  const v = estimate * perks.reserve
  return v < 10 ? Math.round(v * 10) / 10 : Math.round(v)
}

/** The same mission, flown by this crew. `bare` keeps the mission as NASA flew it, with no edges. */
export function withCrew(mission: AnyMission, perks: Perks): AnyMission {
  return { ...mission, bare: mission, evaluate: (d: unknown) => mission.evaluate(d, perks) }
}

const KEY = 'trade-space-hires'

export function loadHires(): Record<string, Hires> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Hires>
    const out: Record<string, Hires> = {}
    for (const [missionId, h] of Object.entries(all)) out[missionId] = Object.fromEntries(hired(h ?? {}).map((m) => [m.role, m.id]))
    return out
  } catch {
    // storage blocked or unreadable
    return {}
  }
}

export function saveHires(all: Record<string, Hires>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // storage blocked: the crew lasts for this visit
  }
}

export const CrewContext = createContext<Hires>({})

export function useCrew() {
  const hires = useContext(CrewContext)
  const crew = hired(hires)
  return { hires, crew, perks: perksOf(hires), head: (role: Role): CrewMember | undefined => crew.find((m) => m.role === role) }
}

/**
 * How each department did on its own goal, from numbers every mission already reports:
 * the mass, cost and data gauges (in that order) and the flight's science score.
 */
export function roleResult(role: Role, bars: BarSpec[], flight: Flight): { value: string; good: boolean; line: string } {
  const [mass, cost, data] = bars
  if (role === 'director') {
    const left = cost.max - cost.value
    return {
      value: `${left >= 0 ? '' : '−'}$${Math.abs(left).toFixed(0)}M`,
      good: left >= 0 && !flight.lost,
      line: left < 0 ? 'over budget' : flight.lost ? 'left in the budget, but the mission was lost' : `left in the budget (${Math.round((left / cost.max) * 100)}%)`,
    }
  }
  if (role === 'systems') {
    const spare = mass.max - mass.value
    return {
      value: `${spare >= 0 ? '' : '−'}${Math.abs(spare).toFixed(0)} kg`,
      good: spare >= 0 && !flight.lost,
      line: spare < 0 ? 'too heavy for the rocket' : flight.lost ? 'to spare, but the spacecraft did not survive' : `to spare on the rocket (${Math.round((spare / mass.max) * 100)}%)`,
    }
  }
  if (role === 'science') return { value: String(flight.finalScience), good: flight.finalScience >= 100, line: flight.finalScience >= 100 ? 'science score: goals met or beaten' : 'science score (100 meets the goals)' }
  const pct = dataPercent(data)
  return { value: `${pct}%`, good: pct >= 95, line: 'of the data reached Earth' }
}

export const dataPercent = (data: BarSpec) => (data.max > 0 ? Math.min(100, Math.round((data.value / data.max) * 100)) : 0)
