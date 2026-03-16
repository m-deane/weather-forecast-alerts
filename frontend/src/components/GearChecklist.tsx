import { useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@/utils/cn'
import type { Location, DailyForecast } from '@/types'

interface GearChecklistProps {
  location: Location
  forecasts: DailyForecast[]
}

interface GearItem {
  id: string
  label: string
  reason?: string
}

function deriveGear(day: DailyForecast, location: Location): {
  alwaysEssential: GearItem[]
  weatherDependent: GearItem[]
  recommended: GearItem[]
} {
  const { summary, periods } = day
  const hasSnowOrSleet = periods.some(
    (p) => p.precipitation_type === 'snow' || p.precipitation_type === 'sleet'
  )

  const alwaysEssential: GearItem[] = [
    { id: 'map', label: 'Map', reason: 'Essential navigation' },
    { id: 'compass', label: 'Compass', reason: 'Essential navigation' },
    { id: 'first_aid', label: 'First aid kit', reason: 'Always carry on a mountain' },
    ...(location.elevation_m > 800
      ? [{ id: 'shelter', label: 'Emergency shelter', reason: `Summit at ${location.elevation_m}m` }]
      : []),
    { id: 'water', label: 'Plenty of water', reason: 'Stay hydrated' },
  ]

  const weatherDependent: GearItem[] = []

  if (summary.total_precipitation_mm > 2) {
    weatherDependent.push({
      id: 'waterproofs',
      label: 'Waterproofs (jacket + trousers)',
      reason: `${summary.total_precipitation_mm.toFixed(1)}mm rain forecast`,
    })
  }

  if (summary.min_temp_c < -2 || hasSnowOrSleet) {
    weatherDependent.push({
      id: 'crampons',
      label: 'Crampons',
      reason:
        summary.min_temp_c < -2
          ? `Min temp ${summary.min_temp_c}°C`
          : 'Snow/sleet expected',
    })
    weatherDependent.push({
      id: 'ice_axe',
      label: 'Ice axe',
      reason:
        summary.min_temp_c < -2
          ? `Min temp ${summary.min_temp_c}°C`
          : 'Snow/sleet expected',
    })
  }

  if (summary.min_temp_c < 5) {
    weatherDependent.push({
      id: 'warm_base',
      label: 'Warm base layer',
      reason: `Min temp ${summary.min_temp_c}°C`,
    })
  }

  if (summary.min_temp_c < 0) {
    weatherDependent.push({
      id: 'extra_warm',
      label: 'Extra warm layer',
      reason: `Min temp ${summary.min_temp_c}°C — sub-zero`,
    })
  }

  const recommended: GearItem[] = []

  if (location.elevation_m > 900) {
    recommended.push({
      id: 'headtorch',
      label: 'Headtorch',
      reason: `Summit at ${location.elevation_m}m`,
    })
  }

  if (summary.max_temp_c > 12 && summary.total_precipitation_mm <= 2) {
    recommended.push({
      id: 'sun_protection',
      label: 'Sun protection (sunscreen + sunglasses)',
      reason: `Max temp ${summary.max_temp_c}°C, clear conditions`,
    })
  }

  return { alwaysEssential, weatherDependent, recommended }
}

function GearSection({
  title,
  items,
  checked,
  onToggle,
  emptyMessage,
}: {
  title: string
  items: GearItem[]
  checked: Set<string>
  onToggle: (id: string) => void
  emptyMessage?: string
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 italic">{emptyMessage ?? 'None required'}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const isChecked = checked.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    'w-full flex items-start gap-3 text-left rounded-lg px-3 py-2.5 transition-all',
                    'border focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800',
                    isChecked
                      ? 'bg-emerald-900/20 border-emerald-700/40'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/70'
                  )}
                  aria-pressed={isChecked}
                  aria-label={`${isChecked ? 'Uncheck' : 'Check'} ${item.label}`}
                >
                  {isChecked ? (
                    <CheckCircleIconSolid className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium block',
                        isChecked ? 'line-through text-slate-500' : 'text-slate-200'
                      )}
                    >
                      {item.label}
                    </span>
                    {item.reason && (
                      <span className="text-xs text-slate-500 block mt-0.5">{item.reason}</span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function GearChecklist({ location, forecasts }: GearChecklistProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [checkedItems, setCheckedItems] = useState<Record<number, Set<string>>>({})

  if (!forecasts || forecasts.length === 0) return null

  const day = forecasts[selectedDayIndex]
  const currentChecked = checkedItems[selectedDayIndex] ?? new Set<string>()

  const { alwaysEssential, weatherDependent, recommended } = deriveGear(day, location)

  function handleToggle(id: string) {
    setCheckedItems((prev) => {
      const existing = prev[selectedDayIndex] ?? new Set<string>()
      const updated = new Set(existing)
      if (updated.has(id)) {
        updated.delete(id)
      } else {
        updated.add(id)
      }
      return { ...prev, [selectedDayIndex]: updated }
    })
  }

  const allItems = [...alwaysEssential, ...weatherDependent, ...recommended]
  const totalChecked = allItems.filter((item) => currentChecked.has(item.id)).length
  const totalItems = allItems.length

  return (
    <section className="fade-in-up">
      <h2 className="section-title flex items-center gap-2 mb-3">
        <CheckCircleIcon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        Gear Checklist
      </h2>
      <div className="card">
        {/* Day selector tabs */}
        <div
          role="tablist"
          aria-label="Select forecast day"
          className="flex gap-1.5 flex-wrap mb-4"
        >
          {forecasts.map((forecastDay, index) => {
            const date = new Date(forecastDay.date)
            const label =
              index === 0
                ? 'Today'
                : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <button
                key={forecastDay.date}
                type="button"
                role="tab"
                aria-selected={selectedDayIndex === index}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  selectedDayIndex === index
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-500">
            {totalChecked} of {totalItems} items packed
          </p>
          {totalChecked === totalItems && totalItems > 0 && (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-900/30 border border-emerald-700/50 px-2 py-0.5 rounded-full">
              All packed!
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full bg-slate-700/50 rounded-full h-1.5 mb-5"
          role="progressbar"
          aria-valuenow={totalChecked}
          aria-valuemin={0}
          aria-valuemax={totalItems}
          aria-label="Packing progress"
        >
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: totalItems > 0 ? `${(totalChecked / totalItems) * 100}%` : '0%' }}
          />
        </div>

        {/* Gear sections */}
        <div className="space-y-5">
          <GearSection
            title="Always Essential"
            items={alwaysEssential}
            checked={currentChecked}
            onToggle={handleToggle}
          />
          <GearSection
            title="Weather Dependent"
            items={weatherDependent}
            checked={currentChecked}
            onToggle={handleToggle}
            emptyMessage="No additional weather-specific gear required"
          />
          <GearSection
            title="Recommended"
            items={recommended}
            checked={currentChecked}
            onToggle={handleToggle}
            emptyMessage="No additional recommendations"
          />
        </div>
      </div>
    </section>
  )
}
