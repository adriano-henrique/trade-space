// Flies a design through SMAP's real first year: real geomagnetic storms from NASA DONKI,
// the real radar failure, and the eclipse season a dawn–dusk orbit hits around the June solstice.
import donki from '../../data/donki-gst-2015.json'
import type { Echo, Flight, FlightEvent } from '../../game/types'
import type { Design, Result } from './model'
import { MISSION } from './model'


export const ECHOES = {
  starlink: {
    mission: 'Starlink batch, Feb 2022',
    year: '2022',
    story:
      'A geomagnetic storm puffed up the upper atmosphere just after launch. Drag rose sharply and most of 49 freshly launched satellites, still in a very low orbit, fell back and burned up.',
  },
  galileo: {
    mission: 'Galileo at Jupiter',
    year: '1991–2003',
    story:
      'Galileo’s big main antenna never unfolded. The team sent its science home through a small backup antenna at a tiny fraction of the planned rate, and had to choose which data to keep.',
  },
  opportunity: {
    mission: 'Opportunity rover, Mars',
    year: '2018',
    story:
      'A planet-wide dust storm blocked the sunlight. With no power to charge its batteries, the solar-powered rover went silent and never woke up.',
  },
  smapRadar: {
    mission: 'SMAP (the real one)',
    year: '2015',
    story:
      'On 7 July 2015 SMAP’s radar stopped transmitting: its high-power amplifier failed. NASA couldn’t revive it, but the radiometer kept mapping soil moisture for years. Two instruments meant one failure didn’t end the mission.',
  },
} satisfies Record<string, Echo>

const LAUNCH = Date.parse(MISSION.launchDate)
const dayOf = (iso: string) => Math.round((Date.parse(iso) - LAUNCH) / 86400000)
const dateOf = (day: number) => new Date(LAUNCH + day * 86400000).toISOString().slice(0, 10)


