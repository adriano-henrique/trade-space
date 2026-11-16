// Flies a Juno design through Juno's real history: launch, deep-space maneuvers, the 2013 Earth
// flyby, Jupiter orbit insertion, the 2016 valve problem and the 2019 eclipse-dodging burn.
import type { Echo, Flight, FlightEvent } from '../../game/types'
import { MISSION, type Design, type Result } from './model'

const LAUNCH = Date.parse(MISSION.launchDate)
const dayOf = (iso: string) => Math.round((Date.parse(iso) - LAUNCH) / 86400000)
const dateOf = (day: number) => new Date(LAUNCH + day * 86400000).toISOString().slice(0, 10)

const ECHO: Record<string, Echo> = {
  galileo: {
    mission: 'Galileo at Jupiter',
    year: '1995–2003',
    story:
      'Galileo orbited near Jupiter’s equator, inside the radiation belts, and ran on nuclear power. Radiation glitched its electronics again and again; engineers kept it alive by patching software from Earth.',
  },
  valve: {
    mission: 'Juno (the real one)',
    year: 'Oct 2016',
    story:
      'Before the burn to shrink Juno’s orbit to 14 days, two helium check valves opened in minutes instead of seconds. NASA chose not to risk the main engine and kept Juno in its 53-day orbit, which still delivered the science, just more slowly.',
  },
  flybySafeMode: {
    mission: 'Juno (the real one)',
    year: 'Oct 2013',
    story: 'Right after its Earth flyby, the real Juno unexpectedly entered safe mode. Engineers recovered it within days and the trajectory was perfect.',
  },
  eclipse: {
    mission: 'Juno (the real one)',
    year: 'Sep 2019',
    story:
      'Juno’s orbit was drifting into Jupiter’s shadow, which would have cut sunlight to the solar panels for 12 hours. On 30 Sep 2019 it fired its thrusters for 10.5 hours to stay in the light.',
  },
}

