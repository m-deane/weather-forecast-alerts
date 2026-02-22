import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { WeatherIcon } from './WeatherIcon'
import type { DailyForecast, WeatherPeriod } from '@/types'

interface WeatherTrendProps {
  forecasts: DailyForecast[]
  className?: string
}

type TrendDirection = 'improving' | 'deteriorating' | 'stable'

interface TrendPoint {
  label: string
  score: number
  condition: string
  time: string
}

function analyzeTrend(points: TrendPoint[]): {
  direction: TrendDirection
  change: number
  bestWindow: { time: string; score: number } | null
  summary: string
} {
  if (points.length < 2) {
    return { direction: 'stable', change: 0, bestWindow: null, summary: 'Insufficient data' }
  }

  // Calculate trend
  const firstScore = points[0].score
  const lastScore = points[points.length - 1].score
  const change = lastScore - firstScore

  // Find best conditions in next 48h
  const bestPoint = points.reduce((best, point) =>
    point.score > best.score ? point : best
  , points[0])

  let direction: TrendDirection
  if (change > 1.5) direction = 'improving'
  else if (change < -1.5) direction = 'deteriorating'
  else direction = 'stable'

  // Generate summary
  let summary: string
  if (direction === 'improving') {
    summary = `Conditions improving. Best: ${bestPoint.time} (${bestPoint.score.toFixed(1)}/10)`
  } else if (direction === 'deteriorating') {
    summary = `Conditions worsening. Current may be best window.`
  } else {
    summary = `Stable conditions. Score staying around ${points[0].score.toFixed(1)}/10`
  }

  return {
    direction,
    change: Math.abs(change),
    bestWindow: bestPoint.score > firstScore ? { time: bestPoint.time, score: bestPoint.score } : null,
    summary,
  }
}

/** Convert period_type to a readable label relative to today */
function getPeriodLabel(dayIndex: number, periodType: string | undefined): string {
  const dayLabel = dayIndex === 0 ? 'Today' : dayIndex === 1 ? 'Tomorrow' : `Day ${dayIndex + 1}`

  switch (periodType) {
    case 'am': return `${dayLabel} AM`
    case 'pm': return `${dayLabel} PM`
    case 'night': return dayIndex === 0 ? 'Tonight' : `${dayLabel} Night`
    case 'current': return 'Now'
    default: return dayLabel
  }
}

const trendStyles: Record<TrendDirection, { bg: string; border: string; text: string; icon: typeof ArrowTrendingUpIcon }> = {
  improving: {
    bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    icon: ArrowTrendingUpIcon,
  },
  deteriorating: {
    bg: 'bg-gradient-to-r from-orange-500/20 to-red-500/10',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    icon: ArrowTrendingDownIcon,
  },
  stable: {
    bg: 'bg-gradient-to-r from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/40',
    text: 'text-slate-400',
    icon: MinusIcon,
  },
}

// SVG dimensions: wider to accommodate Y-axis labels on the left
const SVG_WIDTH = 180
const CHART_LEFT = 20 // left margin for Y-axis labels
const CHART_RIGHT = SVG_WIDTH - 4
const CHART_TOP = 4
const CHART_BOTTOM = 36
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP

