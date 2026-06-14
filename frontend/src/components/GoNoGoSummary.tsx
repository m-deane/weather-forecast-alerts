import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { cn } from '@/utils/cn'
import type { DailyForecast } from '@/types'

interface GoNoGoSummaryProps {
  forecasts: DailyForecast[]
}

type Verdict = 'go' | 'caution' | 'no-go'

function getVerdict(score: number): Verdict {
  if (score >= 7) return 'go'
  if (score >= 4) return 'caution'
  return 'no-go'
}

function getReason(day: DailyForecast): string {
  const { max_wind_speed_kph, total_precipitation_mm, min_temp_c, overall_hiking_score } = day.summary

  if (max_wind_speed_kph > 50) return 'Strong winds forecast'
  if (total_precipitation_mm > 5) return 'Heavy rain/snow forecast'
  if (min_temp_c < -5) return 'Severe cold — winter conditions'
  if (overall_hiking_score >= 7) return 'Good conditions throughout'
  return 'Marginal conditions — check periods'
}

function formatDate(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const verdictConfig = {
  'go': {
    label: 'GO',
    icon: CheckCircleIcon,
    cardClass: 'border-emerald-500/40 bg-emerald-900/20',
    badgeClass: 'bg-emerald-500 text-white',
    dateClass: 'text-emerald-400',
    reasonClass: 'text-emerald-300/80',
    stripClass: 'bg-emerald-500',
  },
  'caution': {
    label: 'CAUTION',
    icon: ExclamationTriangleIcon,
    cardClass: 'border-amber-500/40 bg-amber-900/20',
    badgeClass: 'bg-amber-500 text-white',
    dateClass: 'text-amber-400',
    reasonClass: 'text-amber-300/80',
    stripClass: 'bg-amber-500',
  },
  'no-go': {
    label: 'NO GO',
    icon: XCircleIcon,
    cardClass: 'border-red-500/40 bg-red-900/20',
    badgeClass: 'bg-red-500 text-white',
    dateClass: 'text-red-400',
    reasonClass: 'text-red-300/80',
    stripClass: 'bg-red-500',
  },
}

export function GoNoGoSummary({ forecasts }: GoNoGoSummaryProps) {
  const days = forecasts.slice(0, 3)

  if (days.length === 0) return null

  return (
    <section className="fade-in-up" aria-label="Go/No-Go daily verdict">
      <h2 className="section-title mb-3">Should You Go?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {days.map((day, index) => {
          const verdict = getVerdict(day.summary.overall_hiking_score)
          const reason = getReason(day)
          const config = verdictConfig[verdict]
          const Icon = config.icon
          const dateLabel = formatDate(day.date, index === 0)

          return (
            <div
              key={day.date}
              className={cn(
                'relative overflow-hidden rounded-xl border px-4 py-3 flex items-center gap-3',
                config.cardClass
              )}
            >
              {/* Left colour strip */}
              <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', config.stripClass)} />

              <div className="pl-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn('text-sm font-semibold mono-nums', config.dateClass)}>
                    {dateLabel}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide flex-shrink-0',
                      config.badgeClass
                    )}
                    aria-label={`Verdict: ${config.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {config.label}
                  </span>
                </div>
                <p className={cn('text-xs leading-snug truncate', config.reasonClass)}>
                  {reason}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
