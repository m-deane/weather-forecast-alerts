import type { DailyForecast } from '@/types'

/**
 * Pure, deterministic weekend helpers for the home-page weekend outlook.
 *
 * Design notes:
 * - `now` is always injected so callers (and tests) control "today". Only
 *   HomePage passes `new Date()`.
 * - All date maths is done on LOCAL calendar days. We never call
 *   `new Date("2026-06-20")` on a forecast date, because that parses as UTC
 *   midnight and can shift to the previous local day in a negative timezone.
 *   Instead we extract the `YYYY-MM-DD` portion and compare strings.
 */

/** A Saturday/Sunday pair, identified by their local `YYYY-MM-DD` keys. */
export interface Weekend {
  /** Human label, e.g. "This weekend" or "Weekend after". */
  label: string
  /** Saturday as a local-midnight Date. */
  sat: Date
  /** Sunday as a local-midnight Date. */
  sun: Date
  /** Saturday's `YYYY-MM-DD` key (local). */
  satKey: string
  /** Sunday's `YYYY-MM-DD` key (local). */
  sunKey: string
}

/** Format a Date as a local `YYYY-MM-DD` key (no timezone conversion). */
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return a new Date at local midnight `days` after the given date. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/**
 * Build a Weekend descriptor from its Saturday date.
 * Sunday is always the following calendar day.
 */
function makeWeekend(label: string, sat: Date): Weekend {
  const sun = addDays(sat, 1)
  return {
    label,
    sat,
    sun,
    satKey: toLocalDateKey(sat),
    sunKey: toLocalDateKey(sun),
  }
}

/**
 * Return the two upcoming weekends relative to `now`.
 *
 * "This weekend" = the Saturday/Sunday of the current weekend:
 *   - If today is Sat or Sun, the current weekend's Saturday is used.
 *   - Otherwise it is the next upcoming Saturday.
 * "Weekend after" = exactly 7 days later.
 *
 * Times are normalised to local midnight so callers can compare calendar days.
 */
export function getUpcomingWeekends(now: Date): [Weekend, Weekend] {
  // JS: 0 = Sunday, 6 = Saturday.
  const dow = now.getDay()

  // Days from `now` to this weekend's Saturday.
  // Sunday (0) belongs to the weekend that started the day before, so step back 1.
  let daysToSaturday: number
  if (dow === 0) {
    daysToSaturday = -1 // today is Sunday → Saturday was yesterday
  } else {
    daysToSaturday = 6 - dow // Mon..Sat → forward to Saturday (Sat → 0)
  }

  const thisSaturday = addDays(now, daysToSaturday)
  const nextSaturday = addDays(thisSaturday, 7)

  return [
    makeWeekend('This weekend', thisSaturday),
    makeWeekend('Weekend after', nextSaturday),
  ]
}

/**
 * Pick the DailyForecast entries whose date falls on the weekend's Sat or Sun.
 * Returns `{ sat, sun }`; either may be `null` when that day is outside the
 * available forecast range (common — summit forecasts only run ~6-7 days).
 */
export function pickWeekendDays(
  forecasts: DailyForecast[] | undefined,
  weekend: Weekend
): { sat: DailyForecast | null; sun: DailyForecast | null } {
  if (!forecasts || forecasts.length === 0) {
    return { sat: null, sun: null }
  }

  // Compare on the local `YYYY-MM-DD` prefix of each forecast date.
  const byKey = new Map<string, DailyForecast>()
  for (const f of forecasts) {
    const key = forecastDateKey(f.date)
    if (key && !byKey.has(key)) {
      byKey.set(key, f)
    }
  }

  return {
    sat: byKey.get(weekend.satKey) ?? null,
    sun: byKey.get(weekend.sunKey) ?? null,
  }
}

/**
 * Normalise a forecast `date` value to a `YYYY-MM-DD` local key.
 * Accepts ISO date strings ("2026-06-20") and ISO datetimes
 * ("2026-06-20T00:00:00") by taking the leading date portion verbatim.
 * Returns null when the value cannot be parsed.
 */
function forecastDateKey(date: string): string | null {
  if (!date) return null
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}
