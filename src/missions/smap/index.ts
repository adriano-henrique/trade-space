import type { Mission } from '../../game/types'
import { ROCKET_LOOKS, SmapControls } from './Controls'
import { SmapCraft } from './Craft'
import { fly } from './flight'
import { METRICS } from './metrics'
import { evaluate, MISSION, NASA_DESIGN, NASA_FACTS, RADIOS, ROCKETS, STARTER, STATIONS, type Design, type Result } from './model'
import { searchFrontier } from './pareto'
import { SmapViz } from './Viz'

export const smapMission: Mission<Design, Result> = {
  id: 'smap',
  kicker: 'Replay history · 2015',
  name: 'SMAP',
  year: '2015',
  objective: MISSION.objective,
  teaser: 'Map the water hidden in Earth’s soil from orbit. Same rockets, same budget and the same solar storms NASA faced.',
  tags: ['Tutorial', 'Low Earth orbit', 'Power · coverage · data'],
  budgetM: MISSION.budgetM,
  launchDate: MISSION.launchDate,
  starter: STARTER,
  evaluate,
  fly,
  metrics: METRICS,
  quizIds: ['period', 'eclipse', 'footprint', 'revisit'],
  pitch: 'Build a satellite that can feel the water hiding in the ground.',
  place: 'earth',
  briefing: {
    where: 'Low Earth orbit, 400 to 850 km up',
    why: 'Water in the top few centimetres of soil decides whether rain soaks in or runs off as a flood, and whether crops grow or fail. Forecasters want a fresh map of the whole planet every few days.',
    hard: [
      {
        title: 'Sharp or fast',
        plain: 'Fly low and the map is sharp. Fly high and you cover the planet sooner. One altitude has to do both jobs.',
        tech: 'Footprint grows with h/D and swath with h, so resolution and revisit pull the altitude in opposite directions.',
      },
      {
        title: 'Earth’s shadow',
        plain: 'Some orbits cross the night side on every lap. You size the solar wings and the battery yourself, and only find out in flight whether they were enough.',
        tech: 'Array and battery are sized by your estimate, against the load and the worst-case eclipse. Both are verified in flight.',
      },
      {
        title: 'More data than radio',
        plain: 'Instruments can collect far more than the radio can send home. Whatever is not sent is lost.',
        tech: 'Collected volume against downlink capacity: band, pass length and passes per day.',
      },
      {
        title: 'Real space weather',
        plain: 'You fly through the solar storms of 2015, exactly as NASA recorded them.',
        tech: 'Geomagnetic storms from the NASA DONKI archive for 2015. Drag rises with them at low altitude.',
      },
    ],
  },
  steps: [
    {
      id: 'orbit',
      role: 'director',
      title: 'Orbit',
      brief: 'How high to fly, and which way round.',
      techSay: () => 'Footprint scales with h/D and swath with h. Drag make-up Δv climbs fast below about 500 km. Dawn–dusk minimises eclipse; noon–midnight eclipses on every orbit.',
      say: () => 'Fly low and your map is sharp. Fly high and you cover Earth faster. Pick your height.',
      guesses: ['period', 'eclipse', 'revisit'],
    },
    {
      id: 'tools',
      role: 'science',
      title: 'Tools',
      brief: 'Which instruments listen for water in the soil.',
      techSay: () => 'Soil moisture is sensed at L-band (1.41 GHz). The radiometer carries the requirement, the radar adds 1–3 km resolution, and a visible imager adds no soil-moisture science.',
      say: (d) => (d.camera ? 'A camera sounds fun. But can a camera see water under the ground?' : 'Soil water whispers in radio waves. A bigger dish hears it better.'),
      guesses: ['footprint'],
    },
    {
      id: 'power',
      role: 'systems',
      title: 'Power',
      brief: 'How big the solar wings and the battery are.',
      techSay: () => 'Size the array and the battery from the load and the eclipse. Both requirements stay hidden until flight: undersize either and the bus browns out.',
      say: () => 'Now the scary part. You decide how big the solar wings and the battery are. I can’t tell you if it’s enough until we fly.',
    },
    {
      id: 'radio',
      role: 'comms',
      title: 'Radio',
      brief: 'How fast the radio is, and how many antennas listen.',
      techSay: (_, r) => `Collected ${r.collectGbDay.toFixed(0)} GB/day against ${r.downlinkGbDay.toFixed(1)} GB/day of downlink capacity: ${(r.dataReturn * 100).toFixed(0)}% data return.`,
      say: (_, r) =>
        r.dataReturn >= 0.95 ? 'All your data makes it home. Nice.' : `Only ${(r.dataReturn * 100).toFixed(0)}% of your data gets home. The rest is lost. Try a faster radio or more antennas.`,
    },
    {
      id: 'rocket',
      role: 'director',
      title: 'Rocket',
      brief: 'The smallest rocket that can still lift it.',
      techSay: (_, r) => `Wet mass ${r.wetKg.toFixed(0)} kg against ${r.rocketCapKg} kg to this orbit: ${(r.rocketCapKg - r.wetKg).toFixed(0)} kg of margin.`,
      say: (_, r) =>
        r.wetKg > r.rocketCapKg
          ? `Too heavy! This rocket lifts ${r.rocketCapKg.toLocaleString('en-US')} kg. Pick a bigger one, or take something off.`
          : 'Bigger rockets lift more and cost more. Pick the smallest one that can carry you.',
    },
  ],
  Craft: SmapCraft,
  readout: (d, r) => [
    ['Load', `${r.loadW.toFixed(0)} W`],
    ['Array output', `${r.arrayW.toFixed(0)} W`],
    ['Battery', `${d.batteryWh} Wh`],
    ['Dry mass', `${r.dryKg.toFixed(0)} kg`],
    ['Propellant', `${r.propKg.toFixed(0)} kg`],
    ['Δv, 3 years', `${r.deltaV.toFixed(0)} m/s`],
    ['Inclination', `${r.inclination.toFixed(1)}°`],
    ['Collected', `${r.collectGbDay.toFixed(0)} GB/day`],
    ['Downlink', `${r.downlinkGbDay.toFixed(1)} GB/day`],
  ],
  rocketLook: (d) => ROCKET_LOOKS[d.rocket],
  Controls: SmapControls,
  Viz: SmapViz,
  describe: (d) =>
    `${d.altitude} km ${d.orbit === 'dawn-dusk' ? 'dawn–dusk' : 'noon–midnight'} · ${d.dish} m dish${d.radar ? ' + radar' : ''}${d.camera ? ' + camera' : ''} · ${RADIOS[d.radio].name} · ${STATIONS[d.stations].name} · ${ROCKETS[d.rocket].name} · ${d.arrayM2} m² array · ${d.batteryWh} Wh`,
  nasa: {
    design: NASA_DESIGN,
    label: 'NASA (2015)',
    facts: NASA_FACTS,
    source: 'NASA/JPL SMAP mission pages. Masses, powers and costs of individual parts in this game are simplified estimates; the physics is real.',
    rows: (d, r, n, nr) => [
      ['Altitude', `${d.altitude} km`, `${n.altitude} km`],
      ['Orbit', d.orbit === 'dawn-dusk' ? 'dawn–dusk' : 'noon–midnight', 'dawn–dusk'],
      ['Radiometer dish', `${d.dish} m`, `${n.dish} m`],
      ['Radar', d.radar ? 'yes' : 'no', 'yes'],
      ['Camera', d.camera ? 'yes' : 'no', 'no'],
      ['Radio', RADIOS[d.radio].name, RADIOS[n.radio].name],
      ['Ground stations', STATIONS[d.stations].name, STATIONS[n.stations].name],
      ['Rocket', ROCKETS[d.rocket].name, ROCKETS[n.rocket].name],
      ['Launch mass', `${r.wetKg.toFixed(0)} kg`, `944 kg (real) · ${nr.wetKg.toFixed(0)} kg in this model`],
    ],
  },
  frontier: searchFrontier,
  lessons: (d) =>
    d.camera
      ? [
          {
            title: 'The camera trap',
            body: 'Your optical camera added mass, power, cost and 30 GB of data a day, and zero soil-moisture science. Visible light bounces off leaves and clouds. L-band microwaves (21 cm) pass through clouds and light vegetation and respond to water in the top ~5 cm of soil. That’s why NASA flew a radiometer and a radar, and no camera.',
          },
        ]
      : [],
  dataNote: 'Events from NASA DONKI (2015 archive) and SMAP’s real history',
}
