import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { weatherApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { useDataStalenessStore } from '@/stores/useDataStalenessStore'
import { cn } from '@/utils/cn'
import { LoadingSkeleton } from './LoadingSkeleton'
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  isConditionSafe
} from '@/utils/weather'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface WeatherCardProps {
  locationId: string
  compact?: boolean
  showDetails?: boolean
}

export function WeatherCard({ locationId, compact = false, showDetails = false }: WeatherCardProps) {
  const { preferences } = useAppStore()
  const setLastUpdated = useDataStalenessStore((state) => state.setLastUpdated)

  const { data, isLoading, error } = useQuery({
    queryKey: ['weather', locationId],
    queryFn: () => weatherApi.getForecast(locationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update data staleness store when weather data is loaded
  useEffect(() => {
    if (data?.last_updated) {
      setLastUpdated(data.last_updated)
    }
  }, [data?.last_updated, setLastUpdated])

  if (isLoading) {
    return <LoadingSkeleton height={compact ? 80 : 120} />
  }

  if (error || !data) {
    return (
      <div className="card border-danger-700/50 bg-danger-900/20">
        <div className="flex items-center gap-2 text-danger-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span className="text-sm">Unable to load weather data</span>
        </div>
      </div>
    )
  }

  const location = data.location
  const currentDay = data.forecasts[0]
  const currentPeriod = currentDay?.periods[0]

  if (!currentPeriod) {
    return null
  }

  const isSafe = isConditionSafe(currentPeriod, preferences.riskTolerance)
  const hasAlerts = data.alerts && data.alerts.length > 0

  // Get score-based styling
  const getScoreStyles = (score: number) => {
    if (score >= 7) return 'text-emerald-400'
    if (score >= 5) return 'text-emerald-300'
    if (score >= 3) return 'text-warning-400'
    return 'text-danger-400'
  }

  return (
    <Link
      to={`/location/${locationId}`}
      className={cn(
        'card block transition-all duration-300 group relative overflow-hidden hover-lift fade-in',
        compact ? 'p-3' : 'p-4',
        hasAlerts && 'bg-warning-900/10',
        !isSafe && !hasAlerts && 'bg-danger-900/10'
      )}
    >
      {/* Left accent bar for condition status */}
      {(hasAlerts || !isSafe) && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300 group-hover:w-1.5',
            hasAlerts ? 'bg-warning-500' : 'bg-danger-500'
          )}
        />
      )}

      {/* Hover arrow indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-300">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors duration-200">
            {location.name}
          </h3>
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200">{location.area} • {location.elevation_m}m</p>
        </div>

        <div className="text-right ml-3 mr-6">
          <div className="text-2xl font-semibold text-slate-100 group-hover:scale-105 transition-transform duration-200 origin-right mono-nums">
            {formatTemperature(currentPeriod.temperature_c, preferences)}
          </div>
          <div className="text-sm text-slate-400">
            {currentPeriod.weather_description}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-3 gap-3 text-sm stagger-children">
        <div>
          <span className="text-slate-500 data-label">Wind</span>
          <div className="font-medium text-slate-200 mono-nums">
            {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)}
          </div>
        </div>

        <div>
          <span className="text-slate-500 data-label">Rain</span>
          <div className="font-medium text-slate-200 mono-nums">
            {formatPrecipitation(currentPeriod.precipitation_mm)}
          </div>
        </div>

        <div>
          <span className="text-slate-500 data-label">Score</span>
          <div className={cn('font-semibold mono-nums', getScoreStyles(currentPeriod.hiking_score))}>
            {currentPeriod.hiking_score}/10
          </div>
        </div>
      </div>

      {/* Status indicators */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2">
            {isSafe ? (
              <span className="safety-badge safety-badge-safe">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-xs">Good conditions</span>
              </span>
            ) : (
              <span className="safety-badge safety-badge-danger">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-xs">Challenging</span>
              </span>
            )}
          </div>

          {hasAlerts && (
            <span className="safety-badge safety-badge-warning">
              <InformationCircleIcon className="w-4 h-4" />
              <span className="text-xs mono-nums">{data.alerts!.length} alert{data.alerts!.length !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      )}

      {/* Extended details */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Feels like:</span>
            <span className="text-slate-200">{formatTemperature(currentPeriod.feels_like_c, preferences)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Wind direction:</span>
            <span className="text-slate-200">{currentPeriod.wind_direction || 'Variable'}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Risk level:</span>
            <span className={cn(
              'px-2 py-1 text-xs rounded-full font-medium',
              currentPeriod.risk_level === 'low' && 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50',
              currentPeriod.risk_level === 'moderate' && 'bg-warning-900/50 text-warning-400 border border-warning-700/50',
              currentPeriod.risk_level === 'high' && 'bg-orange-900/50 text-orange-400 border border-orange-700/50',
              currentPeriod.risk_level === 'extreme' && 'bg-danger-900/50 text-danger-400 border border-danger-700/50'
            )}>
              {currentPeriod.risk_level}
            </span>
          </div>

          {currentPeriod.visibility_m && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Visibility:</span>
              <span className="text-slate-200">
                {currentPeriod.visibility_m > 10000 ? 'Excellent' :
                 currentPeriod.visibility_m > 4000 ? 'Good' :
                 currentPeriod.visibility_m > 1000 ? 'Moderate' : 'Poor'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last updated */}
      <div className="mt-3 text-xs text-slate-500">
        Updated: {new Date(data.last_updated).toLocaleTimeString()}
      </div>
    </Link>
  )
}
