import { describe, it, expect } from 'vitest'
import { getUpcomingWeekends, pickWeekendDays } from '@/utils/weekend'
import type { DailyForecast } from '@/types'

// Build a local-midnight Date so getDay()/getDate() reflect the intended
// calendar day regardless of the test runner's timezone.
function localDate(y: number, m: number, d: number, hour = 12): Date {
  return new Date(y, m - 1, d, hour)
}

// Minimal DailyForecast fixture — only the fields the weekend helpers read.
function forecastForDate(date: string, score: number | null = 7): DailyForecast {
  return {
    date,
    periods: [],
    summary: {
      max_temp_c: 10,
      min_temp_c: 2,
      total_precipitation_mm: 0,
      max_wind_speed_kph: 15,
      overall_hiking_score: score,
      best_period: 'am',
    },
  }
}

describe('getUpcomingWeekends', () => {
  it('mid-week (Wednesday) → this weekend is the upcoming Sat/Sun', () => {
    // 2026-06-17 is a Wednesday.
    const now = localDate(2026, 6, 17)
    expect(now.getDay()).toBe(3) // sanity: Wednesday

    const [thisW, afterW] = getUpcomingWeekends(now)

    expect(thisW.label).toBe('This weekend')
    expect(thisW.satKey).toBe('2026-06-20') // Saturday
    expect(thisW.sunKey).toBe('2026-06-21') // Sunday
    expect(thisW.sat.getDay()).toBe(6)
    expect(thisW.sun.getDay()).toBe(0)

    expect(afterW.label).toBe('Weekend after')
    expect(afterW.satKey).toBe('2026-06-27')
    expect(afterW.sunKey).toBe('2026-06-28')
  })

  it('Monday → this weekend is the same calendar-week Sat/Sun', () => {
    // 2026-06-15 is a Monday.
    const now = localDate(2026, 6, 15)
    expect(now.getDay()).toBe(1)

    const [thisW, afterW] = getUpcomingWeekends(now)
    expect(thisW.satKey).toBe('2026-06-20')
    expect(thisW.sunKey).toBe('2026-06-21')
    expect(afterW.satKey).toBe('2026-06-27')
    expect(afterW.sunKey).toBe('2026-06-28')
  })

  it('on a Saturday → uses the CURRENT weekend (today + tomorrow)', () => {
    // 2026-06-20 is a Saturday.
    const now = localDate(2026, 6, 20)
    expect(now.getDay()).toBe(6)

    const [thisW, afterW] = getUpcomingWeekends(now)
    expect(thisW.satKey).toBe('2026-06-20') // today
    expect(thisW.sunKey).toBe('2026-06-21') // tomorrow
    expect(afterW.satKey).toBe('2026-06-27')
    expect(afterW.sunKey).toBe('2026-06-28')
  })

  it('on a Sunday → uses the CURRENT weekend (yesterday + today)', () => {
    // 2026-06-21 is a Sunday.
    const now = localDate(2026, 6, 21)
    expect(now.getDay()).toBe(0)

    const [thisW, afterW] = getUpcomingWeekends(now)
    expect(thisW.satKey).toBe('2026-06-20') // yesterday
    expect(thisW.sunKey).toBe('2026-06-21') // today
    expect(afterW.satKey).toBe('2026-06-27')
    expect(afterW.sunKey).toBe('2026-06-28')
  })

  it('rolls correctly across a month boundary', () => {
    // 2026-06-30 is a Tuesday; next Saturday is 2026-07-04.
    const now = localDate(2026, 6, 30)
    expect(now.getDay()).toBe(2)

    const [thisW, afterW] = getUpcomingWeekends(now)
    expect(thisW.satKey).toBe('2026-07-04')
    expect(thisW.sunKey).toBe('2026-07-05')
    expect(afterW.satKey).toBe('2026-07-11')
    expect(afterW.sunKey).toBe('2026-07-12')
  })

  it('Sunday at a month boundary stays on the current (cross-month) weekend', () => {
    // 2026-08-02 is a Sunday; its Saturday is 2026-08-01 (same month here),
    // but verify the step-back-one logic holds at the boundary.
    const now = localDate(2026, 8, 2)
    expect(now.getDay()).toBe(0)
    const [thisW] = getUpcomingWeekends(now)
    expect(thisW.satKey).toBe('2026-08-01')
    expect(thisW.sunKey).toBe('2026-08-02')
  })
})

describe('pickWeekendDays', () => {
  const now = localDate(2026, 6, 17) // Wednesday
  const [thisW, afterW] = getUpcomingWeekends(now)

  it('matches Sat and Sun forecasts within range', () => {
    const forecasts = [
      forecastForDate('2026-06-18', 6),
      forecastForDate('2026-06-19', 5),
      forecastForDate('2026-06-20', 8), // Saturday
      forecastForDate('2026-06-21', 7), // Sunday
    ]
    const { sat, sun } = pickWeekendDays(forecasts, thisW)
    expect(sat?.date).toBe('2026-06-20')
    expect(sun?.date).toBe('2026-06-21')
    expect(sat?.summary.overall_hiking_score).toBe(8)
    expect(sun?.summary.overall_hiking_score).toBe(7)
  })

  it('returns nulls for an out-of-range weekend (the honest empty state)', () => {
    // Forecasts only cover this weekend; the weekend-after is beyond range.
    const forecasts = [
      forecastForDate('2026-06-20', 8),
      forecastForDate('2026-06-21', 7),
    ]
    const { sat, sun } = pickWeekendDays(forecasts, afterW)
    expect(sat).toBeNull()
    expect(sun).toBeNull()
  })

  it('handles a partial weekend (only Saturday present)', () => {
    const forecasts = [forecastForDate('2026-06-20', 8)]
    const { sat, sun } = pickWeekendDays(forecasts, thisW)
    expect(sat?.date).toBe('2026-06-20')
    expect(sun).toBeNull()
  })

  it('parses ISO datetime date fields, not just plain dates', () => {
    const forecasts = [
      forecastForDate('2026-06-20T00:00:00', 9),
      forecastForDate('2026-06-21T00:00:00', 6),
    ]
    const { sat, sun } = pickWeekendDays(forecasts, thisW)
    expect(sat?.summary.overall_hiking_score).toBe(9)
    expect(sun?.summary.overall_hiking_score).toBe(6)
  })

  it('returns nulls when forecasts is empty or undefined', () => {
    expect(pickWeekendDays([], thisW)).toEqual({ sat: null, sun: null })
    expect(pickWeekendDays(undefined, thisW)).toEqual({ sat: null, sun: null })
  })
})
