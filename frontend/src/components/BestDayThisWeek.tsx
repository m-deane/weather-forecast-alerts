import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDaysIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { locationApi, weatherApi } from '@/api/client'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { cn } from '@/utils/cn'
import type { WeatherForecast } from '@/types'

const INITIAL_VISIBLE = 10

/** Returns a formatted day label, e.g. "Thu 12 Mar", from an ISO date string. */
function formatBestDay(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Returns colour + label metadata for a hiking score. */
function scoreVariant(score: number): {
  barColor: string
  textColor: string
  badgeBg: string
  badgeText: string
  label: string
} {
  if (score >= 7) {
    return {
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-400',
      label: 'Excellent',
    }
  }
  if (score >= 5) {
    return {
      barColor: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      label: 'Good',
    }
  }
  if (score >= 3) {
    return {
      barColor: 'bg-orange-500',
      textColor: 'text-orange-400',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      label: 'Challenging',
    }
  }
  return {
    barColor: 'bg-red-500',
    textColor: 'text-red-400',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    label: 'Dangerous',
  }
}

/** Returns the Tailwind dot colour class for a sparkline dot. */
function sparkDotColor(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 5) return 'bg-yellow-400'
  if (score >= 3) return 'bg-orange-400'
  return 'bg-red-500'
}

interface AreaBestDay {
  areaName: string
  locationId: string
  locationName: string
  bestDayLabel: string
  bestScore: number
  todayScore: number
  allDayScores: number[]         // 6 daily scores in date order
  bestDayConditions: string      // dominant_conditions from best day summary
}

/** Given all weather forecasts, derive the best day per area, sorted best-first. */
function deriveBestDaysPerArea(allWeather: WeatherForecast[]): AreaBestDay[] {
  const areaMap = new Map<string, AreaBestDay>()

  for (const weather of allWeather) {
    const { location, forecasts } = weather
    const area = location.area
    if (!area || !forecasts || forecasts.length === 0) continue

    // Collect all-day scores (up to 6 days)
    const allDayScores = forecasts
      .slice(0, 6)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((day: any) => (day.summary?.overall_hiking_score as number) ?? 0)

    const todayScore = allDayScores[0] ?? 0

    let locationBestScore = 0
    let locationBestDate = ''
    let locationBestConditions = ''

    for (const day of forecasts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const daySummary = day.summary as any
      const dayScore: number = daySummary?.overall_hiking_score ?? 0
      if (dayScore > locationBestScore) {
        locationBestScore = dayScore
        locationBestDate = day.date
        locationBestConditions = (daySummary?.dominant_conditions as string) ?? ''
      }
    }

    if (locationBestScore === 0) continue

    const existing = areaMap.get(area)
    if (!existing || locationBestScore > existing.bestScore) {
      areaMap.set(area, {
        areaName: area,
        locationId: location.id,
        locationName: location.name,
        bestDayLabel: formatBestDay(locationBestDate),
        bestScore: locationBestScore,
        todayScore,
        allDayScores,
        bestDayConditions: locationBestConditions,
      })
    }
  }

  return Array.from(areaMap.values()).sort((a, b) => b.bestScore - a.bestScore)
}

// ---------------------------------------------------------------------------
// Mini sparkline — 6 dots showing day-by-day score trend
// ---------------------------------------------------------------------------

interface SparklineProps {
  scores: number[]
}

