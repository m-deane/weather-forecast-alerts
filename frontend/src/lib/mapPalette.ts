// Single source of truth for the hiking-safety verdict scale.
//
// Every consumer (map markers, map legend, map popup pill, the GoNoGoSummary
// verdict table) must route through getVerdict + these token/glyph maps so the
// scale can never silently desync on a safety key.
//
// Threshold contract (canonical — matches GoNoGoSummary's intended scale):
//   null / undefined -> UNKNOWN   (never fabricate a safety verdict)
//   score >= 7       -> GO
//   score >= 4       -> CAUTION
//   score <  4       -> NO-GO     (a true 0 correctly reaches NO-GO)

export type Verdict = 'GO' | 'CAUTION' | 'NO-GO' | 'UNKNOWN'

export function getVerdict(score?: number | null): Verdict {
  if (score === null || score === undefined) return 'UNKNOWN'
  if (score >= 7) return 'GO'
  if (score >= 4) return 'CAUTION'
  return 'NO-GO' // score < 4 — and a true 0 now correctly reaches NO-GO
}

// Fill colour per verdict (hue channel). Traffic-light hexes kept maximally
// separable; NO-GO red is never desaturated.
export const VERDICT_TOKEN: Record<Verdict, string> = {
  GO: '#22c55e',
  CAUTION: '#f59e0b',
  'NO-GO': '#ef4444',
  UNKNOWN: '#64748b',
}

// Greyscale-safe / colour-blind-safe glyph per verdict (the non-hue channel).
// UNKNOWN carries no glyph — it is a hollow stroke-only pin.
export const VERDICT_GLYPH: Record<Verdict, string> = {
  GO: '✓',
  CAUTION: '!',
  'NO-GO': '✕',
  UNKNOWN: '',
}

// ===========================================================================
// Honest day-phase geometry (Phase 5, PATTERNS C5)
//
// The ONLY honestly-derivable atmosphere signal from a Location is solar
// geometry: lat/lng are non-optional real fields, so sunrise/sunset are a true
// fact about the place, never a fabricated weather reading. Nothing below ever
// touches a mock weather field (visibility_m / cloud_base_m / freezing_level_m
// are None/random in the deployed backend and must never feed atmosphere).
//
// Implementation is the standard NOAA solar-position algorithm, returning UTC
// instants. Local-time FORMATTING is delegated to Intl.DateTimeFormat with the
// Europe/London zone so GMT/BST and the DST transitions are correct without
// bundling a timezone library. Pure + DOM-free so the math is unit-testable.
// ===========================================================================

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk'

export interface SunTimes {
  /** Sunrise instant (UTC), or null when the sun does not rise (polar/midsummer). */
  sunrise: Date | null
  /** Sunset instant (UTC), or null when the sun does not set (midsummer "never fully dark"). */
  sunset: Date | null
  /** True when the sun is continuously above the horizon for the whole day. */
  alwaysUp: boolean
  /** True when the sun is continuously below the horizon for the whole day. */
  alwaysDown: boolean
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

// Julian day for a given UTC date (date-only granularity is sufficient here).
function toJulian(date: Date): number {
  return date.getTime() / 86_400_000 - 0.5 + 2440588
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - 2440588) * 86_400_000)
}

/**
 * Sunrise / sunset (UTC) for a coordinate on the given date, using the standard
 * solar-elevation = -0.833° (official sunrise) geometry. Returns nulls plus the
 * alwaysUp/alwaysDown flags for the polar edge cases (Scotland in midsummer can
 * legitimately have no true "sunset" — civil twilight all night).
 */
