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
  getHikingScoreColor,
  getHikingScoreDescription,
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
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-600">
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

  return (
    <Link
      to={`/location/${locationId}`}
      className={cn(
        'card block hover:shadow-md transition-shadow',
        compact ? 'p-3' : 'p-4',
        hasAlerts && 'border-orange-300 bg-orange-50',
        !isSafe && 'border-red-300 bg-red-50'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
          <p className="text-sm text-gray-500">{location.area} • {location.elevation_m}m</p>
        </div>
        
        <div className="text-right ml-3">
          <div className="text-2xl font-semibold">
            {formatTemperature(currentPeriod.temperature_c, preferences)}
          </div>
          <div className="text-sm text-gray-500">
            {currentPeriod.weather_description}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Wind:</span>
          <div className="font-medium">
            {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500">Rain:</span>
          <div className="font-medium">
            {formatPrecipitation(currentPeriod.precipitation_mm)}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500">Hiking:</span>
          <div className={cn('font-semibold', getHikingScoreColor(currentPeriod.hiking_score))}>
            {currentPeriod.hiking_score}/10
          </div>
        </div>
      </div>

      {/* Status indicators */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSafe ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-xs">Good conditions</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-xs">Challenging conditions</span>
              </div>
            )}
          </div>
          
          {hasAlerts && (
            <div className="flex items-center gap-1 text-orange-600">
              <InformationCircleIcon className="w-4 h-4" />
              <span className="text-xs">{data.alerts!.length} alert{data.alerts!.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Extended details */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Feels like:</span>
            <span>{formatTemperature(currentPeriod.feels_like_c, preferences)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Wind direction:</span>
            <span>{currentPeriod.wind_direction || 'Variable'}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Risk level:</span>
            <span className={cn(
              'px-2 py-1 text-xs rounded-full font-medium',
              currentPeriod.risk_level === 'low' && 'bg-green-100 text-green-800',
              currentPeriod.risk_level === 'moderate' && 'bg-yellow-100 text-yellow-800',
              currentPeriod.risk_level === 'high' && 'bg-orange-100 text-orange-800',
              currentPeriod.risk_level === 'extreme' && 'bg-red-100 text-red-800'
            )}>
              {currentPeriod.risk_level}
            </span>
          </div>

          {currentPeriod.visibility_m && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Visibility:</span>
              <span>
                {currentPeriod.visibility_m > 10000 ? 'Excellent' :
                 currentPeriod.visibility_m > 4000 ? 'Good' :
                 currentPeriod.visibility_m > 1000 ? 'Moderate' : 'Poor'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last updated */}
      <div className="mt-3 text-xs text-gray-400">
        Updated: {new Date(data.last_updated).toLocaleTimeString()}
      </div>
    </Link>
  )
}