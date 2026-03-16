import { useState, useMemo } from 'react'
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { calculateWalkTime, formatWalkTime, estimateArrivalTime } from '@/utils/naismith'
import { calculateSunTimes } from '@/utils/photography'
import type { DailyForecast, Location, WeatherPeriod } from '@/types'

interface WalkTimeEstimatorProps {
  forecasts: DailyForecast[]
  location: Location
}

/**
 * Map a period_type to a rough "midpoint hour" of the day used to determine
 * which forecast period the hiker is likely at the summit.
 *   AM    → 09:00 (midpoint ~9h)
 *   PM    → 14:00 (midpoint ~14h)
 *   night → 21:00 (midpoint ~21h)
 */
function periodMidpointHour(period_type: WeatherPeriod['period_type']): number {
  switch (period_type) {
    case 'am': return 9
    case 'pm': return 14
    case 'night': return 21
    default: return 12
  }
}

function periodLabel(period_type: WeatherPeriod['period_type']): string {
  switch (period_type) {
    case 'am': return 'AM'
    case 'pm': return 'PM'
    case 'night': return 'Night'
    default: return period_type
  }
}

/** Parse "HH:MM" into total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Format a Date as "HH:MM" */
function formatDate(d: Date): string {
  return d.toTimeString().slice(0, 5)
}