export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const j = toJulian(date)
  const n = Math.round(j - 2451545.0 + 0.0008) // days since J2000, with leap-second nudge
  const Jstar = n - lng / 360 // mean solar noon
  const M = (357.5291 + 0.98560028 * Jstar) % 360 // solar mean anomaly (deg)
  const Mrad = M * DEG
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad)
  const lambda = (M + C + 180 + 102.9372) % 360 // ecliptic longitude (deg)
  const lambdaRad = lambda * DEG
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad)
  const delta = Math.asin(Math.sin(lambdaRad) * Math.sin(23.4397 * DEG)) // sun declination (rad)

  const latRad = lat * DEG
  const h0 = -0.833 * DEG // sun centre at horizon incl. refraction
  const cosOmega =
    (Math.sin(h0) - Math.sin(latRad) * Math.sin(delta)) / (Math.cos(latRad) * Math.cos(delta))

  if (cosOmega < -1) {
    // Hour angle has no solution: sun never sets this day.
    return { sunrise: null, sunset: null, alwaysUp: true, alwaysDown: false }
  }
  if (cosOmega > 1) {
    // Sun never rises this day.
    return { sunrise: null, sunset: null, alwaysUp: false, alwaysDown: true }
  }

  const omega = Math.acos(cosOmega) * RAD // hour angle (deg)
  const Jset = Jtransit + omega / 360
  const Jrise = Jtransit - omega / 360

  return {
    sunrise: fromJulian(Jrise),
    sunset: fromJulian(Jset),
    alwaysUp: false,
    alwaysDown: false,
  }
}

/**
 * Classify the current moment into a coarse day phase from the day's sun times.
 * `dawn`/`dusk` are the ~45-minute windows around sunrise/sunset; otherwise
 * day or night. Honest: derived purely from solar geometry, no weather input.
 */
export function getDayPhase(now: Date, sun: SunTimes): DayPhase {
  if (sun.alwaysUp) return 'day'
  if (sun.alwaysDown) return 'night'
  if (!sun.sunrise || !sun.sunset) return 'day'

  const TWILIGHT_MS = 45 * 60 * 1000
  const t = now.getTime()
  const rise = sun.sunrise.getTime()
  const set = sun.sunset.getTime()

  if (t >= rise - TWILIGHT_MS && t < rise + TWILIGHT_MS) return 'dawn'
  if (t >= set - TWILIGHT_MS && t < set + TWILIGHT_MS) return 'dusk'
  if (t >= rise && t < set) return 'day'
  return 'night'
}

// Format a UTC instant as HH:mm in UK local time (Europe/London → GMT or BST,
// DST-correct via the platform tz database; no library needed).
function formatUkTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
  }).format(d)
}

/**
 * Build the honest day-phase caption shown in the map's glass HUD.
 *
 * - On LocationPage (real summit coords) the caption names the next solar event
 *   for THIS place, e.g. "sunset ~21:47" / "sunrise ~04:38".
 * - On HomePage the caller passes a generic prefix ("Highlands") and fixed
 *   [57,-5] coords, so it reads "Highlands · sunset ~21:47" — never as a named
 *   peak's time.
 * - Midsummer "never fully dark": no sunset solution → "midnight sun" wording.
 *
 * @param prefix optional generic place label (HomePage passes "Highlands").
 */
export function formatSunCaption(
  now: Date,
  lat: number,
  lng: number,
  prefix?: string
): string {
  const sun = getSunTimes(now, lat, lng)
  const lead = prefix ? `${prefix} · ` : ''

  if (sun.alwaysUp || (!sun.sunset && !sun.alwaysDown)) {
    return `${lead}midnight sun`
  }
  if (sun.alwaysDown || (!sun.sunrise && !sun.sunset)) {
    return `${lead}polar night`
  }

  const phase = getDayPhase(now, sun)
  // Before today's sunset and after sunrise → the next event is sunset; else
  // surface the upcoming sunrise (using tomorrow's if today's has passed).
  if (phase === 'night' && sun.sunrise && now.getTime() < sun.sunrise.getTime()) {
    return `${lead}sunrise ~${formatUkTime(sun.sunrise)}`
  }
  if (sun.sunset && now.getTime() < sun.sunset.getTime()) {
    return `${lead}sunset ~${formatUkTime(sun.sunset)}`
  }
  // After today's sunset → show tomorrow's sunrise.
  const tomorrow = new Date(now.getTime() + 86_400_000)
  const sunTomorrow = getSunTimes(tomorrow, lat, lng)
  if (sunTomorrow.sunrise) {
    return `${lead}sunrise ~${formatUkTime(sunTomorrow.sunrise)}`
  }
  // Fallback (should be unreachable for Scottish latitudes): today's sunset.
  return sun.sunset ? `${lead}sunset ~${formatUkTime(sun.sunset)}` : lead.trim()
}
