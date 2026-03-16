/**
 * Naismith's Rule walk time estimator
 *
 * Base rule: 5 km/hr horizontal + 1 minute per 10m of ascent
 * Condition modifiers (multiplicative) slow the hiker down:
 *   - Wind > 50 kph  → × 0.75  (25% slower)
 *   - Wind > 40 kph  → × 0.85  (15% slower)
 *   - Rain > 3 mm    → × 0.90  (10% slower)
 *   - Snow / sleet   → × 0.70  (30% slower)
 *
 * All modifiers that apply are stacked multiplicatively.
 */

/**
 * Calculate estimated one-way walk time to summit.
 *
 * @param distanceKm  Horizontal distance in kilometres
 * @param ascentM     Total ascent in metres
 * @param windKph     Current wind speed (kph) — optional
 * @param precipMm    Precipitation (mm) — optional
 * @param hasSnow     Whether precipitation is snow or sleet — optional
 * @returns Estimated walk time in decimal hours
 */
export function calculateWalkTime(
  distanceKm: number,
  ascentM: number,
  windKph?: number,
  precipMm?: number,
  hasSnow?: boolean
): number {
  // Naismith base: hours for horizontal travel + hours for ascent
  const horizontalHours = distanceKm / 5
  const ascentHours = ascentM / 600 // 1 min per 10 m == 600 m/hr

  const baseHours = horizontalHours + ascentHours

  // Condition modifiers — applied multiplicatively (each slows pace)
  let modifier = 1.0

  // Snow/sleet is the most penalising — check before wind so both can stack
  if (hasSnow) {
    modifier *= 0.70
  }

  // Wind — only one wind band applies (take the stronger one)
  if (windKph !== undefined) {
    if (windKph > 50) {
      modifier *= 0.75
    } else if (windKph > 40) {
      modifier *= 0.85
    }
  }

  // Rain — independent of wind, stacks
  if (precipMm !== undefined && precipMm > 3) {
    modifier *= 0.90
  }

  // modifier < 1 means slower; divide base hours by modifier
  // e.g. modifier 0.75 → trip takes 1/0.75 = 1.33× as long
  return baseHours / modifier
}

/**
 * Format a decimal hour value as a human-readable string.
 * e.g. 3.333 → "3h 20min"
 */
export function formatWalkTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60

  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Add walkHours to a "HH:MM" start time string and return the resulting time.
 *
 * @param startTime  Start time in "HH:MM" format (24-hour)
 * @param walkHours  Walk duration in decimal hours
 * @returns Estimated arrival time as "HH:MM" string
 */
export function estimateArrivalTime(startTime: string, walkHours: number): string {
  const [hourStr, minuteStr] = startTime.split(':')
  const startMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10)
  const totalMinutes = startMinutes + Math.round(walkHours * 60)

  // Wrap at midnight (1440 minutes)
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
