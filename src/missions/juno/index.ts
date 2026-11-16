import { paretoFrontier } from '../../game/medal'
import type { Frontier, FrontierPoint, Mission } from '../../game/types'
import { JunoControls, ROCKET_LOOKS } from './Controls'
import { JunoCraft } from './Craft'
import { fly } from './flight'
import { JUNO_METRICS } from './metrics'
import { C3, evaluate, INSTRUMENTS, MISSION, NASA_DESIGN, NASA_FACTS, ROCKETS, STARTER, type Design, type InstrumentId, type Result } from './model'
import { JunoViz } from './Viz'

const orbitName = { polar53: 'polar 53-day', polar14: 'polar 14-day', equatorial: 'equatorial 3-day' }

function describe(d: Design) {
  const inst = (Object.keys(INSTRUMENTS) as InstrumentId[]).filter((k) => d[k]).map((k) => INSTRUMENTS[k].name.split(' ')[0].toLowerCase())
  return `${d.power === 'solar' ? `${d.arrayM2} m² solar` : `${d.rtgs} RTG`} · ${d.trajectory === 'flyby' ? 'Earth flyby' : 'direct'} · ${orbitName[d.orbit]} · ${d.vaultCm} cm vault · ${d.hga} m dish · ${inst.join(', ')} · ${ROCKETS[d.rocket].name}`
}

let cache: Frontier<Design> | null = null
function searchFrontier(): Frontier<Design> {
  if (cache) return cache
  const feasible: FrontierPoint<Design>[] = []
  let searched = 0
  const bools = [false, true]
  for (const power of ['solar', 'rtg'] as const)
    for (const rtgs of power === 'rtg' ? ([1, 2, 3, 4] as const) : ([1] as const))
      for (const trajectory of ['direct', 'flyby'] as const)
        for (const orbit of ['polar53', 'polar14', 'equatorial'] as const)
          for (const vaultCm of [0, 1, 2] as const)
            for (const hga of [1.5, 2.5, 4] as const)
              for (const particles of bools)
                for (const cam of bools)
                  for (const rocket of Object.keys(ROCKETS) as Design['rocket'][]) {
                    searched++
                    let d: Design = { power, rtgs, arrayM2: 1, trajectory, orbit, vaultCm, hga, mag: true, mwr: true, gravity: true, particles, cam, rocket }
                    if (power === 'solar') {
                      const r0 = evaluate(d)
                      d = { ...d, arrayM2: Math.ceil(((r0.powerNeededW * 1.05) / r0.wPerM2AtJupiter) / 2) * 2 }
                    }
                    const r = evaluate(d)
                    if (!r.checks.every((c) => c.ok)) continue
                    const f = fly(d, r)
                    if (f.lost) continue
                    feasible.push({ design: d, cost: r.costM, science: f.finalScience })
                  }
  cache = paretoFrontier(feasible, searched)
  return cache
}

