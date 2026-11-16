import { describe, expect, it } from 'vitest'
import {
  eclipseMin,
  footprintKm,
  lightTimeS,
  orbitPeriodMin,
  propellantKg,
  revisitDays,
  sunSyncInclinationDeg,
  swathKm,
  worstBetaDeg,
} from './model'

describe('physics model against known spacecraft', () => {
  it('ISS-like 420 km orbit takes about 92–93 minutes', () => {
    expect(orbitPeriodMin(420)).toBeGreaterThan(92)
    expect(orbitPeriodMin(420)).toBeLessThan(93.5)
  })

  it('SMAP at 685 km: ~98.5 min orbit, sun-synchronous at ~98.1°', () => {
    expect(orbitPeriodMin(685)).toBeCloseTo(98.5, 0)
    expect(sunSyncInclinationDeg(685)).toBeCloseTo(98.1, 0)
  })

  it('noon orbit at 400 km spends roughly 35–37 min in shadow', () => {
    const e = eclipseMin(400, 0)
    expect(e).toBeGreaterThan(35)
    expect(e).toBeLessThan(37)
  })

  it('dawn–dusk orbit has short worst-case eclipses only', () => {
    const e = eclipseMin(685, worstBetaDeg('dawn-dusk'))
    expect(e).toBeGreaterThan(5)
    expect(e).toBeLessThan(25)
    expect(eclipseMin(685, 80)).toBe(0)
  })

  it('6 m L-band dish at 685 km gives a ~40 km footprint, ~1000 km swath, 2–3 day revisit', () => {
    expect(footprintKm(6, 685, 0.21)).toBeGreaterThan(30)
    expect(footprintKm(6, 685, 0.21)).toBeLessThan(45)
    expect(swathKm(685)).toBeGreaterThan(900)
    expect(swathKm(685)).toBeLessThan(1050)
    const r = revisitDays(685, swathKm(685))
    expect(r).toBeGreaterThan(2)
    expect(r).toBeLessThan(3)
  })

  it('rocket equation: 100 m/s on hydrazine costs ~4–5% of dry mass', () => {
    expect(propellantKg(1000, 100, 220)).toBeGreaterThan(40)
    expect(propellantKg(1000, 100, 220)).toBeLessThan(50)
  })

  it('one light-day is about 25.9 billion km', () => {
    expect(lightTimeS(25.9e9) / 3600).toBeCloseTo(24, 0)
  })
})

import { downlinkKbps, hohmannYears } from './model'

describe('deep space', () => {
  it('Hohmann transfer Earth→Jupiter takes ~2.7 years', () => {
    expect(hohmannYears(1, 5.2)).toBeCloseTo(2.73, 1)
  })
  it('2.5 m dish from 5.2 AU gives tens of kbps on a 34 m DSN antenna', () => {
    const r = downlinkKbps(2.5, 5.2)
    console.log('juno-like kbps', r.toFixed(1))
    expect(r).toBeGreaterThan(10)
    expect(r).toBeLessThan(150)
  })
})
