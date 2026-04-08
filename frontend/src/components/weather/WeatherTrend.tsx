import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import type { DailyForecast } from '@/types'

interface WeatherTrendProps {
  forecasts: DailyForecast[]
  className?: string
}

type TrendDirection = 'improving' | 'deteriorating' | 'stable'

interface DayGroup {
  dayLabel: string
  periods: { label: string; score: number }[]
  bestScore: number
}

function getDirection(groups: DayGroup[]): { direction: TrendDirection; summary: string } {
  if (groups.length < 2) return { direction: 'stable', summary: 'Insufficient data' }

  const firstBest = groups[0].bestScore
  const lastBest = groups[groups.length - 1].bestScore
  const change = lastBest - firstBest

  const overallBest = groups.reduce((best, g) =>
    g.bestScore > best.bestScore ? g : best, groups[0])

  if (change > 1.5) return {
    direction: 'improving',
    summary: `Improving — best: ${overallBest.dayLabel} (${overallBest.bestScore.toFixed(1)}/10)`
  }
  if (change < -1.5) return {
    direction: 'deteriorating',
    summary: 'Worsening — current conditions may be best window'
  }
  return {
    direction: 'stable',
    summary: `Stable — scores around ${firstBest.toFixed(1)}/10`
  }
}

function scoreColor(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 5) return 'bg-amber-500'
  if (score >= 3) return 'bg-orange-500'
  return 'bg-red-500'
}

function scoreBgTrack(score: number): string {
  if (score >= 7) return 'bg-emerald-500/10'
  if (score >= 5) return 'bg-amber-500/10'
  if (score >= 3) return 'bg-orange-500/10'
  return 'bg-red-500/10'
}

function scoreTextColor(score: number): string {
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  if (score >= 3) return 'text-orange-400'
  return 'text-red-400'
}

const periodLabels: Record<string, string> = { am: 'AM', pm: 'PM', night: 'Nt' }

const dirConfig = {
  improving:    { label: 'Improving',     cls: 'text-emerald-400', icon: ArrowTrendingUpIcon },
  deteriorating:{ label: 'Deteriorating', cls: 'text-orange-400',  icon: ArrowTrendingDownIcon },
  stable:       { label: 'Stable',        cls: 'text-slate-400',   icon: MinusIcon },
} as const

export function WeatherTrend({ forecasts, className }: WeatherTrendProps) {
  const groups = useMemo<DayGroup[]>(() => {
    return forecasts.slice(0, 6).map((day, i) => {
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })
      const periods = day.periods.map(p => ({
        label: periodLabels[p.period_type || ''] || p.period_type || '?',
        score: p.hiking_score,
      }))
      return {
        dayLabel,
        periods,
        bestScore: Math.max(...periods.map(p => p.score), 0),
      }
    })
  }, [forecasts])

  const { direction, summary } = useMemo(() => getDirection(groups), [groups])
  const cfg = dirConfig[direction]
  const Icon = cfg.icon

  if (groups.length === 0) return null

  return (
    <div className={cn('bg-slate-800/60 border border-slate-700/50 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', cfg.cls)} />
          <span className="text-sm font-medium text-slate-300">6-Day Trend</span>
        </div>
        <span className={cn('text-xs font-semibold uppercase tracking-wide', cfg.cls)}>
          {cfg.label}
        </span>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {groups.map((group, gi) => (
          <div key={gi} className="bg-slate-900/40 rounded-lg p-2.5">
            {/* Day header + best score */}
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{group.dayLabel}</span>
              <span className={cn('text-sm font-bold tabular-nums', scoreTextColor(group.bestScore))}>
                {group.bestScore.toFixed(1)}
              </span>
            </div>

            {/* Period bars */}
            <div className="space-y-1.5">
              {group.periods.map((p, pi) => (
                <div key={pi} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-5 shrink-0">{p.label}</span>
                  <div className={cn('flex-1 h-2 rounded-full overflow-hidden', scoreBgTrack(p.score))}>
                    <div
                      className={cn('h-full rounded-full transition-all', scoreColor(p.score))}
                      style={{ width: `${Math.max(p.score * 10, 3)}%` }}
                    />
                  </div>
                  <span className={cn('text-[10px] tabular-nums w-6 text-right', scoreTextColor(p.score))}>
                    {p.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-400 mt-3">{summary}</p>
    </div>
  )
}
