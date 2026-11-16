// A future mission: no history to replay, so events come from physics and from the real system
// (Jupiter's position, Uranus's season, its moons), with echoes from missions that paved the way.
import type { Echo, Flight, FlightEvent } from '../../game/types'
import type { Design, Result } from './model'

const ECHO: Record<string, Echo> = {
  voyager: {
    mission: 'Voyager 2 at Uranus',
    year: 'Jan 1986',
    story:
      'Voyager 2’s flyby is still the only visit. Uranus’s south pole faced the Sun then, so Voyager only ever saw the southern halves of the moons. Half of each moon has never been photographed.',
  },
  galileoProbe: {
    mission: 'Galileo probe at Jupiter',
    year: 'Dec 1995',
    story: 'The only probe ever dropped into a giant planet. It radioed data for nearly an hour under its parachute before the heat and pressure silenced it.',
  },
  aerocapture: {
    mission: 'Never flown',
    year: '—',
    story: 'Aerocapture (braking in the atmosphere instead of with the engine) has been studied for decades and saves a lot of propellant, but no spacecraft has ever done it at another planet. You would be first.',
  },
  newHorizons: {
    mission: 'New Horizons',
    year: '2006–2015',
    story: 'New Horizons spent most of its 9.5-year trip to Pluto asleep in hibernation, waking about once a year for check-ups, to save wear on its electronics and its RTG’s power.',
  },
}

