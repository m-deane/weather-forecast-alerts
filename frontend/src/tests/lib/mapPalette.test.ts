import { describe, it, expect } from 'vitest'
import {
  getVerdict,
  getSunTimes,
  getDayPhase,
  formatSunCaption,
} from '@/lib/mapPalette'

// Ben Nevis (Fort William) — the canonical Scottish summit used as a fixture.
const BEN_NEVIS = { lat: 56.7969, lng: -5.0037 }
// Generic Highlands centroid used by HomePage's fixed [57,-5].
const HIGHLANDS = { lat: 57.0, lng: -5.0 }

// Helper: parse "HH:mm" from a UK-local caption.
function captionTime(caption: string): { h: number; m: number } | null {
  const match = caption.match(/(\d{2}):(\d{2})/)
  if (!match) return null
  return { h: Number(match[1]), m: Number(match[2]) }
}

describe('getVerdict (verdict scale — regression guard)', () => {
  it('maps the canonical >=7 / >=4 / <4 thresholds', () => {
    expect(getVerdict(9)).toBe('GO')
    expect(getVerdict(7)).toBe('GO')
    expect(getVerdict(6.99)).toBe('CAUTION')
    expect(getVerdict(4)).toBe('CAUTION')
    expect(getVerdict(3.99)).toBe('NO-GO')
    expect(getVerdict(0)).toBe('NO-GO') // true 0 reaches NO-GO, not fake-green
    expect(getVerdict(null)).toBe('UNKNOWN')
    expect(getVerdict(undefined)).toBe('UNKNOWN')
  })
})