export function fly(d: Design, r: Result): Flight {
  const days = MISSION.lifetimeYears * 365
  const events: FlightEvent[] = []
  let lost = false
  let downDays = 0

  events.push({
    date: MISSION.launchDate,
    day: 0,
    title: 'Liftoff',
    body: `${r.wetKg.toFixed(0)} kg on its way to a ${d.altitude} km ${d.orbit === 'dawn-dusk' ? 'dawn–dusk' : 'noon–midnight'} orbit.`,
    tone: 'info',
  })

  if (r.wetKg > r.rocketCapKg) {
    events.push({
      date: MISSION.launchDate,
      day: 0,
      title: 'Too heavy for the rocket',
      body: `The rocket can lift ${r.rocketCapKg} kg to this orbit; you brought ${r.wetKg.toFixed(0)} kg. You end up in a lower, useless orbit.`,
      tone: 'bad',
    })
    return { events, lost: true, totalDays: days, usefulDays: 0, finalScience: 0 }
  }

  // Power: the first shadow comes fast in a noon orbit, at the June solstice for dawn–dusk.
  const shortBattery = d.batteryWh < r.batteryNeededWh
  const shortArray = r.arrayW < r.arrayNeededW
  if (shortBattery && d.orbit === 'noon') {
    events.push({
      date: dateOf(0),
      day: 0,
      title: 'Battery flat on the first night',
      body: `Each orbit spends ${r.eclipse.toFixed(0)} min in shadow. Your ${d.batteryWh} Wh battery needed to be about ${r.batteryNeededWh.toFixed(0)} Wh. The spacecraft froze and lost contact.`,
      tone: 'bad',
      echo: ECHOES.opportunity,
    })
    lost = true
  } else if (shortBattery) {
    for (let y = 0; y < MISSION.lifetimeYears; y++) {
      const start = dayOf(`${2015 + y}-05-20`)
      events.push({
        date: dateOf(start),
        day: start,
        title: 'Eclipse season: safe mode',
        body: `Near the June solstice your dawn–dusk orbit dips into Earth’s shadow for ${r.eclipse.toFixed(0)} min per lap. The battery runs too low, so the spacecraft switches off its instruments until August.`,
        tone: 'warn',
        echo: y === 0 ? ECHOES.opportunity : undefined,
      })
      downDays += 75
    }
  }
  if (!lost && shortArray) {
    events.push({
      date: dateOf(3),
      day: 3,
      title: 'Power-negative',
      body: `The array gives ${r.arrayW.toFixed(0)} W but you need ${r.arrayNeededW.toFixed(0)} W in sunlight. Operators must switch instruments off for part of every day.`,
      tone: 'warn',
    })
    downDays += Math.round(days * (1 - r.arrayW / r.arrayNeededW))
  }

  // Real geomagnetic storms from DONKI (strong ones only, Kp ≥ 7).
  if (!lost) {
    for (const s of donki.storms.filter((s) => s.kp >= 7)) {
      const day = dayOf(s.start)
      if (day < 0 || day > days) continue
      const low = d.altitude < 500
      events.push({
        date: s.start.slice(0, 10),
        day,
        title: `Geomagnetic storm, Kp ${s.kp}`,
        body: low
          ? `A real storm recorded by NASA. Heat from it swells the upper atmosphere; at ${d.altitude} km drag jumps and you burn extra fuel to stay up.`
          : `A real storm recorded by NASA. At ${d.altitude} km the air is so thin that the extra drag barely matters.`,
        tone: low ? 'warn' : 'good',
        echo: low ? ECHOES.starlink : undefined,
        link: s.link,
      })
    }
  }

  if (!lost && d.radar) {
    events.push({
      date: '2015-07-07',
      day: dayOf('2015-07-07'),
      title: 'Radar amplifier fails',
      body: 'History repeats: on this exact day the real SMAP radar went silent. Your radiometer keeps working.',
      tone: 'warn',
      echo: ECHOES.smapRadar,
    })
  }

  if (!lost && r.dataReturn < 0.95) {
    events.push({
      date: dateOf(10),
      day: 10,
      title: 'Data piling up on board',
      body: `You collect ${r.collectGbDay.toFixed(0)} GB a day but can only send ${r.downlinkGbDay.toFixed(0)} GB home. ${((1 - r.dataReturn) * 100).toFixed(0)}% of the science is overwritten before it reaches Earth.`,
      tone: 'warn',
      echo: ECHOES.galileo,
    })
  }

  if (!lost) {
    events.push({
      date: dateOf(days),
      day: days,
      title: 'Prime mission complete',
      body: `${MISSION.lifetimeYears} years of soil-moisture maps delivered to forecasters and farmers.`,
      tone: 'good',
    })
  }

  events.sort((a, b) => a.day - b.day)
  const uptime = lost ? 0 : Math.max(0, 1 - downDays / days)
  // Science per day, where 100 = a map that exactly meets the requirements (40 km pixels, whole
  // planet every 3 days). Sharper pixels and faster revisit are worth more; the radar adds sharper
  // maps for as long as it lives.
  const resF = Math.min(1.25, MISSION.requirements.resolutionKm / r.footprint)
  const revF = r.revisit <= MISSION.requirements.revisitDays ? Math.min(1.2, Math.sqrt(MISSION.requirements.revisitDays / r.revisit)) : 0.6 * (MISSION.requirements.revisitDays / r.revisit)
  const radiometerMeets = r.footprint <= MISSION.requirements.resolutionKm * 1.05
  const daily = (radiometerMeets ? 100 : 50) * resF * revF
  const radarDays = d.radar ? Math.min(days, dayOf('2015-07-07')) : 0
  const scale = lost ? 0 : (uptime * r.dataReturn) / days
  const radarBonus = 30 * radarDays * scale
  const finalScience = Math.round((daily * days * scale + radarBonus) * r.perks.science)

  return {
    events,
    lost,
    totalDays: days,
    usefulDays: Math.round(days * uptime),
    finalScience,
    scoreNote: radarBonus >= 1 ? `incl. +${Math.round(radarBonus)} from the radar before it failed` : undefined,
  }
}