export function fly(d: Design, r: Result): Flight {
  const events: FlightEvent[] = []
  const launch = Date.UTC(d.launchYear, 5, 15)
  const dateOf = (day: number) => new Date(launch + day * 86400000).toISOString().slice(0, 10)
  const push = (e: Omit<FlightEvent, 'date'>) => events.push({ ...e, date: dateOf(e.day) })
  const arrival = Math.round(r.cruiseYears * 365.25)
  const total = arrival + Math.round(d.tourYears * 365.25)
  let lost = false

  push({ day: 0, title: 'Liftoff', body: `${r.wetKg.toFixed(0)} kg leaves Earth for a ${r.cruiseYears.toFixed(1)}-year journey.`, tone: 'info' })
  if (r.wetKg > r.capKg) {
    push({ day: 0, title: 'Too heavy', body: `The rocket can send ${r.capKg} kg toward Uranus this year; you brought ${r.wetKg.toFixed(0)} kg.`, tone: 'bad' })
    return { events, lost: true, totalDays: total, usefulDays: 0, finalScience: 0 }
  }

  if (d.assist === 'jupiter') {
    const day = Math.round(1.6 * 365.25)
    if (r.alignment > 0.4)
      push({ day, title: 'Jupiter flyby: slingshot', body: `Jupiter is well placed (alignment ${(r.alignment * 100).toFixed(0)}%, from real JPL ephemerides) and flings you toward Uranus.`, tone: 'good' })
    else if (r.alignment > 0)
      push({ day, title: 'Jupiter flyby: a weak push', body: `Jupiter is off to the side this year (alignment ${(r.alignment * 100).toFixed(0)}%). The boost is small; the trip stretches to ${r.cruiseYears.toFixed(1)} years.`, tone: 'warn' })
    else
      push({ day, title: 'Jupiter is in the wrong place', body: `In ${d.launchYear}, Jupiter is nowhere near the path to Uranus. No slingshot. The next good windows are 2031–32 and the mid-2040s.`, tone: 'bad' })
  }

  push({ day: Math.round(arrival * 0.35), title: 'Hibernation', body: `Years of quiet cruise. The RTGs lose ~2% a year; you check in by radio, with signals taking hours.`, tone: 'info', echo: ECHO.newHorizons })

  if (d.capture === 'aerocapture')
    push({ day: arrival, title: 'Aerocapture!', body: 'You skim through Uranus’s upper atmosphere behind a heat shield, shedding speed with friction instead of propellant. It works, but this was a first, and a risk.', tone: 'warn', echo: ECHO.aerocapture })
  else push({ day: arrival, title: 'Uranus orbit insertion', body: `A long engine burn (about ${1650} m/s) and you are the first spacecraft ever to orbit Uranus. Arrival: ${Math.floor(r.arrivalYear)}.`, tone: 'good' })

  if (r.powerEndW < r.powerNeededW * 0.75) {
    push({ day: arrival + 5, title: 'Not enough power', body: `${d.power === 'solar' ? `${d.arrayM2} m² of panels gives just ${r.powerEndW.toFixed(0)} W at 19 AU.` : `Your RTGs have decayed to ${r.powerEndW.toFixed(0)} W.`} You need ${r.powerNeededW.toFixed(0)} W. The spacecraft freezes and falls silent.`, tone: 'bad' })
    lost = true
  }

  if (!lost) {
    if (d.probe)
      push({ day: arrival + 60, title: 'Probe descent', body: 'Your probe plunges into the atmosphere, slows behind its heat shield, and radios helium and noble-gas measurements under its parachute: clues to how ice giants formed.', tone: 'good', echo: ECHO.galileoProbe })
    push({
      day: arrival + 200,
      title: r.northLit ? 'The moons’ hidden halves' : 'Too late for the north',
      body: r.northLit
        ? `Uranus is tipped 98°, and its seasons last ~21 years. In ${Math.floor(r.arrivalYear) + 1} the northern hemispheres of Miranda, Ariel, Umbriel, Titania and Oberon are in sunlight${d.cam ? ', and your cameras see them for the first time' : ', but you brought no camera to see them'}.`
        : `You arrived after the ${2049} equinox. The moons’ northern halves are sliding into a decades-long night; the sunlit southern halves are the ones Voyager 2 already photographed in 1986.`,
      tone: r.northLit && d.cam ? 'good' : 'warn',
      echo: ECHO.voyager,
    })
    if (d.mag) push({ day: arrival + 420, title: 'A lopsided magnetic field', body: 'Your magnetometer maps a field tilted ~60° from the spin axis and offset from the centre, which helps test ideas about the planet’s slushy interior.', tone: 'good' })
    if (d.irs) push({ day: arrival + 700, title: 'Why is Uranus so cold inside?', body: 'Thermal maps measure how little heat leaks out of the planet, far less than Neptune. Was it knocked over by a giant impact?', tone: 'good' })
    if (d.dust) push({ day: arrival + 900, title: 'Through the rings', body: 'Dust and plasma sensors sample the narrow, dark rings, which are among the least understood in the solar system.', tone: 'good' })
    if (r.powerEndW < r.powerNeededW)
      push({ day: total - 300, title: 'Power-limited operations', body: `By the end, your power (${r.powerEndW.toFixed(0)} W) falls short of the ${r.powerNeededW.toFixed(0)} W you need. Instruments take turns.`, tone: 'warn' })
    if (r.dataReturn < 0.8)
      push({ day: arrival + 365, title: 'Data bottleneck', body: `You collect ${r.gbPerYear.toFixed(1)} GB/yr but can only send ${r.gbDownPerYear.toFixed(1)} GB/yr from 19 AU. Most data never comes home.`, tone: 'warn' })
    push({ day: total, title: 'Tour complete', body: `${d.tourYears} years at the ice giant.`, tone: 'good' })
  }

  events.sort((a, b) => a.day - b.day)
  const powerFactor = r.powerEndW >= r.powerNeededW ? 1 : 0.75
  const finalScience = lost ? 0 : Math.round(r.science * powerFactor)
  return {
    events,
    lost,
    totalDays: lost ? Math.max(...events.map((e) => e.day)) : total,
    usefulDays: lost ? 0 : total - arrival,
    finalScience,
    scoreNote: d.capture === 'aerocapture' ? 'risk-weighted for untested aerocapture' : undefined,
  }
}