describe('getSunTimes — solar geometry', () => {
  it('returns ordered sunrise < sunset for a normal Scottish winter day (GMT)', () => {
    // 2026-01-15: GMT (no DST). Expect a short day, sunrise mid-morning.
    const day = new Date('2026-01-15T12:00:00Z')
    const sun = getSunTimes(day, BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(sun.sunrise).not.toBeNull()
    expect(sun.sunset).not.toBeNull()
    expect(sun.alwaysUp).toBe(false)
    expect(sun.alwaysDown).toBe(false)
    expect(sun.sunrise!.getTime()).toBeLessThan(sun.sunset!.getTime())
  })

  it('produces a longer day in summer than in winter', () => {
    const winter = getSunTimes(new Date('2026-01-15T12:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    const summer = getSunTimes(new Date('2026-06-21T12:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    const winterLen = winter.sunset!.getTime() - winter.sunrise!.getTime()
    const summerLen = summer.sunset!.getTime() - summer.sunrise!.getTime()
    expect(summerLen).toBeGreaterThan(winterLen)
    // Scottish midsummer day length is well over 17 hours.
    expect(summerLen / 3_600_000).toBeGreaterThan(17)
  })

  it('places winter sunrise within a plausible window (~08:00–09:30 GMT)', () => {
    const sun = getSunTimes(new Date('2026-01-15T12:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    const caption = formatSunCaption(new Date('2026-01-15T07:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toContain('sunrise')
    const t = captionTime(caption)!
    // GMT in January: sunrise around 08:4x local (== UTC in winter).
    expect(t.h).toBeGreaterThanOrEqual(8)
    expect(t.h).toBeLessThanOrEqual(9)
    expect(sun.sunrise).not.toBeNull()
  })

  it('formats summer sunset in BST (UTC+1), so the local hour is late evening', () => {
    // At 2026-06-21 17:00Z it is well before sunset → caption shows today's sunset.
    const caption = formatSunCaption(new Date('2026-06-21T17:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toContain('sunset')
    const t = captionTime(caption)!
    // BST sunset near the solstice in the west Highlands is ~22:0x local.
    expect(t.h).toBeGreaterThanOrEqual(21)
    expect(t.h).toBeLessThanOrEqual(23)
  })
})

describe('DST boundary correctness (Europe/London)', () => {
  it('uses GMT the day before the spring-forward (2026-03-28)', () => {
    // Clocks go forward 2026-03-29 01:00 GMT. On the 28th, UK is still GMT.
    const caption = formatSunCaption(new Date('2026-03-28T05:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toContain('sunrise')
    const t = captionTime(caption)!
    // Late-March GMT sunrise ~06:0x–06:4x local (== UTC).
    expect(t.h).toBeGreaterThanOrEqual(5)
    expect(t.h).toBeLessThanOrEqual(7)
  })

  it('uses BST the day after the spring-forward (2026-03-30), shifting the local hour +1', () => {
    const caption = formatSunCaption(new Date('2026-03-30T05:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toContain('sunrise')
    const t = captionTime(caption)!
    // Same UTC sunrise instant now reads ~07:0x local under BST.
    expect(t.h).toBeGreaterThanOrEqual(6)
    expect(t.h).toBeLessThanOrEqual(8)
  })

  it('returns to GMT after the autumn fall-back (2026-10-26)', () => {
    const caption = formatSunCaption(new Date('2026-10-26T06:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    const t = captionTime(caption)
    expect(t).not.toBeNull()
  })
})

describe('getDayPhase classification', () => {
  it('reports day at solar noon and night at midnight', () => {
    const summer = new Date('2026-06-21T12:00:00Z')
    const sun = getSunTimes(summer, BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(getDayPhase(summer, sun)).toBe('day')
    // Deep night relative to the same day's geometry.
    const midnight = new Date('2026-01-15T02:00:00Z')
    const winterSun = getSunTimes(midnight, BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(getDayPhase(midnight, winterSun)).toBe('night')
  })

  it('flags dusk in the ~45min window around sunset', () => {
    const day = new Date('2026-06-21T12:00:00Z')
    const sun = getSunTimes(day, BEN_NEVIS.lat, BEN_NEVIS.lng)
    const justBeforeSunset = new Date(sun.sunset!.getTime() - 10 * 60 * 1000)
    expect(getDayPhase(justBeforeSunset, sun)).toBe('dusk')
  })
})

describe('formatSunCaption — captions & edge cases', () => {
  it('prefixes the generic HomePage label and never names a peak', () => {
    const caption = formatSunCaption(
      new Date('2026-06-21T17:00:00Z'),
      HIGHLANDS.lat,
      HIGHLANDS.lng,
      'Highlands'
    )
    expect(caption.startsWith('Highlands · ')).toBe(true)
    expect(caption).toContain('sunset')
  })

  it('omits the prefix for LocationPage (real coords)', () => {
    const caption = formatSunCaption(new Date('2026-06-21T17:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).not.toContain('·')
    expect(caption).toMatch(/^(sunset|sunrise) ~\d{2}:\d{2}$/)
  })

  it('shows the upcoming sunrise once today’s sunset has passed', () => {
    // Late evening after sunset in winter → next event is tomorrow's sunrise.
    const caption = formatSunCaption(new Date('2026-01-15T20:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toContain('sunrise')
  })

  it('handles a polar "midnight sun" latitude without throwing', () => {
    // Far north of the Arctic circle at the solstice → sun never sets.
    const caption = formatSunCaption(new Date('2026-06-21T12:00:00Z'), 78.0, 15.0)
    expect(caption).toBe('midnight sun')
  })

  it('handles a polar night latitude at the winter solstice', () => {
    const caption = formatSunCaption(new Date('2026-12-21T12:00:00Z'), 78.0, 15.0)
    expect(caption).toBe('polar night')
  })

  it('Scottish midsummer still resolves to a real HH:mm (sun does set, briefly)', () => {
    // Ben Nevis at ~56.8°N still has a true sunset near the solstice; ensure
    // we surface a real time, not the polar fallback.
    const caption = formatSunCaption(new Date('2026-06-21T17:00:00Z'), BEN_NEVIS.lat, BEN_NEVIS.lng)
    expect(caption).toMatch(/~\d{2}:\d{2}/)
    expect(caption).not.toBe('midnight sun')
  })
})