function Sparkline({ scores }: SparklineProps) {
  if (scores.length === 0) return null
  return (
    <div
      className="hidden sm:flex items-end gap-0.5 h-4 flex-shrink-0"
      aria-hidden="true"
      title="Score trend over 6 days"
    >
      {scores.slice(0, 6).map((score, i) => {
        const heightPct = Math.max(10, Math.round((score / 10) * 100))
        return (
          <div
            key={i}
            className={cn('w-1.5 rounded-sm opacity-90', sparkDotColor(score))}
            style={{ height: `${heightPct}%` }}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface RankedRowProps {
  area: AreaBestDay
  rank: number
}

function RankedRow({ area, rank }: RankedRowProps) {
  const bestVariant = scoreVariant(area.bestScore)
  const todayVariant = scoreVariant(area.todayScore)
  const barWidthPct = Math.round((area.bestScore / 10) * 100)

  // Truncate conditions to 20 chars
  const conditionLabel = area.bestDayConditions
    ? area.bestDayConditions.length > 20
      ? area.bestDayConditions.slice(0, 20).trimEnd() + '…'
      : area.bestDayConditions
    : null

  return (
    <Link
      to={`/location/${area.locationId}`}
      aria-label={`${area.areaName}: today ${area.todayScore.toFixed(1)}, best day ${area.bestDayLabel} score ${area.bestScore.toFixed(1)} out of 10`}
      className={cn(
        'group flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-lg',
        'transition-colors duration-200',
        'hover:bg-slate-700/50'
      )}
    >
      {/* Rank number */}
      <span
        className="w-6 text-right text-sm font-medium text-slate-500 flex-shrink-0 mono-nums"
        aria-hidden="true"
      >
        {rank}
      </span>

      {/* Area name + best day label + conditions */}
      <div className="flex-1 min-w-0">
        <span className="block font-semibold text-white leading-tight truncate group-hover:text-emerald-400 transition-colors duration-200">
          {area.areaName}
        </span>
        <span className="block text-xs text-slate-400 mt-0.5 truncate">
          {area.bestDayLabel}
          {conditionLabel && (
            <span className="text-slate-500"> · {conditionLabel}</span>
          )}
        </span>
      </div>

      {/* Sparkline */}
      <Sparkline scores={area.allDayScores} />

      {/* Score bar */}
      <div
        className="hidden sm:flex items-center gap-2 flex-shrink-0"
        aria-hidden="true"
      >
        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', bestVariant.barColor)}
            style={{ width: `${barWidthPct}%` }}
          />
        </div>
      </div>

      {/* Today score + Best score */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Today score — only show if it differs meaningfully from best */}
        <div className="hidden md:flex flex-col items-end mono-nums">
          <span className="text-xs text-slate-500 leading-none mb-0.5">Today</span>
          <span className={cn('text-sm font-semibold leading-none', todayVariant.textColor)}>
            {area.todayScore.toFixed(1)}
          </span>
        </div>

        {/* Separator */}
        <span className="hidden md:block text-slate-700 text-sm" aria-hidden="true">→</span>

        {/* Best score */}
        <div className="flex flex-col items-end mono-nums">
          <span className="text-xs text-slate-500 leading-none mb-0.5">Best</span>
          <div className="flex items-baseline gap-0.5">
            <span className={cn('font-bold text-base leading-none', bestVariant.textColor)}>
              {area.bestScore.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>
      </div>

      {/* Condition badge */}
      <span
        className={cn(
          'hidden xs:inline-flex flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
          bestVariant.badgeBg,
          bestVariant.badgeText
        )}
      >
        {bestVariant.label}
      </span>

      {/* Hover chevron */}
      <ChevronDownIcon
        className="w-4 h-4 text-slate-600 -rotate-90 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-hidden="true"
      />
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-3 sm:gap-4 px-4 py-3"
      style={{ animationDelay: `${index * 40}ms` }}
      aria-hidden="true"
    >
      <LoadingSkeleton width={20} height={14} className="flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <LoadingSkeleton height={14} className="rounded w-2/5" />
        <LoadingSkeleton height={11} className="rounded w-1/4" />
      </div>
      <LoadingSkeleton width={96} height={6} className="hidden sm:block rounded-full flex-shrink-0" />
      <LoadingSkeleton width={44} height={18} className="rounded flex-shrink-0" />
      <LoadingSkeleton width={64} height={20} className="rounded-full flex-shrink-0" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anticyclone callout banner
// ---------------------------------------------------------------------------

interface AnticycloneBannerProps {
  areas: AreaBestDay[]
}

function AnticycloneBanner({ areas }: AnticycloneBannerProps) {
  if (areas.length < 3) return null

  // Check if all areas share the same best day label
  const firstLabel = areas[0].bestDayLabel
  const allSameDay = areas.every(a => a.bestDayLabel === firstLabel)
  if (!allSameDay) return null

  // Check if scores don't vary too wildly (all ≥ 7 = everyone's excellent)
  const allExcellent = areas.every(a => a.bestScore >= 7)
  if (!allExcellent) return null

  return (
    <div
      role="note"
      aria-label={`Anticyclone window: most areas excellent on ${firstLabel}`}
      className={cn(
        'mx-4 mb-3 px-3 py-2 rounded-lg',
        'bg-emerald-500/10 border border-emerald-500/20',
        'flex items-center gap-2'
      )}
    >
      <span className="text-emerald-400 text-sm font-medium">
        Anticyclone window:
      </span>
      <span className="text-emerald-300/80 text-sm">
        Most areas excellent on {firstLabel}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface BestDayThisWeekProps {
  className?: string
  style?: React.CSSProperties
}

export function BestDayThisWeek({ className, style }: BestDayThisWeekProps) {
  const [showAll, setShowAll] = useState(false)

  // Reuse the same query keys as BestConditionsToday so no extra network requests are made.
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', 'all'],
    queryFn: () => locationApi.search(''),
  })

  const locationIds = useMemo(() => locations?.map(l => l.id) || [], [locations])

  const { data: allWeather, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather', 'compare', locationIds.join(',')],
    queryFn: () => weatherApi.compareLocations(locationIds),
    enabled: locationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const areaBestDays = useMemo(() => {
    if (!allWeather) return []
    return deriveBestDaysPerArea(allWeather)
  }, [allWeather])

  const isLoading = locationsLoading || weatherLoading

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className={cn('space-y-1', className)} style={style}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <CalendarDaysIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <h2 className="section-title !mb-0">Best Day This Week</h2>
          </div>
        </div>
        {/* Skeleton rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    )
  }

  if (areaBestDays.length === 0) {
    return null
  }

  const visibleAreas = showAll ? areaBestDays : areaBestDays.slice(0, INITIAL_VISIBLE)
  const hiddenCount = areaBestDays.length - INITIAL_VISIBLE

  return (
    <section className={cn('fade-in-up', className)} style={style}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 mb-2">
        <CalendarDaysIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <h2 className="section-title !mb-0">Best Day This Week</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Best scoring day across the 6-day forecast, per area
          </p>
        </div>
      </div>

      {/* Anticyclone callout — only renders when all areas share an excellent best day */}
      <AnticycloneBanner areas={areaBestDays} />

      {/* Ranked list */}
      <ol
        role="list"
        aria-label="Areas ranked by best hiking day this week"
        className="divide-y divide-slate-800/60"
      >
        {visibleAreas.map((area, index) => (
          <li key={area.areaName} role="listitem">
            <RankedRow area={area} rank={index + 1} />
          </li>
        ))}
      </ol>

      {/* Show all / collapse toggle */}
      {areaBestDays.length > INITIAL_VISIBLE && (
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className={cn(
              'w-full text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200',
              'py-2 rounded-lg hover:bg-slate-800/50',
              'flex items-center justify-center gap-1.5'
            )}
            aria-expanded={showAll}
          >
            {showAll ? (
              <>
                <ChevronDownIcon className="w-4 h-4 rotate-180 transition-transform duration-200" aria-hidden="true" />
                Show fewer
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" aria-hidden="true" />
                Show {hiddenCount} more area{hiddenCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