export function WalkTimeEstimator({ forecasts, location }: WalkTimeEstimatorProps) {
  const [distanceKm, setDistanceKm] = useState(8)
  const [ascentM, setAscentM] = useState(600)
  const [startTime, setStartTime] = useState('09:00')
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  const selectedDay = forecasts[selectedDayIndex]

  // Pick the period that best overlaps with summit arrival
  const summaryConditions = useMemo(() => {
    if (!selectedDay) return null

    const windKph = selectedDay.periods[0]?.wind_speed_kph
    const precipMm = selectedDay.summary.total_precipitation_mm
    const hasSnow = selectedDay.periods.some(
      (p) => p.precipitation_type === 'snow' || p.precipitation_type === 'sleet'
    )
    return { windKph, precipMm, hasSnow }
  }, [selectedDay])

  const walkHours = useMemo(() => {
    if (!summaryConditions) return 0
    return calculateWalkTime(
      distanceKm,
      ascentM,
      summaryConditions.windKph,
      summaryConditions.precipMm,
      summaryConditions.hasSnow
    )
  }, [distanceKm, ascentM, summaryConditions])

  const summitTime = useMemo(() => estimateArrivalTime(startTime, walkHours), [startTime, walkHours])
  const returnTime = useMemo(() => estimateArrivalTime(startTime, walkHours * 2), [startTime, walkHours])

  // Which forecast period is the hiker at the summit?
  const summitPeriod = useMemo((): WeatherPeriod | null => {
    if (!selectedDay) return null
    const summitMinutes = toMinutes(summitTime)
    const summitHour = summitMinutes / 60

    // Find the period whose midpoint hour is closest to the summit hour
    let best: WeatherPeriod | null = null
    let bestDiff = Infinity
    for (const p of selectedDay.periods) {
      const midHour = periodMidpointHour(p.period_type)
      const diff = Math.abs(midHour - summitHour)
      if (diff < bestDiff) {
        bestDiff = diff
        best = p
      }
    }
    return best
  }, [selectedDay, summitTime])

  // Sunset calculation for the selected forecast day
  const sunTimes = useMemo(() => {
    if (!selectedDay) return null
    const date = new Date(selectedDay.date)
    return calculateSunTimes(date, location.latitude, location.longitude)
  }, [selectedDay, location])

  const sunsetTime = sunTimes ? formatDate(sunTimes.sunset) : null

  // Warnings
  const returnMinutes = toMinutes(returnTime)
  const lateReturn = returnMinutes > 18 * 60 // after 18:00
  const afterSunset = sunsetTime ? returnMinutes > toMinutes(sunsetTime) : false
  const poorSummitConditions = summitPeriod !== null && summitPeriod.hiking_score < 4

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <section className="fade-in-up">
      <h2 className="section-title flex items-center gap-2 mb-3">
        <ClockIcon className="w-5 h-5 text-emerald-400" />
        Walk Time Estimator
      </h2>

      <div className="card">
        {/* Day selector tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Select forecast day">
          {forecasts.map((day, index) => {
            const date = new Date(day.date)
            const label = index === 0
              ? 'Today'
              : date.toLocaleDateString('en-GB', { weekday: 'short' })
            const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const isSelected = selectedDayIndex === index

            return (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/50'
                )}
              >
                <div className="text-xs font-semibold">{label}</div>
                <div className="text-xs opacity-70 mt-0.5">{dateStr}</div>
              </button>
            )
          })}
        </div>

        {/* Two-column layout: inputs left, results right */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* --- Inputs --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Route details
            </h3>

            {/* Distance */}
            <div>
              <label
                htmlFor="wte-distance"
                className="block text-sm text-slate-400 mb-1"
              >
                Distance (km)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="wte-distance"
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-500"
                  aria-valuemin={1}
                  aria-valuemax={30}
                  aria-valuenow={distanceKm}
                />
                <span className="text-slate-200 font-medium mono-nums w-14 text-right">
                  {distanceKm.toFixed(1)} km
                </span>
              </div>
            </div>

            {/* Ascent */}
            <div>
              <label
                htmlFor="wte-ascent"
                className="block text-sm text-slate-400 mb-1"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="w-4 h-4" aria-hidden="true" />
                  Ascent (m)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="wte-ascent"
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={ascentM}
                  onChange={(e) => setAscentM(parseInt(e.target.value, 10))}
                  className="flex-1 accent-emerald-500"
                  aria-valuemin={50}
                  aria-valuemax={2000}
                  aria-valuenow={ascentM}
                />
                <span className="text-slate-200 font-medium mono-nums w-14 text-right">
                  {ascentM}m
                </span>
              </div>
            </div>

            {/* Start time */}
            <div>
              <label
                htmlFor="wte-start"
                className="block text-sm text-slate-400 mb-1"
              >
                Start time
              </label>
              <input
                id="wte-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-sm mono-nums',
                  'bg-slate-800 border border-slate-700/60 text-slate-200',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                  '[color-scheme:dark]'
                )}
              />
            </div>

            {/* Condition modifiers applied note */}
            {summaryConditions && (
              <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 space-y-1 border border-slate-700/40">
                <p className="font-medium text-slate-400 mb-1.5">Conditions applied from forecast</p>
                <div className="flex justify-between">
                  <span>Wind</span>
                  <span className={cn(
                    'mono-nums',
                    summaryConditions.windKph !== undefined && summaryConditions.windKph > 40
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  )}>
                    {summaryConditions.windKph !== undefined ? `${Math.round(summaryConditions.windKph)} kph` : '—'}
                    {summaryConditions.windKph !== undefined && summaryConditions.windKph > 50 && ' (−25%)'}
                    {summaryConditions.windKph !== undefined && summaryConditions.windKph > 40 && summaryConditions.windKph <= 50 && ' (−15%)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Precipitation</span>
                  <span className={cn(
                    'mono-nums',
                    summaryConditions.precipMm > 3 ? 'text-blue-400' : 'text-slate-400'
                  )}>
                    {summaryConditions.precipMm.toFixed(1)} mm
                    {summaryConditions.precipMm > 3 && ' (−10%)'}
                  </span>
                </div>
                {summaryConditions.hasSnow && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Snow/sleet</span>
                    <span>(−30%)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- Results --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Estimates
            </h3>

            {/* Time breakdown */}
            <div className="space-y-2">
              <ResultRow
                label="Walk time (one way)"
                value={formatWalkTime(walkHours)}
                valueClass="text-emerald-400 font-semibold"
              />
              <ResultRow
                label="Summit arrival"
                value={summitTime}
                valueClass="text-slate-100 font-semibold mono-nums"
              />
              <ResultRow
                label="Return time (est.)"
                value={returnTime}
                valueClass={cn(
                  'font-semibold mono-nums',
                  lateReturn || afterSunset ? 'text-amber-400' : 'text-slate-100'
                )}
              />
              {sunsetTime && (
                <ResultRow
                  label={
                    <span className="flex items-center gap-1">
                      <SunIcon className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                      Sunset
                    </span>
                  }
                  value={sunsetTime}
                  valueClass="text-amber-400 mono-nums"
                />
              )}
            </div>

            {/* Summit period highlight */}
            {summitPeriod && (
              <div className="rounded-xl border border-slate-600/50 bg-slate-800/60 p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Conditions at summit —{' '}
                  <span className="text-slate-300">{periodLabel(summitPeriod.period_type)}</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Wind</div>
                    <div className={cn(
                      'font-medium mono-nums',
                      summitPeriod.wind_speed_kph > 50 ? 'text-red-400' :
                      summitPeriod.wind_speed_kph > 30 ? 'text-amber-400' : 'text-slate-200'
                    )}>
                      {Math.round(summitPeriod.wind_speed_kph)} kph
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Rain</div>
                    <div className={cn(
                      'font-medium mono-nums',
                      summitPeriod.precipitation_mm > 3 ? 'text-blue-400' : 'text-slate-200'
                    )}>
                      {summitPeriod.precipitation_mm.toFixed(1)} mm
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Score</div>
                    <div className={cn('font-bold text-base mono-nums', scoreColor(summitPeriod.hiking_score))}>
                      {summitPeriod.hiking_score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            <div className="space-y-2">
              {poorSummitConditions && summitPeriod && (
                <WarningBanner
                  variant="danger"
                  message={`Poor conditions at estimated summit time — score ${summitPeriod.hiking_score.toFixed(1)}/10`}
                />
              )}
              {afterSunset && sunsetTime && (
                <WarningBanner
                  variant="amber"
                  message={`Return after sunset (${sunsetTime}) — carry a head torch`}
                />
              )}
              {lateReturn && !afterSunset && (
                <WarningBanner
                  variant="amber"
                  message="Late return — consider an early start"
                />
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-5 pt-4 border-t border-slate-700/50">
          Based on Naismith's Rule (5 km/hr + 1 min per 10m ascent) with weather modifiers.
          Times are estimates — always allow extra time for terrain and breaks.
        </p>
      </div>
    </section>
  )
}

/** Small helper to render a labelled result row */
function ResultRow({
  label,
  value,
  valueClass,
}: {
  label: React.ReactNode
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={cn('text-slate-200', valueClass)}>{value}</span>
    </div>
  )
}

/** Inline warning banner */
function WarningBanner({ variant, message }: { variant: 'amber' | 'danger'; message: string }) {
  const classes =
    variant === 'danger'
      ? 'border-red-600/40 bg-red-900/20 text-red-300'
      : 'border-amber-600/40 bg-amber-900/20 text-amber-300'

  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', classes)}>
      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
