import { useState } from 'react'
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
      <div className="text-center py-8">
        <p className="text-gray-500">No locations to compare</p>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Location Comparison</h3>
        {locationIds.length < maxLocations && onLocationAdd && (
          <button
            onClick={onLocationAdd}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
          >
            <PlusIcon className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Comparison grid */}
      <div className="grid gap-4">
        {forecasts.map(forecast => {
          const location = forecast.location
          const currentPeriod = forecast.forecasts[0]?.periods[0]
          const isBest = location.id === bestLocation.location.id
          
          if (!currentPeriod) return null

          return (
            <div
              key={location.id}
              className={cn(
                'card relative',
                isBest && 'ring-2 ring-success-500 bg-success-50'
              )}
            >
              {/* Remove button */}
              {onLocationRemove && (
                <button
                  onClick={() => onLocationRemove(location.id)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}

              {/* Best location badge */}
              {isBest && (
                <div className="absolute -top-2 left-4 bg-success-500 text-white text-xs px-2 py-1 rounded-full">
                  Best Conditions
                </div>
              )}

              {/* Location info */}
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900">{location.name}</h4>
                <p className="text-sm text-gray-500">
                  {location.area} • {location.elevation_m}m
                </p>
              </div>

              {/* Weather summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <div className="font-medium">
                    {formatTemperature(currentPeriod.temperature_c, preferences)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Feels {formatTemperature(currentPeriod.feels_like_c, preferences)}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">Wind:</span>
                  <div className="font-medium">
                    {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {currentPeriod.wind_direction || 'Variable'}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">Precipitation:</span>
                  <div className="font-medium">
                    {formatPrecipitation(currentPeriod.precipitation_mm)}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">Hiking Score:</span>
                  <div className={cn('font-semibold text-lg', getHikingScoreColor(currentPeriod.hiking_score))}>
                    {currentPeriod.hiking_score}/10
                  </div>
                </div>
              </div>

              {/* Weather description */}
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                {currentPeriod.weather_description}
              </div>

              {/* Risk level */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Risk Level:</span>
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
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {forecasts.length > 1 && (
        <div className="card bg-primary-50 border-primary-200">
          <h4 className="font-medium text-primary-900 mb-2">Comparison Summary</h4>
          <div className="text-sm text-primary-800 space-y-1">
            <p>
              <strong>Best conditions:</strong> {bestLocation.location.name} 
              (Score: {bestLocation.forecasts[0]?.periods[0]?.hiking_score}/10)
            </p>
            
            <div className="mt-2">
              <strong>Temperature range:</strong>{' '}
              {Math.min(...forecasts.map(f => f.forecasts[0]?.periods[0]?.temperature_c || 0))}°C 
              {' to '}
              {Math.max(...forecasts.map(f => f.forecasts[0]?.periods[0]?.temperature_c || 0))}°C
            </div>
            
            <div>
              <strong>Wind range:</strong>{' '}
              {Math.min(...forecasts.map(f => f.forecasts[0]?.periods[0]?.wind_speed_kph || 0))} 
              {' to '}
              {Math.max(...forecasts.map(f => f.forecasts[0]?.periods[0]?.wind_speed_kph || 0))} kph
            </div>
          </div>
        </div>
      )}
    </div>
  )
}