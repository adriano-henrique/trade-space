// Physics behind every number in the game. Pure functions, SI-ish units noted per function.
// Formulas follow standard spacecraft-design references (Wertz & Larson, "Space Mission
// Analysis and Design"; Vallado, "Fundamentals of Astrodynamics").

export const EARTH = {
  mu: 398600.4418, // km^3/s^2, gravitational parameter (NASA/JPL)
  radius: 6378.137, // km, equatorial radius (WGS-84)
  equator: 40075, // km, equatorial circumference
}
export const SOLAR_CONSTANT = 1361 // W/m^2 at 1 AU (NASA SORCE/TSIS total solar irradiance)
export const G0 = 9.80665 // m/s^2, standard gravity
export const SPEED_OF_LIGHT = 299792.458 // km/s

const deg = Math.PI / 180

/** Orbital period of a circular orbit, minutes. T = 2π √(a³/μ) */
export function orbitPeriodMin(altitudeKm: number): number {
  const a = EARTH.radius + altitudeKm
  return (2 * Math.PI * Math.sqrt(a ** 3 / EARTH.mu)) / 60
}

/**
 * Longest time in Earth's shadow per orbit, minutes, for a circular orbit whose plane makes
 * angle `betaDeg` with the Sun direction. Cylindrical-shadow model:
 * fraction = (1/π)·acos(√(h² + 2Rh) / (a·cos β)), zero when β is beyond the critical angle.
 */
export function eclipseMin(altitudeKm: number, betaDeg: number): number {
  const a = EARTH.radius + altitudeKm
  const betaCrit = Math.asin(EARTH.radius / a)
  const beta = Math.abs(betaDeg) * deg
  if (beta >= betaCrit) return 0
  const x = Math.sqrt(altitudeKm ** 2 + 2 * EARTH.radius * altitudeKm) / (a * Math.cos(beta))
  return (Math.acos(Math.min(1, x)) / Math.PI) * orbitPeriodMin(altitudeKm)
}

/**
 * Worst-case (smallest) beta angle over a year, degrees.
 * Noon–midnight orbits pass straight behind Earth (β = 0). Dawn–dusk sun-synchronous orbits ride
 * the day/night line; their β only drops to about 90° − 23.44° (season) − (i − 90°) near a solstice.
 */
export function worstBetaDeg(orbit: 'dawn-dusk' | 'noon', inclinationDeg = 98.1): number {
  return orbit === 'noon' ? 0 : 90 - 23.44 - (inclinationDeg - 90)
}

/** Sun-synchronous inclination for a circular orbit, degrees (J2 nodal precession = 360°/year). */
export function sunSyncInclinationDeg(altitudeKm: number): number {
  const J2 = 1.08263e-3
  const a = EARTH.radius + altitudeKm
  const n = Math.sqrt(EARTH.mu / a ** 3) // rad/s
  const needed = (2 * Math.PI) / (365.2422 * 86400) // rad/s
  const cosI = -needed / (1.5 * n * J2 * (EARTH.radius / a) ** 2)
  return Math.acos(cosI) / deg
}

/**
 * Ground footprint of a radiometer antenna, km. Beamwidth ≈ 1.2·λ/D (tapered dish), times the
 * slant range to the ground at the given incidence angle (flat-Earth approximation).
 */
export function footprintKm(antennaM: number, altitudeKm: number, wavelengthM: number, incidenceDeg = 40): number {
  const beam = (1.2 * wavelengthM) / antennaM
  return beam * (altitudeKm / Math.cos(incidenceDeg * deg))
}

/** Swath of a conically scanning antenna, km: 2·h·tan(look angle). */
export function swathKm(altitudeKm: number, lookDeg = 35.5): number {
  return 2 * altitudeKm * Math.tan(lookDeg * deg)
}

/** Days to cover the whole equator once, using one pass direction per orbit. */
export function revisitDays(altitudeKm: number, swath: number): number {
  const orbitsPerDay = 1440 / orbitPeriodMin(altitudeKm)
  return EARTH.equator / (swath * orbitsPerDay)
}

/**
 * Solar array power the spacecraft must produce in sunlight so the batteries can carry the
 * eclipse, watts (SMAD peak-power-tracking efficiencies: 0.6 eclipse path, 0.8 daylight path).
 */
export function arrayPowerNeededW(loadW: number, periodMin: number, eclipse: number): number {
  const day = periodMin - eclipse
  return (loadW * eclipse) / 0.6 / day + (loadW * day) / 0.8 / day
}

/** End-of-life output of one square metre of array at `au` from the Sun, W/m². */
export function arrayWattsPerM2(au = 1, efficiency = 0.28): number {
  const packing = 0.85 // cell area / panel area, plus wiring losses
  const aging = 0.9 // radiation + thermal cycling over a few years
  return (SOLAR_CONSTANT / au ** 2) * efficiency * packing * aging
}

/** Battery energy needed to ride through the eclipse, Wh. Depth of discharge kept low in LEO. */
export function batteryNeededWh(loadW: number, eclipse: number, depthOfDischarge = 0.3): number {
  return (loadW * (eclipse / 60)) / (depthOfDischarge * 0.9)
}

/** Propellant mass from the rocket equation, kg: m_dry·(e^(Δv/(Isp·g0)) − 1). */
export function propellantKg(dryKg: number, deltaVms: number, ispS: number): number {
  return dryKg * (Math.exp(deltaVms / (ispS * G0)) - 1)
}

/** Yearly Δv to fight atmospheric drag, m/s. Simplified exponential fit; storms raise it. */
export function dragDvPerYear(altitudeKm: number): number {
  return 30 * Math.exp(-(altitudeKm - 400) / 60)
}

/** Longest ground-station pass, minutes, above a 5° elevation mask. */
export function maxPassMin(altitudeKm: number, maskDeg = 5): number {
  const a = EARTH.radius + altitudeKm
  const lambda = Math.acos((EARTH.radius * Math.cos(maskDeg * deg)) / a) / deg - maskDeg
  return (orbitPeriodMin(altitudeKm) * 2 * lambda) / 360
}

/** One-way light time, seconds. */
export function lightTimeS(distanceKm: number): number {
  return distanceKm / SPEED_OF_LIGHT
}

export const AU_KM = 149597870.7

/** Minimum-energy (Hohmann) transfer time between two circular orbits around the Sun, years. */
export function hohmannYears(fromAu: number, toAu: number): number {
  const a = (fromAu + toAu) / 2
  return a ** 1.5 / 2 // half the transfer ellipse's period; Kepler: T[yr] = a[AU]^1.5
}

/**
 * Deep-space X-band downlink rate, kbit/s, from a free-space link budget:
 * Pr/N0 = Pt·Gt·Gr / (Ls·k·Tsys), rate = (Pr/N0) / required Eb/N0 (incl. margin).
 * Defaults: 25 W transmitter, 8.4 GHz, DSN 34 m dish, 25 K system noise, 5 dB required.
 */
export function downlinkKbps(dishM: number, distanceAu: number, txW = 25, dsnM = 34): number {
  const lambda = 299792458 / 8.4e9
  const gain = (d: number, eff: number) => eff * ((Math.PI * d) / lambda) ** 2
  const d = distanceAu * AU_KM * 1000
  const spaceLoss = ((4 * Math.PI * d) / lambda) ** 2
  const prN0 = (txW * gain(dishM, 0.55) * gain(dsnM, 0.6)) / spaceLoss / (1.380649e-23 * 25)
  return prN0 / 10 ** (5 / 10) / 1000
}
