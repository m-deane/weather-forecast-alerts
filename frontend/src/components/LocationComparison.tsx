import { useQuery } from '@tanstack/react-query'
import { weatherApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { LoadingSkeleton } from './LoadingSkeleton'
import { cn } from '@/utils/cn'
import { 
  formatTemperature, 
  formatWindSpeed, 
  getHikingScoreColor,
  formatPrecipitation 
} from '@/utils/weather'
import { 
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface LocationComparisonProps {
  locationIds: string[]
  onLocationRemove?: (locationId: string) => void
  onLocationAdd?: () => void
  maxLocations?: number
}

export function LocationComparison({ 
  locationIds, 
  onLocationRemove, 
  onLocationAdd,
  maxLocations = 3 
}: LocationComparisonProps) {
  const { preferences } = useAppStore()

  const { data: forecasts, isLoading } = useQuery({
    queryKey: ['weather', 'compare', locationIds],
    queryFn: () => weatherApi.compareLocations(locationIds),
    enabled: locationIds.length > 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton count={locationIds.length} height={120} />
      </div>
    )
  }

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="text-center py-8 fade-in">
        <p className="text-slate-500">No locations to compare</p>
      </div>
    )
  }

  // Find the best location based on hiking scores
  const bestLocation = forecasts.reduce((best, current) => {
    const bestScore = best.forecasts[0]?.periods[0]?.hiking_score || 0
    const currentScore = current.forecasts[0]?.periods[0]?.hiking_score || 0
    return currentScore > bestScore ? current : best
  })

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Location Comparison</h3>
        {locationIds.length < maxLocations && onLocationAdd && (
          <button
            onClick={onLocationAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 border border-emerald-500/30 transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Comparison grid */}
      <div className="grid gap-4 stagger-children">
        {forecasts.map(forecast => {
          const location = forecast.location
          const currentPeriod = forecast.forecasts[0]?.periods[0]
          const isBest = location.id === bestLocation.location.id

          if (!currentPeriod) return null

          return (
            <div
              key={location.id}
              className={cn(
                'card relative hover-lift transition-all duration-200',
                isBest && 'ring-2 ring-emerald-500/50 bg-emerald-900/10'
              )}
            >
              {/* Remove button */}
              {onLocationRemove && (
                <button
                  onClick={() => onLocationRemove(location.id)}
                  className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}

              {/* Best location badge */}
              {isBest && (
                <div className="absolute -top-2 left-4 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium bounce-in">
                  Best Conditions
                </div>
              )}

              {/* Location info */}
              <div className="mb-3">
                <h4 className="font-semibold text-slate-100">{location.name}</h4>
                <p className="text-sm text-slate-500">
                  {location.area} • {location.elevation_m}m
                </p>
              </div>

              {/* Weather summary */}
              <div className="data-grid text-sm">
                <div className="data-cell">
                  <span className="data-cell-label">Temperature:</span>
                  <div className="data-cell-value mono-nums">
                    {formatTemperature(currentPeriod.temperature_c, preferences)}
                  </div>
                  <div className="text-xs text-slate-500 mono-nums">
                    Feels {formatTemperature(currentPeriod.feels_like_c, preferences)}
                  </div>
                </div>

                <div className="data-cell">
                  <span className="data-cell-label">Wind:</span>
                  <div className="data-cell-value mono-nums">
                    {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentPeriod.wind_direction || 'Variable'}
                  </div>
                </div>

                <div className="data-cell">
                  <span className="data-cell-label">Precipitation:</span>
                  <div className="data-cell-value mono-nums">
                    {formatPrecipitation(currentPeriod.precipitation_mm)}
                  </div>
                </div>

                <div className="data-cell">
                  <span className="data-cell-label">Hiking Score:</span>
                  <div className={cn('font-semibold text-lg mono-nums', getHikingScoreColor(currentPeriod.hiking_score))}>
                    {currentPeriod.hiking_score}/10
                  </div>
                </div>
              </div>

              {/* Weather description */}
              <div className="mt-3 p-2 bg-slate-700/30 rounded-lg text-sm text-slate-300">
                {currentPeriod.weather_description}
              </div>

              {/* Risk level */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Risk Level:</span>
                <span className={cn(
                  'px-2 py-1 text-xs rounded-full font-medium border',
                  currentPeriod.risk_level === 'low' && 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50',
                  currentPeriod.risk_level === 'moderate' && 'bg-amber-900/30 text-amber-400 border-amber-700/50',
                  currentPeriod.risk_level === 'high' && 'bg-orange-900/30 text-orange-400 border-orange-700/50',
                  currentPeriod.risk_level === 'extreme' && 'bg-red-900/30 text-red-400 border-red-700/50'
                )}>
                  {currentPeriod.risk_level}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {forecasts.length > 1 && (
        <div className="card bg-emerald-900/20 border-emerald-700/30 fade-in-up">
          <h4 className="font-medium text-emerald-400 mb-3">Comparison Summary</h4>
          <div className="text-sm text-emerald-200 space-y-2">
            <p className="flex items-center gap-2">
              <span className="data-pill data-pill-positive">Best</span>
              <span>{bestLocation.location.name}</span>
              <span className="text-emerald-300 mono-nums">
                (Score: {bestLocation.forecasts[0]?.periods[0]?.hiking_score}/10)
              </span>
            </p>

            <div className="flex items-center gap-2">
              <span className="text-emerald-300">Temperature range:</span>
              <span className="mono-nums">
                {Math.min(...forecasts.map(f => f.forecasts[0]?.periods[0]?.temperature_c || 0))}°C
                {' to '}
                {Math.max(...forecasts.map(f => f.forecasts[0]?.periods[0]?.temperature_c || 0))}°C
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-emerald-300">Wind range:</span>
              <span className="mono-nums">
                {Math.min(...forecasts.map(f => f.forecasts[0]?.periods[0]?.wind_speed_kph || 0))}
                {' to '}
                {Math.max(...forecasts.map(f => f.forecasts[0]?.periods[0]?.wind_speed_kph || 0))} kph
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}