export function WeatherTrend({ forecasts, className }: WeatherTrendProps) {
  const trendData = useMemo(() => {
    const points: TrendPoint[] = []

    forecasts.slice(0, 3).forEach((day, dayIndex) => {
      day.periods.forEach((period) => {
        const label = getPeriodLabel(dayIndex, period.period_type)

        points.push({
          label,
          score: period.hiking_score,
          condition: period.weather_description || 'cloudy',
          time: `${new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })} ${period.period_type?.toUpperCase() || ''}`,
        })
      })
    })

    return points.slice(0, 6) // Limit to 6 points
  }, [forecasts])

  const trend = useMemo(() => analyzeTrend(trendData), [trendData])
  const style = trendStyles[trend.direction]
  const TrendIcon = style.icon

  // Calculate sparkline points using new coordinate system
  const sparklinePoints = useMemo(() => {
    if (trendData.length === 0) return ''

    return trendData.map((point, i) => {
      const x = CHART_LEFT + (i / (trendData.length - 1)) * CHART_WIDTH
      const y = CHART_BOTTOM - (point.score / 10) * CHART_HEIGHT
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [trendData])

  // Score zone color bands: green (7-10), amber (4-7), red (0-4)
  const scoreBands = useMemo(() => {
    const toY = (score: number) => CHART_BOTTOM - (score / 10) * CHART_HEIGHT
    return [
      { y: toY(10), height: toY(7) - toY(10), fill: 'rgba(16, 185, 129, 0.1)' },  // Green: 7-10
      { y: toY(7), height: toY(4) - toY(7), fill: 'rgba(245, 158, 11, 0.1)' },    // Amber: 4-7
      { y: toY(4), height: toY(0) - toY(4), fill: 'rgba(239, 68, 68, 0.1)' },     // Red: 0-4
    ]
  }, [])

  return (
    <div className={cn('card', style.bg, 'border', style.border, className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <TrendIcon className={cn('w-5 h-5', style.text)} />
          Weather Trend
        </h3>
        <span className={cn('text-sm font-bold uppercase', style.text)}>
          {trend.direction}
        </span>
      </div>

      {/* Sparkline Chart */}
      <div className="relative h-12 mb-3 bg-slate-800/30 rounded-lg overflow-hidden">
        <svg className="w-full h-full" viewBox={`0 0 ${SVG_WIDTH} 40`} preserveAspectRatio="none">
          {/* Score zone color bands */}
          {scoreBands.map((band, i) => (
            <rect
              key={i}
              x={CHART_LEFT}
              y={band.y}
              width={CHART_WIDTH}
              height={band.height}
              fill={band.fill}
            />
          ))}

          {/* Grid lines */}
          <line x1={CHART_LEFT} y1={10} x2={CHART_RIGHT} y2={10} stroke="currentColor" className="text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={CHART_LEFT} y1={20} x2={CHART_RIGHT} y2={20} stroke="currentColor" className="text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={CHART_LEFT} y1={30} x2={CHART_RIGHT} y2={30} stroke="currentColor" className="text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Y-axis labels */}
          <text x={CHART_LEFT - 3} y={CHART_TOP + 3} textAnchor="end" fill="#64748b" fontSize="5" fontFamily="sans-serif">10</text>
          <text x={CHART_LEFT - 3} y={(CHART_TOP + CHART_BOTTOM) / 2 + 2} textAnchor="end" fill="#64748b" fontSize="5" fontFamily="sans-serif">5</text>
          <text x={CHART_LEFT - 3} y={CHART_BOTTOM + 2} textAnchor="end" fill="#64748b" fontSize="5" fontFamily="sans-serif">0</text>

          {/* Gradient fill under line */}
          <defs>
            <linearGradient id="trendFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={
                trend.direction === 'improving' ? '#10b981' :
                trend.direction === 'deteriorating' ? '#f97316' :
                '#64748b'
              } stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {sparklinePoints && (
            <path
              d={`${sparklinePoints} L ${CHART_RIGHT} ${CHART_BOTTOM} L ${CHART_LEFT} ${CHART_BOTTOM} Z`}
              fill="url(#trendFill)"
            />
          )}

          {/* Trend line */}
          {sparklinePoints && (
            <path
              d={sparklinePoints}
              fill="none"
              stroke={
                trend.direction === 'improving' ? '#10b981' :
                trend.direction === 'deteriorating' ? '#f97316' :
                '#64748b'
              }
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {trendData.map((point, i) => {
            const x = CHART_LEFT + (i / (trendData.length - 1)) * CHART_WIDTH
            const y = CHART_BOTTOM - (point.score / 10) * CHART_HEIGHT
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={
                  trend.direction === 'improving' ? '#10b981' :
                  trend.direction === 'deteriorating' ? '#f97316' :
                  '#64748b'
                }
                className={i === 0 ? 'animate-pulse' : ''}
              />
            )
          })}
        </svg>
      </div>

      {/* Timeline with icons */}
      <div className="flex justify-between items-end mb-3 px-1">
        {trendData.slice(0, 5).map((point, i) => (
          <div key={i} className="flex flex-col items-center">
            <WeatherIcon
              condition={point.condition}
              size="xs"
              animated={i === 0}
            />
            <div className="text-[10px] text-slate-500 mt-1">{point.label}</div>
            <div className={cn(
              'text-xs font-semibold mono-nums',
              point.score >= 7 ? 'text-emerald-400' :
              point.score >= 5 ? 'text-yellow-400' :
              point.score >= 3 ? 'text-orange-400' :
              'text-red-400'
            )}>
              {point.score.toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2">
        {trend.summary}
      </div>

      {/* Best window highlight */}
      {trend.bestWindow && trend.direction === 'improving' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1.5">
          <span>Best window: <strong>{trend.bestWindow.time}</strong> (score {trend.bestWindow.score.toFixed(1)})</span>
        </div>
      )}

      {/* Warning for deteriorating */}
      {trend.direction === 'deteriorating' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1.5">
          <span>Conditions expected to worsen - consider going earlier</span>
        </div>
      )}
    </div>
  )
}
