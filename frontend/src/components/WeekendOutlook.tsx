import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { getUpcomingWeekends, pickWeekendDays, type Weekend } from '@/utils/weekend'
import type { DailyForecast, WeatherForecast } from '@/types'

/** How many munros each weekend panel shows before "Show all" is clicked. */
const COLLAPSED_COUNT = 5

/** Tailwind text colour for a hiking score, matching the app-wide thresholds. */
function scoreTextClass(score: number): string {
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5) return 'text-yellow-400'
  if (score >= 3) return 'text-orange-400'
  return 'text-red-400'
}

/** Read a day's overall hiking score, or null when unavailable. */
function dayScore(day: DailyForecast | null): number | null {
  const s = day?.summary?.overall_hiking_score
  return typeof s === 'number' ? s : null
}

/** Read a short conditions label from a day summary, defensively. */
function dayConditions(day: DailyForecast | null): string | null {
  if (!day?.summary) return null
  // dominant_conditions is present on the API summary but not in the strict type.
  const summary = day.summary as { dominant_conditions?: string }
  const raw = summary.dominant_conditions
  if (!raw) return null
  return raw.length > 22 ? raw.slice(0, 22).trimEnd() + '…' : raw
}

interface FeaturedMountain {
  id: string
  name: string
  area: string
  forecasts: DailyForecast[]
}

/**
 * Map the already-fetched `allWeather` to the lightweight shape the blocks
 * render. No slicing and no new requests — each WeekendBlock decides its own
 * ordering and how many to reveal.
 */
function toFeaturedMountains(allWeather: WeatherForecast[]): FeaturedMountain[] {
  return allWeather.map(w => ({
    id: w.location.id,
    name: w.location.name,
    area: w.location.area,
    forecasts: w.forecasts,
  }))
}

/** Best of a mountain's Sat/Sun score for a given weekend, or null when neither day has a forecast. */
function weekendScore(mountain: FeaturedMountain, weekend: Weekend): number | null {
  const { sat, sun } = pickWeekendDays(mountain.forecasts, weekend)
  const scores = [dayScore(sat), dayScore(sun)].filter(
    (s): s is number => s != null
  )
  return scores.length > 0 ? Math.max(...scores) : null
}

/**
 * Order mountains for one weekend: those with a Sat/Sun forecast first, best
 * score descending; mountains with no forecast for that weekend are dropped
 * (they would only render two em-dashes and never sort meaningfully).
 */
function sortForWeekend(
  mountains: FeaturedMountain[],
  weekend: Weekend
): FeaturedMountain[] {
  return mountains
    .map(m => ({ m, score: weekendScore(m, weekend) }))
    .filter(({ score }) => score != null)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .map(({ m }) => m)
}

/** A single Sat or Sun cell — honest about missing data. */
function DayScoreCell({ label, day }: { label: string; day: DailyForecast | null }) {
  const score = dayScore(day)
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-[0.65rem] uppercase tracking-wide text-slate-500 leading-none">
        {label}
      </span>
      {score != null ? (
        <span className={cn('text-sm font-bold mono-nums leading-tight mt-0.5', scoreTextClass(score))}>
          {score.toFixed(1)}
        </span>
      ) : (
        <span className="text-sm font-medium text-slate-600 leading-tight mt-0.5" aria-label="No forecast">
          —
        </span>
      )}
    </div>
  )
}

/** A featured-mountain row inside a weekend block. */
function MountainRow({ mountain, weekend }: { mountain: FeaturedMountain; weekend: Weekend }) {
  const { sat, sun } = pickWeekendDays(mountain.forecasts, weekend)
  // Prefer the day that has conditions text; Sat first.
  const conditions = dayConditions(sat) ?? dayConditions(sun)

  return (
    <Link
      to={`/location/${mountain.id}`}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
      aria-label={`${mountain.name}, ${mountain.area}: Saturday ${dayScore(sat)?.toFixed(1) ?? 'no forecast'}, Sunday ${dayScore(sun)?.toFixed(1) ?? 'no forecast'} out of 10`}
    >
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
          {mountain.name}
        </span>
        <span className="block text-xs text-slate-500 truncate">
          {mountain.area}
          {conditions && <span className="text-slate-600"> · {conditions}</span>}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0" aria-hidden="true">
        <DayScoreCell label="Sat" day={sat} />
        <DayScoreCell label="Sun" day={sun} />
      </div>
    </Link>
  )
}

