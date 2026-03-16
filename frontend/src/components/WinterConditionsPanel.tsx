import { cn } from '@/utils/cn'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { DailyForecast } from '@/types'

interface WinterConditionsPanelProps {
  forecast: DailyForecast
}

function hasWinterConditions(forecast: DailyForecast): boolean {
  if (forecast.summary.min_temp_c < 0) return true
  return forecast.periods.some(
    (p) => p.precipitation_type === 'snow' || p.precipitation_type === 'sleet'
  )
}

function hasSnowInForecast(forecast: DailyForecast): boolean {
  return forecast.periods.some(
    (p) => p.precipitation_type === 'snow' || p.precipitation_type === 'sleet'
  )
}

// Snowflake SVG — not available in @heroicons/react/24/outline
function SnowflakeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636 5.636 18.364"
      />
    </svg>
  )
}

export function WinterConditionsPanel({ forecast }: WinterConditionsPanelProps) {
  if (!hasWinterConditions(forecast)) return null

  const { min_temp_c } = forecast.summary
  const snowPresent = hasSnowInForecast(forecast)

  const cramponsRequired = min_temp_c < -2
  const iceAxeRecommended = min_temp_c < -5 || snowPresent

  // Use the representative period (pm preferred, else first) for freezing level
  const representativePeriod =
    forecast.periods.find((p) => p.period_type === 'pm') ?? forecast.periods[0]
  const freezingLevelM = representativePeriod?.freezing_level_m

  const freezingLevelDisplay =
    freezingLevelM !== undefined && freezingLevelM !== null
      ? `${freezingLevelM}m`
      : 'Data unavailable'

  const bulletItems: { text: string; highlight?: boolean }[] = [
    { text: `Freezing level: ${freezingLevelDisplay}` },
    {
      text: cramponsRequired ? 'Crampons: likely required' : 'Crampons: consider carrying',
      highlight: cramponsRequired,
    },
    {
      text: iceAxeRecommended ? 'Ice axe: recommended' : 'Ice axe: may not be needed',
      highlight: iceAxeRecommended,
    },
  ]

  return (
    <section
      className={cn(
        'rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-3 fade-in-up'
      )}
      aria-label="Winter conditions advisory"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 flex items-center gap-1.5">
          <SnowflakeIcon className="w-5 h-5 text-amber-400" />
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-amber-300 mb-2">
            Winter Conditions Advisory
          </h2>
          <ul className="space-y-1" aria-label="Winter gear checklist">
            {bulletItems.map((item) => (
              <li
                key={item.text}
                className={cn(
                  'flex items-start gap-2 text-sm',
                  item.highlight ? 'text-amber-200 font-medium' : 'text-amber-300/80'
                )}
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