export const junoMission: Mission<Design, Result> = {
  id: 'juno',
  kicker: 'Replay history · 2011',
  name: 'Juno',
  year: '2011',
  objective: MISSION.objective,
  teaser: 'Fly to Jupiter on solar power, where sunlight is 27 times weaker. NASA did it. Can you?',
  tags: ['Deep space', 'Inverse-square law', 'Radiation'],
  budgetM: MISSION.budgetM,
  launchDate: MISSION.launchDate,
  starter: STARTER,
  evaluate,
  fly,
  metrics: JUNO_METRICS,
  quizIds: ['sunlight', 'lightTime', 'cruise', 'dataRate', 'propellant'],
  pitch: 'Fly to Jupiter, where sunlight is 27 times weaker and radiation fries electronics.',
  place: 'jupiter',
  briefing: {
    where: 'Jupiter, 5.2 times farther from the Sun than Earth',
    why: 'Jupiter is the giant of the solar system and probably its oldest planet. What it is made of deep down is a record of how the planets formed.',
    hard: [
      {
        title: 'Dim sunlight',
        plain: 'Sunlight at Jupiter is a small fraction of what Earth gets. Solar wings must be enormous, and you decide how enormous. Or you go nuclear.',
        tech: 'Solar flux falls as 1/r², with further low-intensity, low-temperature losses. The array is sized by your estimate; RTGs are the alternative.',
      },
      {
        title: 'Radiation',
        plain: 'Jupiter is wrapped in belts of radiation that destroy electronics. Your orbit and your armour decide how many close passes you survive. You need 30.',
        tech: 'Dose per perijove depends on the orbit, and the vault sets the rating. Requirement: 30 perijoves.',
      },
      {
        title: 'The long way round',
        plain: 'Flying straight to Jupiter needs a very powerful rocket. Swinging past Earth first takes longer and asks far less.',
        tech: 'Direct transfer against an Earth gravity assist: launch energy traded for cruise time and deep-space Δv.',
      },
      {
        title: 'A faint voice',
        plain: 'Every picture and measurement crosses hundreds of millions of kilometres by radio. A bigger dish sends more, and weighs more.',
        tech: 'X-band link to a 34 m DSN antenna. Rate scales with D² and falls with distance².',
      },
    ],
  },
  steps: [
    {
      id: 'path',
      role: 'director',
      title: 'Path',
      brief: 'Straight and fast, or a slower swing past Earth.',
      techSay: (d) => `C3 = ${C3[d.trajectory]} km²/s² sets the injected mass. The Earth gravity assist trades about 2.5 years of cruise for less than half the launch energy.`,
      say: () => 'Go straight and fast, or loop back past Earth for a free push? The straight way needs a much stronger rocket.',
      guesses: ['cruise', 'propellant'],
    },
    {
      id: 'orbit',
      role: 'systems',
      title: 'Orbit',
      brief: 'Which orbit, and how much armour against radiation.',
      techSay: (_, r) => `Total-dose rating in this orbit: ${r.survivable} perijoves against a requirement of ${MISSION.requiredPasses}.`,
      say: (_, r) =>
        r.survivable >= 30
          ? `Jupiter is wrapped in deadly radiation. Your electronics will last ${r.survivable} close passes. You need 30, so you are safe.`
          : `Jupiter is wrapped in deadly radiation. Your electronics will last only ${r.survivable} close passes, and you need 30. Change the orbit or add armour.`,
    },
    {
      id: 'power',
      role: 'systems',
      title: 'Power',
      brief: 'Solar wings or nuclear batteries, and how many.',
      techSay: () => 'Solar flux falls as 1/r², and cells lose more in low-intensity, low-temperature light. Size the array for Jupiter, not for Earth.',
      say: () => 'Out here the Sun is tiny. Solar wings must be enormous, and you decide how enormous.',
      guesses: ['sunlight'],
    },
    {
      id: 'tools',
      role: 'science',
      title: 'Tools',
      brief: 'Which instruments make the trip.',
      techSay: () => 'Level-1 science needs the microwave radiometer, gravity science and the magnetometer. Everything else is enhancing payload.',
      say: () => 'To learn how Jupiter formed you need three things: deep water, gravity and magnets. Everything else is a bonus.',
    },
    {
      id: 'radio',
      role: 'comms',
      title: 'Radio',
      brief: 'How big a dish talks to Earth.',
      techSay: (_, r) => `Data return ${(r.dataReturn * 100).toFixed(0)}% per perijove with this antenna. Gain scales with D².`,
      say: (_, r) => (r.dataReturn >= 0.9 ? 'Your dish gets the data home. Nice.' : `Only ${(r.dataReturn * 100).toFixed(0)}% of your data gets home. Try a bigger dish.`),
      guesses: ['lightTime', 'dataRate'],
    },
    {
      id: 'rocket',
      role: 'director',
      title: 'Rocket',
      brief: 'The smallest rocket that can still lift it.',
      techSay: (_, r) => `Wet mass ${r.wetKg.toFixed(0)} kg against ${r.capKg.toLocaleString('en-US')} kg at this C3.`,
      say: (_, r) =>
        r.wetKg > r.capKg ? `Too heavy! On this path the rocket carries ${r.capKg.toLocaleString('en-US')} kg. Pick a bigger rocket, a gentler path, or take something off.` : 'Pick the smallest rocket that can carry you. The big ones cost a fortune.',
    },
  ],
  Craft: JunoCraft,
  readout: (d, r) => [
    ['Load', `${r.loadW.toFixed(0)} W`],
    ['Launch C3', `${C3[d.trajectory]} km²/s²`],
    ['Launch capacity', `${r.capKg.toLocaleString('en-US')} kg`],
    ['Dry mass', `${r.dryKg.toFixed(0)} kg`],
    ['Total Δv', `${r.deltaV} m/s`],
    ['Orbit period', `${r.orbitDays} days`],
    ['Dose rating', `${r.survivable} passes`],
    ['Data per pass', `${r.gbPerPass.toFixed(1)} GB`],
  ],
  rocketLook: (d) => ROCKET_LOOKS[d.rocket],
  Controls: JunoControls,
  Viz: JunoViz,
  describe,
  nasa: {
    design: NASA_DESIGN,
    label: 'NASA (2011)',
    facts: NASA_FACTS,
    source: 'NASA/JPL Juno mission pages and press kit. Part masses, powers and costs in this game are simplified estimates; the physics is real.',
    rows: (d, r, n, nr) => [
      ['Power', d.power === 'solar' ? `${d.arrayM2} m² solar` : `${d.rtgs} RTG`, `${n.arrayM2} m² solar`],
      ['Path', d.trajectory === 'flyby' ? 'Earth flyby' : 'direct', 'Earth flyby (Oct 2013)'],
      ['Orbit', orbitName[d.orbit], 'polar 14-day planned → 53-day flown'],
      ['Vault', `${d.vaultCm} cm`, `${n.vaultCm} cm titanium`],
      ['Antenna', `${d.hga} m`, `${n.hga} m`],
      ['Rocket', ROCKETS[d.rocket].name, ROCKETS[n.rocket].name],
      ['Launch mass', `${r.wetKg.toFixed(0)} kg`, `3,625 kg (real) · ${nr.wetKg.toFixed(0)} kg in this model`],
    ],
  },
  frontier: searchFrontier,
  lessons: (d, r) => {
    const out = []
    if (d.power === 'rtg')
      out.push({
        title: 'Why not nuclear?',
        body: `RTGs work in the dark, but each gives only ~110 W and plutonium-238 was scarce: the US had stopped making it decades earlier. Your ${d.rtgs} RTG${d.rtgs > 1 ? 's give' : ' gives'} ${r.powerW.toFixed(0)} W at Jupiter. Better solar cells let NASA fly Juno on sunlight instead, a first at Jupiter.`,
      })
    if (d.orbit === 'equatorial')
      out.push({
        title: 'The radiation belts',
        body: 'Jupiter’s magnetic field traps particles in belts around its equator, the harshest radiation environment of any planet. Juno’s polar orbit swoops in over the pole, passes close to the cloud tops under the belts, and escapes over the other pole.',
      })
    return out
  },
  scoreScale: 'all three core instruments for 30 close passes',
  dataNote: 'Events from Juno’s real mission history (NASA/JPL)',
}