/** Honest empty state when a weekend is outside the available forecast range. */
function OutOfRange() {
  return (
    <div className="px-3 py-6 text-center">
      <p className="text-sm font-medium text-slate-400">Not yet in forecast range</p>
      <p className="text-xs text-slate-500 mt-1">
        Summit forecasts run about 6–7 days ahead. Check back closer to the weekend.
      </p>
    </div>
  )
}

/** One weekend block: header + per-mountain Sat/Sun summary, or the honest empty state. */
function WeekendBlock({
  weekend,
  featured,
  dateLabel,
}: {
  weekend: Weekend
  featured: FeaturedMountain[]
  dateLabel: string
}) {
  // Each panel manages its own collapse state, so the two expand independently.
  const [expanded, setExpanded] = useState(false)

  // Mountains with a Sat/Sun forecast for THIS weekend, best score first.
  // Memoised so resorting only happens when the pool or weekend changes.
  const sorted = useMemo(
    () => sortForWeekend(featured, weekend),
    [featured, weekend]
  )

  // A weekend is "in range" only if at least one mountain has a Sat or Sun forecast.
  const hasAnyData = sorted.length > 0
  const total = sorted.length
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const remaining = total - COLLAPSED_COUNT
  const canExpand = remaining > 0

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-3 py-2.5 border-b border-slate-800/60">
        <h3 className="text-sm font-semibold text-slate-100">{weekend.label}</h3>
        <span className="text-xs text-slate-500 mono-nums">{dateLabel}</span>
      </div>
      {hasAnyData ? (
        <>
          <div className="divide-y divide-slate-800/50">
            {visible.map(m => (
              <MountainRow key={m.id} mountain={m} weekend={weekend} />
            ))}
          </div>
          {canExpand && (
            <div className="border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Show fewer munros for ${weekend.label}`
                    : `Show all ${total} munros for ${weekend.label}`
                }
                className="w-full px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/40 transition-colors"
              >
                {expanded ? 'Show less' : `Show all ${total} munros`}
              </button>
            </div>
          )}
        </>
      ) : (
        <OutOfRange />
      )}
    </div>
  )
}

/** Format a weekend's Sat–Sun span, e.g. "21–22 Jun". */
function formatWeekendDates(weekend: Weekend): string {
  const sat = weekend.sat
  const sun = weekend.sun
  const sameMonth = sat.getMonth() === sun.getMonth()
  const month = sun.toLocaleDateString('en-GB', { month: 'short' })
  if (sameMonth) {
    return `${sat.getDate()}–${sun.getDate()} ${month}`
  }
  const satMonth = sat.toLocaleDateString('en-GB', { month: 'short' })
  return `${sat.getDate()} ${satMonth} – ${sun.getDate()} ${month}`
}

interface WeekendOutlookProps {
  /** Already-fetched weather for all locations (no extra request is made here). */
  allWeather: WeatherForecast[] | undefined
  /** Current time — only HomePage passes `new Date()`. */
  now: Date
  className?: string
  style?: React.CSSProperties
}

export function WeekendOutlook({ allWeather, now, className, style }: WeekendOutlookProps) {
  const weekends = useMemo(() => getUpcomingWeekends(now), [now])
  const featured = useMemo(
    () => (allWeather ? toFeaturedMountains(allWeather) : []),
    [allWeather]
  )

  // Nothing to show until weather data has loaded.
  if (featured.length === 0) {
    return null
  }

  return (
    <section className={cn('fade-in-up', className)} style={style}>
      <h2 className="section-title flex items-center gap-2">
        <CalendarDaysIcon className="w-5 h-5 text-emerald-400" />
        Weekend Outlook
      </h2>
      <p className="text-xs text-slate-500 -mt-2 mb-3">
        Saturday &amp; Sunday hiking scores for top mountains
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {weekends.map(weekend => (
          <WeekendBlock
            key={weekend.label}
            weekend={weekend}
            featured={featured}
            dateLabel={formatWeekendDates(weekend)}
          />
        ))}
      </div>
    </section>
  )
}
