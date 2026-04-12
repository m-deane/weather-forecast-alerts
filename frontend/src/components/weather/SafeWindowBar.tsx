import { cn } from '@/utils/cn'
import type { WeatherPeriod } from '@/types'

interface SafeWindowBarProps {
  periods: WeatherPeriod[]
  className?: string
}

const periodLabels: Record<string, string> = {
  am: 'Morning',
  pm: 'Afternoon',
  night: 'Night',
  current: 'Now',
}

function getScoreColor(score: number): {
  bg: string
  text: string
  label: string
} {
  if (score >= 7) {
    return { bg: 'bg-emerald-500', text: 'text-white', label: 'Safe' }
  }
  if (score >= 5) {
    return { bg: 'bg-amber-500', text: 'text-white', label: 'Caution' }
  }
  if (score >= 3) {
    return { bg: 'bg-orange-500', text: 'text-white', label: 'Poor' }
  }
  return { bg: 'bg-red-500', text: 'text-white', label: 'Dangerous' }
}

export function SafeWindowBar({ periods, className }: SafeWindowBarProps) {
  if (!periods || periods.length === 0) return null

  return (
    <div className={cn('w-full', className)}>
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
        Safe Window
      </h3>

      {/* Color-coded bar */}
      <div className="flex h-10 rounded-lg overflow-hidden border border-slate-700/50">
        {periods.map((period, index) => {
          const color = getScoreColor(period.hiking_score)
          const isFirst = index === 0
          const isLast = index === periods.length - 1

          return (
            <div
              key={period.period_type}
              className={cn(
                'flex-1 flex items-center justify-center relative transition-all',
                color.bg,
                color.text,
                !isLast && 'border-r border-white/20',
                isFirst && 'rounded-l-lg',
                isLast && 'rounded-r-lg'
              )}
              title={`${periodLabels[period.period_type] || period.period_type}: Score ${period.hiking_score.toFixed(1)}`}
            >
              <span className="font-bold text-sm drop-shadow-sm">
                {period.hiking_score.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Period labels below */}
      <div className="flex mt-1.5">
        {periods.map((period) => (
          <div
            key={period.period_type}
            className="flex-1 text-center text-xs text-slate-400"
          >
            {periodLabels[period.period_type] || period.period_type}
          </div>
        ))}
      </div>
    </div>
  )
}
