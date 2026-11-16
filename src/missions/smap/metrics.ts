// "Engineer's Gut": every locked number has an estimation prompt, a hint ladder and a Why? card
// that shows the formula with the player's own numbers plugged in.
import { arrayWattsPerM2, EARTH } from '../../physics/model'
import type { Metric as M } from '../../game/types'
import type { Design, Result } from './model'
import { MISSION } from './model'

export type MetricId = 'period' | 'eclipse' | 'footprint' | 'revisit' | 'array' | 'battery'
type Metric = M<Design, Result>

const f = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export const METRICS: Record<MetricId, Metric> = {
  period: {
    id: 'period',
    label: 'One lap of Earth',
    tech: { label: 'Orbital period', question: (d) => `Period of a circular orbit at ${d.altitude} km altitude?` },
    unit: 'min',
    question: (d) => `From ${d.altitude} km up, how long does one lap around Earth take?`,
    min: 10,
    max: 1000,
    truth: (_, r) => r.period,
    formula: (d) => ({
      title: 'Kepler’s third law',
      expr: 'T = 2π √(a³ ÷ μ)',
      vars: [
        { name: 'a', value: EARTH.radius + d.altitude, unit: 'km', meaning: 'distance from Earth’s centre: 6,378 km + your altitude' },
        { name: 'mu', value: EARTH.mu, unit: 'km³/s²', meaning: 'μ, how hard Earth’s gravity pulls' },
      ],
      type: '2*pi*sqrt(a^3/mu)/60',
      note: 'The formula gives seconds. Divide by 60 for minutes.',
    }),
    hints: (d) => [
      'The International Space Station, at about 420 km, circles Earth roughly 16 times a day.',
      'Kepler’s third law: T = 2π √(a³ / μ), where a is the distance from Earth’s centre.',
      `a = 6378 + ${d.altitude} = ${f(EARTH.radius + d.altitude)} km, μ = 398,600 km³/s².`,
    ],
    why: (d, r) => ({
      plain: `Higher orbits are slower and longer. At ${d.altitude} km you go around ${f(1440 / r.period, 1)} times a day.`,
      formula: `T = 2π √(${f(EARTH.radius + d.altitude)}³ / 398,600) = ${f(r.period * 60)} s = ${f(r.period, 1)} min`,
      source: 'Kepler’s third law; Earth’s gravitational constant from NASA/JPL',
    }),
  },
  eclipse: {
    id: 'eclipse',
    label: 'Time in the dark',
    tech: {
      label: 'Max eclipse per orbit',
      question: (d) => `Sun-synchronous ${d.orbit === 'dawn-dusk' ? 'dawn–dusk (06:00/18:00)' : 'noon–midnight'} orbit at ${d.altitude} km: longest eclipse per orbit over the year?`,
    },
    unit: 'min',
    question: (d) =>
      d.orbit === 'dawn-dusk'
        ? 'Your orbit follows sunrise and sunset. On the worst lap of the year, how long is your satellite in Earth’s shadow?'
        : 'Your orbit dives through Earth’s shadow on every lap. How long is each dive?',
    min: 0.5,
    max: 100,
    truth: (_, r) => Math.max(r.eclipse, 0.5),
    formula: (d, r) => ({
      title: 'Time in Earth’s shadow',
      expr: 't = T × acos( √(h² + 2Rh) ÷ (a × cos β) ) ÷ π',
      vars: [
        { name: 'T', value: r.period, unit: 'min', meaning: 'time for one lap' },
        { name: 'h', value: d.altitude, unit: 'km', meaning: 'your altitude' },
        { name: 'R', value: EARTH.radius, unit: 'km', meaning: 'Earth’s radius' },
        { name: 'a', value: EARTH.radius + d.altitude, unit: 'km', meaning: 'R + h' },
        {
          name: 'cosb',
          value: Math.cos(((d.orbit === 'dawn-dusk' ? 90 - 23.44 - (r.inclination - 90) : 0) * Math.PI) / 180),
          unit: '',
          meaning: d.orbit === 'dawn-dusk' ? 'cos β, for the worst tilt of the orbit to the Sun in a year' : 'cos β = 1, because this orbit passes straight behind Earth',
        },
      ],
      type: 'T*acos(sqrt(h^2+2*R*h)/(a*cosb))/pi',
      note: 'If the part inside acos comes out bigger than 1, the orbit never touches the shadow.',
    }),
    hints: (d) => [
      d.orbit === 'dawn-dusk'
        ? 'A dawn–dusk orbit rides the line between day and night, so it is almost always in sunlight.'
        : 'A noon–midnight orbit flies straight through Earth’s shadow on every lap.',
      'Earth’s shadow is about as wide as Earth. Ask: what fraction of the circle is hidden behind it?',
      d.orbit === 'dawn-dusk'
        ? 'Near the June solstice the tilt of Earth lets the shadow catch the orbit for a few minutes.'
        : 'At 400 km roughly 38% of each orbit is dark; it shrinks slowly as you go higher.',
    ],
    why: (d, r) => ({
      plain:
        d.orbit === 'dawn-dusk'
          ? `This is why SMAP flew dawn–dusk: only ${f(r.eclipse)} min of darkness in the worst week, and none for most of the year. Less shadow means a smaller battery.`
          : `Every orbit you spend ${f(r.eclipse)} of ${f(r.period)} minutes in the dark, running on batteries.`,
      formula: `fraction = acos(√(h² + 2Rh) / (a·cos β)) / π, with worst β = ${f(d.orbit === 'dawn-dusk' ? 90 - 23.44 - (r.inclination - 90) : 0, 1)}° → ${f(r.eclipse, 1)} min`,
      source: 'Cylindrical shadow model (Vallado; Wertz & Larson, SMAD)',
    }),
  },
  footprint: {
    id: 'footprint',
    label: 'How blurry the map is',
    tech: { label: 'Radiometer footprint', question: (d) => `Ground footprint of a ${d.dish} m aperture at λ = 21 cm (1.41 GHz) from ${d.altitude} km, 40° incidence?` },
    unit: 'km',
    question: (d) => `Your ${d.dish} m dish sees the ground as blurry dots. From ${d.altitude} km up, how wide is one dot?`,
    min: 1,
    max: 1000,
    truth: (_, r) => r.footprint,
    formula: (d) => ({
      title: 'How sharp a dish can see',
      expr: 'dot = 1.2 × λ ÷ D × range',
      vars: [
        { name: 'lambda', value: MISSION.wavelengthM, unit: 'm', meaning: 'λ, the length of the radio waves it listens to' },
        { name: 'D', value: d.dish, unit: 'm', meaning: 'width of your dish' },
        { name: 'range', value: d.altitude / Math.cos((40 * Math.PI) / 180), unit: 'km', meaning: 'distance to the ground, looking 40° off straight down' },
      ],
      type: '1.2*lambda/D*range',
      note: 'Bigger dish or shorter waves: smaller dots.',
    }),
    hints: (d) => [
      'A dish can only tell apart directions separated by about wavelength ÷ dish size (in radians).',
      'Beam angle ≈ 1.2 × λ / D. Multiply by the distance to the ground.',
      `1.2 × 0.21 m / ${d.dish} m = ${f((1.2 * 0.21) / d.dish, 3)} rad, distance ≈ ${f(d.altitude / Math.cos((40 * Math.PI) / 180))} km.`,
    ],
    why: (d, r) => ({
      plain: `Long radio waves see through clouds and into soil, but they need a huge dish to see detail. That’s why SMAP carried a 6 m reflector, spinning to sweep a wide path.`,
      formula: `pixel ≈ 1.2 × 0.21 / ${d.dish} × ${f(d.altitude / Math.cos((40 * Math.PI) / 180))} km = ${f(r.footprint)} km`,
      source: 'Diffraction limit of a circular aperture; SMAP L-band at 1.41 GHz (NASA JPL)',
    }),
  },
  revisit: {
    id: 'revisit',
    label: 'Time to scan the planet',
    tech: { label: 'Global revisit', question: (d) => `With a ${f(swathKm(d))} km swath from ${d.altitude} km altitude, how many days to cover the full equator?` },
    unit: 'days',
    question: (d) => `Every lap you scan a strip ${f(swathKm(d))} km wide. How many days until you have scanned the whole planet?`,
    min: 0.2,
    max: 50,
    truth: (_, r) => r.revisit,
    formula: (_, r) => ({
      title: 'Covering the whole planet',
      expr: 'days = C ÷ (swath × laps)',
      vars: [
        { name: 'C', value: EARTH.equator, unit: 'km', meaning: 'distance around the equator' },
        { name: 'swath', value: r.swath, unit: 'km', meaning: 'width of the strip you scan on each lap' },
        { name: 'laps', value: 1440 / r.period, unit: 'per day', meaning: 'laps in a day: 1,440 minutes ÷ time for one lap' },
      ],
      type: 'C/(swath*laps)',
    }),
    hints: (_, r) => [
      'The equator is about 40,000 km around.',
      'Each orbit paints one strip as wide as your swath.',
      `40,075 km ÷ (${f(r.swath)} km × ${f(1440 / r.period, 1)} orbits/day)`,
    ],
    why: (d, r) => ({
      plain: `Going higher widens the sweep (fewer days to cover Earth) but blurs the pixels. Requirement: ≤ ${MISSION.requirements.revisitDays} days. Altitude ${d.altitude} km gives ${f(r.revisit, 1)}.`,
      formula: `40,075 / (${f(r.swath)} × ${f(1440 / r.period, 2)}) = ${f(r.revisit, 2)} days`,
      source: 'Conical-scan swath geometry; Earth’s equatorial circumference (WGS-84)',
    }),
  },
  array: {
    id: 'array',
    label: 'Solar wings',
    tech: {
      label: 'Solar array area',
      question: (_, r) =>
        `Load ${f(r.loadW)} W, up to ${f(r.eclipse)} min of eclipse per ${f(r.period)} min orbit. The array gives ${f(arrayWattsPerM2(1))} W/m² at end of life; path efficiency is 0.6 through the battery and 0.8 direct. Required array area?`,
    },
    unit: 'm²',
    sizes: 'arrayM2',
    question: (_, r) => `Your spacecraft uses ${f(r.loadW)} watts. How big must the solar wings be to run it and refill the battery?`,
    min: 0.5,
    max: 50,
    truth: (_, r) => r.arrayNeededW / arrayWattsPerM2(1),
    formula: (_, r) => ({
      title: 'Sizing a solar array',
      expr: 'area = P × ( tₑ ÷ (0.6 × t_d) + 1 ÷ 0.8 ) ÷ w',
      vars: [
        { name: 'P', value: r.loadW, unit: 'W', meaning: 'power your spacecraft uses' },
        { name: 'te', value: r.eclipse, unit: 'min', meaning: 'tₑ, time in the dark each lap' },
        { name: 'td', value: r.period - r.eclipse, unit: 'min', meaning: 't_d, time in sunlight each lap' },
        { name: 'w', value: arrayWattsPerM2(1), unit: 'W/m²', meaning: 'power from one m² of panel near Earth (1,361 × 0.28 × 0.85 × 0.9)' },
      ],
      type: 'P*(te/(0.6*td)+1/0.8)/w',
      note: '0.6 and 0.8 are losses: power stored in the battery and used later costs more than power used straight away.',
    }),
    hints: (_, r) => [
      'Sunlight near Earth carries 1,361 W per square metre. Good cells turn ~28% into electricity.',
      'After packing gaps and aging, plan on ~290 W per m². You must also recharge the battery while in sunlight.',
      `Needed in sunlight: ${f(r.arrayNeededW)} W ÷ ${f(arrayWattsPerM2(1))} W/m²`,
    ],
    why: (_, r) => ({
      plain: `Panels must run everything in daylight and refill the battery for the next shadow, so you need more than the ${f(r.loadW)} W load.`,
      formula: `${f(r.arrayNeededW)} W ÷ (1361 × 0.28 × 0.85 × 0.9 = ${f(arrayWattsPerM2(1))} W/m²) = ${f(r.arrayNeededW / arrayWattsPerM2(1), 1)} m²`,
      source: 'Solar constant 1361 W/m² (NASA TSIS); SMAD power sizing',
    }),
  },
  battery: {
    id: 'battery',
    label: 'Battery',
    tech: { label: 'Battery capacity', question: (_, r) => `Load ${f(r.loadW)} W through a ${f(r.eclipse)} min eclipse, cycled every orbit. 30% depth of discharge, 90% discharge efficiency. Required battery capacity?` },
    unit: 'Wh',
    sizes: 'batteryWh',
    question: (_, r) => `Your spacecraft uses ${f(r.loadW)} watts and spends up to ${f(r.eclipse)} minutes of each lap in the dark. How big a battery does it need?`,
    min: 10,
    max: 10000,
    truth: (_, r) => r.batteryNeededWh,
    formula: (_, r) => ({
      title: 'Sizing a battery',
      expr: 'energy = P × tₑ ÷ (0.3 × 0.9)',
      vars: [
        { name: 'P', value: r.loadW, unit: 'W', meaning: 'power your spacecraft uses' },
        { name: 'te', value: r.eclipse / 60, unit: 'hours', meaning: 'tₑ, time in the dark each lap' },
      ],
      type: 'P*te/(0.3*0.9)',
      note: '0.3: only use 30% of the battery each lap so it lasts for years. 0.9: a little energy is lost getting it out.',
    }),
    hints: (_, r) => [
      'Energy = power × time in the dark.',
      'Draining a battery deeply every 90 minutes kills it in months. In low orbit, use only ~30% of it per orbit.',
      `${f(r.loadW)} W × ${f(r.eclipse / 60, 2)} h ÷ (0.3 × 0.9)`,
    ],
    why: (_, r) => ({
      plain: `A satellite in low orbit charges and drains its battery ~15 times a day, over 5,000 times a year. Shallow cycles keep it alive for years.`,
      formula: `${f(r.loadW)} W × ${f(r.eclipse, 1)} min ÷ 60 ÷ (0.30 depth × 0.90 efficiency) = ${f(r.batteryNeededWh)} Wh`,
      source: 'SMAD battery sizing; Li-ion cycle-life practice for LEO',
    }),
  },
}

function swathKm(d: Design) {
  return 2 * d.altitude * Math.tan((35.5 * Math.PI) / 180)
}
