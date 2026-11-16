import { paretoFrontier } from '../../game/medal'
import type { Frontier, FrontierPoint, Mission } from '../../game/types'
import { ROCKET_LOOKS, UranusControls } from './Controls'
import { UranusCraft } from './Craft'
import { fly } from './flight'
import { URANUS_METRICS } from './metrics'
import { CONCEPT_FACTS, evaluate, INSTRUMENTS, LAUNCH_YEARS, MISSION, ROCKETS, STARTER, type Design, type InstrumentId, type Result } from './model'
import { UranusViz } from './Viz'

function describe(d: Design) {
  const inst = (Object.keys(INSTRUMENTS) as InstrumentId[]).filter((k) => d[k]).map((k) => INSTRUMENTS[k].name.split(' ')[0].toLowerCase())
  return `${d.launchYear} · ${d.assist === 'jupiter' ? 'Jupiter assist' : 'no assist'} · ${d.power === 'rtg' ? `${d.rtgs} RTGs` : `${d.arrayM2} m² solar`} · ${d.probe ? 'probe + ' : ''}${inst.join(', ') || 'no instruments'} · ${d.capture} · ${d.tourYears}-yr tour · ${d.hga} m dish · ${ROCKETS[d.rocket].name}`
}

let cache: Frontier<Design> | null = null
function searchFrontier(): Frontier<Design> {
  if (cache) return cache
  const feasible: FrontierPoint<Design>[] = []
  let searched = 0
  const b = [false, true]
  for (const launchYear of LAUNCH_YEARS)
    for (const assist of ['jupiter', 'none'] as const)
      for (const rocket of Object.keys(ROCKETS) as Design['rocket'][])
        for (const rtgs of [2, 3, 4] as const)
          for (const probe of b)
            for (const capture of ['propulsive', 'aerocapture'] as const)
              for (const tourYears of [2, 4, 6] as const)
                for (const hga of [2.5, 4] as const)
                  for (const cam of b)
                    for (const irs of b) {
                      searched++
                      const d: Design = { launchYear, assist, rocket, power: 'rtg', rtgs, arrayM2: 0, probe, capture, tourYears, hga, cam, mag: true, irs, dust: true }
                      const r = evaluate(d)
                      if (!r.checks.every((c) => c.ok)) continue
                      const f = fly(d, r)
                      if (f.lost) continue
                      feasible.push({ design: d, cost: r.costM, science: f.finalScience })
                    }
  cache = paretoFrontier(feasible, searched)
  return cache
}