export function fly(d: Design, r: Result): Flight {
  const events: FlightEvent[] = []
  const arrival = d.trajectory === 'flyby' ? dayOf('2016-07-05') : Math.round(r.cruiseYears * 365)
  const passDays = r.orbitDays
  const effectiveOrbit = d.orbit === 'polar14' ? 53 : passDays
  const plannedEnd = arrival + MISSION.requiredPasses * effectiveOrbit
  let lost = false
  let passes = 0
  const push = (e: Omit<FlightEvent, 'date'> & { date?: string }) => events.push({ ...e, date: e.date ?? dateOf(e.day) })

  push({ day: 0, title: 'Liftoff', body: `${r.wetKg.toFixed(0)} kg leaves Earth. ${d.trajectory === 'flyby' ? 'First stop: a loop out past Mars and back.' : 'Straight for Jupiter, at full speed.'}`, tone: 'info' })

  if (r.wetKg > r.capKg) {
    push({
      day: 0,
      title: 'Too heavy for this trajectory',
      body: `The rocket can send ${r.capKg} kg on this path; you brought ${r.wetKg.toFixed(0)} kg. You never reach Jupiter.${d.trajectory === 'direct' ? ' A slower Earth-flyby path asks far less of the rocket.' : ''}`,
      tone: 'bad',
    })
    return { events, lost: true, totalDays: arrival + 365, usefulDays: 0, finalScience: 0 }
  }

  if (d.trajectory === 'flyby') {
    push({ day: dayOf('2012-08-30'), title: 'Deep-space maneuver 1', body: 'The main engine fires far beyond Mars to bend the path back toward Earth.', tone: 'info' })
    push({ day: dayOf('2012-09-14'), title: 'Deep-space maneuver 2', body: 'Second burn. Next stop: Earth, one year from now.', tone: 'info' })
    push({
      day: dayOf('2013-10-09'),
      title: 'Earth flyby: a speed boost for free',
      body: 'Swinging a few hundred km above Earth, its gravity flings you toward Jupiter, like a ball bouncing off a moving train. No propellant spent.',
      tone: 'good',
      echo: ECHO.flybySafeMode,
    })
  }

  if (r.powerW < r.powerNeededW) {
    push({
      day: Math.round(arrival * 0.7),
      title: 'Power is fading',
      body: `Sunlight weakens with every million km. ${d.power === 'solar' ? `Your ${d.arrayM2} m² array` : `Your ${d.rtgs} RTG${d.rtgs > 1 ? 's' : ''}`} will give only ${r.powerW.toFixed(0)} W at Jupiter; you need ${r.powerNeededW.toFixed(0)} W.`,
      tone: 'warn',
    })
  }

  push({
    day: arrival,
    title: 'Jupiter orbit insertion',
    body: `A ${d.trajectory === 'flyby' ? '35-minute' : 'long'} engine burn slows you by ~545 m/s so Jupiter captures you. The signal confirming it arrives ${r.lightMin.toFixed(0)} minutes later.`,
    tone: 'good',
    date: d.trajectory === 'flyby' ? '2016-07-05' : undefined,
  })

  if (r.powerW < r.powerNeededW * 0.75) {
    push({ day: arrival + 2, title: 'Not enough power to run', body: 'The spacecraft can’t keep its heaters, radio and instruments on at the same time. It freezes into safe mode and goes silent.', tone: 'bad' })
    lost = true
  } else if (d.power === 'solar' && d.orbit === 'equatorial') {
    push({
      day: arrival + 3,
      title: 'Into Jupiter’s shadow',
      body: 'An equatorial orbit crosses behind Jupiter on every lap, hours without sunlight. Solar panels can’t carry you through; the batteries drain flat.',
      tone: 'bad',
      echo: ECHO.galileo,
    })
    lost = true
  }

  if (!lost && d.orbit === 'polar14') {
    push({
      day: dayOf('2016-10-14'),
      title: 'Valves stick: staying at 53 days',
      body: 'History repeats. Your plan was to shrink the orbit to 14 days, but sticky helium valves make the main-engine burn too risky. Science continues, more slowly.',
      tone: 'warn',
      echo: ECHO.valve,
    })
  }

  if (!lost) {
    const limit = Math.min(MISSION.requiredPasses + 20, r.survivable)
    const discoveries: [number, boolean, string, string][] = [
      [3, d.cam, 'Clusters of cyclones at the poles', 'The first close looks at Jupiter’s poles show cyclones packed in neat geometric clusters, something no model predicted.'],
      [8, d.gravity, 'A “fuzzy” core', 'Gravity data suggest Jupiter’s core is not a small solid ball but a large, diluted region mixed with the planet’s interior.'],
      [12, d.particles, 'Auroras unlike Earth’s', 'Jupiter’s strongest auroras turn out to be powered differently from Earth’s.'],
      [20, d.mwr, 'The Great Red Spot has deep roots', 'Microwave data show the Great Red Spot extends hundreds of kilometres below the cloud tops.'],
    ]
    for (passes = 1; passes <= limit; passes++) {
      const day = arrival + passes * effectiveOrbit
      for (const [n, on, title, body] of discoveries) if (passes === n && on) push({ day, title: `Pass ${n}: ${title}`, body, tone: 'good' })
      if (d.power === 'solar' && d.orbit !== 'equatorial' && day >= dayOf('2019-09-30') && day < dayOf('2019-09-30') + effectiveOrbit) {
        push({
          day: dayOf('2019-09-30'),
          title: 'Dodging Jupiter’s shadow',
          body: 'Your orbit is drifting toward a 12-hour eclipse. On solar power that would be fatal, so you burn the thrusters to stay in the light.',
          tone: 'warn',
          echo: ECHO.eclipse,
        })
      }
      if (passes === MISSION.requiredPasses)
        push({ day, title: `Pass ${passes}: prime mission complete`, body: 'Every close pass required for the science goals is done.', tone: 'good' })
    }
    passes = limit
    if (r.survivable < MISSION.requiredPasses + 20) {
      push({
        day: arrival + (r.survivable + 1) * effectiveOrbit,
        title: 'Radiation wins',
        body: `After ${r.survivable} passes through Jupiter’s radiation, the electronics reach their rated dose. ${d.vaultCm === 0 ? 'With no shielding vault, it happened fast.' : 'Engineers rate parts conservatively: the real Juno kept working well past its radiation design limits, into an extended mission.'}`,
        tone: r.survivable >= MISSION.requiredPasses ? 'info' : 'bad',
        echo: d.orbit === 'equatorial' ? ECHO.galileo : undefined,
      })
    }
  }

  events.sort((a, b) => a.day - b.day)
  const instruments = (d.mwr ? 1 : 0) + (d.gravity ? 1 : 0) + (d.mag ? 1 : 0)
  const passFrac = Math.min(1, passes / MISSION.requiredPasses)
  const extra = Math.max(0, passes - MISSION.requiredPasses) / MISSION.requiredPasses // extended mission bonus
  const base = lost ? 0 : (100 * instruments) / 3
  const finalScience = Math.round((base * passFrac + (d.particles ? 15 : 0) * passFrac + base * 0.3 * extra) * r.dataReturn * r.perks.science)
  const end = lost ? Math.max(...events.map((e) => e.day)) : Math.max(plannedEnd, ...events.map((e) => e.day))

  return {
    events,
    lost: lost || passes === 0,
    totalDays: end,
    usefulDays: lost ? 0 : Math.round(passes * effectiveOrbit),
    finalScience,
    scoreNote: d.cam && !lost ? 'plus a public camera the whole world can follow' : undefined,
  }
}