export const uranusMission: Mission<Design, Result> = {
  id: 'uranus',
  kicker: 'Design the future · 2030s',
  name: 'Uranus Orbiter & Probe',
  year: '2030s',
  objective: MISSION.objective,
  teaser: 'The top-priority flagship from NASA’s planetary Decadal Survey. Pick your launch year from real planet positions. Nobody knows the right answer yet.',
  tags: ['Open-ended', 'Launch windows', 'Nuclear power'],
  budgetM: MISSION.budgetM,
  launchDate: '2031-06-15',
  launchDateOf: (d) => `${d.launchYear}-06-15`,
  starter: STARTER,
  evaluate,
  fly,
  metrics: URANUS_METRICS,
  quizIds: ['sunlight', 'lightTime', 'cruise', 'rtgPower', 'dataRate'],
  pitch: 'Plan a trip of 13 years or more to Uranus. NASA has not flown this one yet.',
  place: 'uranus',
  briefing: {
    where: 'Uranus, 19.2 times farther from the Sun than Earth',
    why: 'Only one spacecraft has ever been there: Voyager 2 flew past in 1986 and kept going. Uranus and Neptune are the only planets that have never had an orbiter.',
    hard: [
      {
        title: 'The launch window',
        plain: 'A slingshot past Jupiter only works in the years when the planets line up. The planet positions in this game are the real ones.',
        tech: 'Jupiter gravity-assist geometry from JPL Horizons ephemerides. Injected mass depends on the launch year.',
      },
      {
        title: 'A deadline in the sky',
        plain: 'Arrive before 2049 and the sides of the moons that nobody has ever seen are in sunlight. Arrive later and they are dark for decades.',
        tech: 'Arrival before the 2049 equinox keeps the moons’ northern hemispheres sunlit.',
      },
      {
        title: 'Power that fades',
        plain: 'The trip takes well over a decade. Whatever powers the spacecraft must still be working at the very end.',
        tech: 'Power is sized for end of mission, after the cruise and the tour.',
      },
      {
        title: 'No answer key',
        plain: 'NASA has not built this mission yet. There is no design to copy, only yours.',
        tech: 'A concept study exists, but no flown design. You are compared with every design that closes.',
      },
    ],
  },
  steps: [
    {
      id: 'when',
      role: 'director',
      title: 'Launch',
      brief: 'Which year to launch, and whether Jupiter helps.',
      techSay: (d, r) => `Jupiter gravity-assist geometry in ${d.launchYear}: ${(r.alignment * 100).toFixed(0)}%. Cruise ${r.cruiseYears.toFixed(1)} years, arrival ${r.arrivalYear.toFixed(1)}.`,
      say: (d, r) =>
        d.assist === 'jupiter' && r.alignment === 0
          ? `In ${d.launchYear} Jupiter is in the wrong place to help. Pick a year with a tall bar.`
          : 'Planets keep moving. In some years Jupiter sits just right to fling you toward Uranus. Pick your year.',
      guesses: ['cruise'],
    },
    {
      id: 'power',
      role: 'systems',
      title: 'Power',
      brief: 'Nuclear batteries or solar wings, and how many.',
      techSay: (d) => (d.power === 'solar' ? 'Solar flux at 19.2 AU is 1/369 of the flux at Earth. Size the array yourself; the requirement is verified in flight.' : 'RTG output decays about 2% a year, and the tour ends 15 to 20 years after launch. Size for end of mission.'),
      say: (d) => (d.power === 'solar' ? 'Solar wings, this far from the Sun? Guess how big they would have to be.' : 'Nuclear batteries work in the dark, but they fade every year. Will there be enough at the end?'),
      guesses: ['sunlight', 'rtgPower'],
    },
    {
      id: 'tools',
      role: 'science',
      title: 'Tools',
      brief: 'Which instruments, and whether to bring a probe.',
      techSay: () => 'The probe is the only source of noble-gas abundances. Every instrument adds mass, power and data volume.',
      say: (d) => (d.probe ? 'A probe is heavy, but it is the only way to taste what Uranus is made of.' : 'No probe? Then nobody finds out what Uranus is made of deep down.'),
    },
    {
      id: 'arrival',
      role: 'comms',
      title: 'Arrival',
      brief: 'How to brake, how long to stay, how big a dish.',
      techSay: () => 'Propulsive capture costs about 1,650 m/s. Aerocapture saves propellant, adds an aeroshell and carries first-flight risk.',
      say: () => 'You arrive going very fast. Brake with the engine, or dare to skim the atmosphere?',
      guesses: ['lightTime', 'dataRate'],
    },
    {
      id: 'rocket',
      role: 'director',
      title: 'Rocket',
      brief: 'The smallest rocket that can still lift it.',
      techSay: (_, r) => `Wet mass ${r.wetKg.toFixed(0)} kg against ${r.capKg.toLocaleString('en-US')} kg for this window and trajectory.`,
      say: (_, r) =>
        r.wetKg > r.capKg ? `Too heavy! This year the rocket can send ${r.capKg.toLocaleString('en-US')} kg to Uranus. Pick a bigger rocket, a better year, or take something off.` : 'You fit. Could a cheaper rocket still carry you?',
    },
  ],
  Craft: UranusCraft,
  readout: (_, r) => [
    ['Load', `${r.loadW.toFixed(0)} W`],
    ['Launch capacity', `${r.capKg.toLocaleString('en-US')} kg`],
    ['Dry mass', `${r.dryKg.toFixed(0)} kg`],
    ['Propellant', `${r.propKg.toFixed(0)} kg`],
    ['Aeroshell', `${r.aeroshellKg.toFixed(0)} kg`],
    ['Total Δv', `${r.deltaV} m/s`],
    ['Cruise', `${r.cruiseYears.toFixed(1)} yr`],
    ['Data collected', `${r.gbPerYear.toFixed(1)} GB/yr`],
  ],
  rocketLook: (d) => ROCKET_LOOKS[d.rocket],
  Controls: UranusControls,
  Viz: UranusViz,
  describe,
  concept: {
    label: 'NASA’s Uranus Orbiter & Probe concept (what the experts proposed)',
    facts: CONCEPT_FACTS,
    source: 'NASA Uranus Orbiter and Probe mission concept study (2021) and the 2022 Planetary Science and Astrobiology Decadal Survey; later NASA studies on launch timing.',
  },
  frontier: searchFrontier,
  lessons: (d, r) => {
    const out = []
    if (d.power === 'solar') out.push({ title: 'Solar stops working out here', body: `At 19 AU you would need about ${(r.powerNeededW / r.solarWPerM2).toFixed(0)} m² of panels. Every spacecraft to visit the outer planets beyond Jupiter (Pioneer, Voyager, Cassini, New Horizons) ran on RTGs.` })
    if (r.alignment === 0) out.push({ title: 'Launch windows', body: 'Planets move. A Jupiter slingshot toward Uranus only works when Jupiter sits in the right spot, which happens for a couple of years roughly every 13 years. That is why scientists pushed so hard for a 2031–32 launch.' })
    if (!d.probe) out.push({ title: 'Why a probe?', body: 'Orbiters can’t measure helium and the noble gases (neon, argon, xenon) deep in the atmosphere. Those ratios are fingerprints of where and how Uranus formed, so the Decadal Survey asked for a probe.' })
    return out
  },
  scoreScale: 'probe plus all four instruments on a 4-year tour',
  dataNote: 'Planet positions from JPL Horizons; events from physics and Voyager 2’s 1986 flyby',
}
