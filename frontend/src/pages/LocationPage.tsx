import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeftIcon, 
  HeartIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  EyeIcon,
  SunIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { weatherApi, locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { cn } from '@/utils/cn'
import { 
  formatTemperature, 
  formatWindSpeed, 
  getHikingScoreColor,
  getHikingScoreDescription,
  getRiskLevelColor,
  formatPrecipitation,
  getVisibilityDescription,
  getCloudBaseDescription,
  getPeriodLabel,
  getWindDescription
} from '@/utils/weather'
import { CustomizableDashboard } from '@/components/CustomizableDashboard'
import { ExportWeatherData } from '@/components/ExportWeatherData'
import type { WeatherPeriod, DailyForecast } from '@/types'

export function LocationPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate = useNavigate()
  const { preferences, isFavorite, addFavorite, removeFavorite, addRecent } = useAppStore()

  // Get weather forecast
  const { data: forecast, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ['weather', locationId],
    queryFn: () => weatherApi.getForecast(locationId!),
    enabled: !!locationId,
  })

  // Add to recent on load
  React.useEffect(() => {
    if (locationId) {
      addRecent(locationId)
    }
  }, [locationId, addRecent])

  if (!locationId) {
    return <div>Location not found</div>
  }

  if (forecastLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6">
          <LoadingSkeleton height={200} />
          <div className="mt-6 space-y-4">
            <LoadingSkeleton count={3} height={120} />
          </div>
        </div>
      </div>
    )
  }

  if (forecastError || !forecast) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load forecast</h1>
          <p className="text-gray-600 mb-4">Please try again later</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const location = forecast.location
  const currentDay = forecast.forecasts[0]
  const isFav = isFavorite(locationId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-primary-500 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{location.name}</h1>
            <p className="text-primary-100 text-sm">
              {location.area} • {location.elevation_m}m • {location.classification}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => isFav ? removeFavorite(locationId) : addFavorite(locationId)}
              className="p-2 rounded-full hover:bg-primary-500 transition-colors"
            >
              {isFav ? (
                <HeartIconSolid className="w-6 h-6 text-red-400" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${location.name} Weather`,
                    url: window.location.href,
                  })
                }
              }}
              className="p-2 rounded-full hover:bg-primary-500 transition-colors"
            >
              <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Export functionality */}
        <div className="flex justify-end">
          <ExportWeatherData forecasts={forecast.forecasts} location={forecast.location} />
        </div>

        {/* Current conditions */}
        <CurrentConditionsCard day={currentDay} preferences={preferences} />

        {/* Alerts */}
        {forecast.alerts && forecast.alerts.length > 0 && (
          <div className="space-y-2">
            {forecast.alerts.map((alert, index) => (
              <AlertCard key={index} alert={alert} />
            ))}
          </div>
        )}

        {/* Daily forecasts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">6-Day Forecast</h2>
          <div className="space-y-3">
            {forecast.forecasts.map((day, index) => (
              <DayForecastCard 
                key={day.date} 
                day={day} 
                preferences={preferences}
                isToday={index === 0}
              />
            ))}
          </div>
        </section>

        {/* Customizable Dashboard */}
        <CustomizableDashboard 
          locationId={locationId}
          forecasts={forecast.forecasts}
          location={forecast.location}
          preferences={preferences}
        />

        {/* Detailed periods for today */}
        {currentDay && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Today's Detailed Forecast</h2>
            <div className="grid gap-3">
              {currentDay.periods.map((period, index) => (
                <PeriodCard key={index} period={period} preferences={preferences} />
              ))}
            </div>
          </section>
        )}

        {/* Data source info */}
        <div className="text-xs text-gray-500 text-center pt-4">
          <p>Data from {forecast.data_source}</p>
          <p>Last updated: {new Date(forecast.last_updated).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function CurrentConditionsCard({ day, preferences }: { day: DailyForecast; preferences: any }) {
  const currentPeriod = day.periods[0] // Assuming first period is current
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Current Conditions</h3>
          <p className="text-sm text-gray-500">{getPeriodLabel(currentPeriod.period_type)}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">
            {formatTemperature(currentPeriod.temperature_c, preferences)}
          </div>
          <div className="text-sm text-gray-500">
            Feels like {formatTemperature(currentPeriod.feels_like_c, preferences)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Hiking Score</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', getHikingScoreColor(currentPeriod.hiking_score))}>
              {currentPeriod.hiking_score}/10
            </span>
            <span className="text-sm text-gray-500">
              {getHikingScoreDescription(currentPeriod.hiking_score)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Wind</span>
          <span>
            {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)} {currentPeriod.wind_direction}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Precipitation</span>
          <span>{formatPrecipitation(currentPeriod.precipitation_mm)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Visibility</span>
          <span>{getVisibilityDescription(currentPeriod.visibility_m)}</span>
        </div>

        {currentPeriod.cloud_base_m && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Cloud Base</span>
            <span>{getCloudBaseDescription(currentPeriod.cloud_base_m)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm">{currentPeriod.weather_description}</p>
      </div>
    </div>
  )
}

function DayForecastCard({ day, preferences, isToday }: { 
  day: DailyForecast; 
  preferences: any; 
  isToday: boolean 
}) {
  const date = new Date(day.date)
  const dayName = isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium">{dayName}</div>
          <div className="text-sm text-gray-500">{dateStr}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">High/Low</div>
            <div className="font-medium">
              {formatTemperature(day.summary.max_temp_c, preferences)} / {formatTemperature(day.summary.min_temp_c, preferences)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500">Wind</div>
            <div className="font-medium">
              {formatWindSpeed(day.summary.max_wind_speed_kph, preferences)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500">Hiking</div>
            <div className={cn('font-semibold', getHikingScoreColor(day.summary.overall_hiking_score))}>
              {day.summary.overall_hiking_score}/10
            </div>
          </div>
        </div>
      </div>

      {day.summary.total_precipitation_mm > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          Rain: {formatPrecipitation(day.summary.total_precipitation_mm)}
        </div>
      )}
    </div>
  )
}

function PeriodCard({ period, preferences }: { period: WeatherPeriod; preferences: any }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{getPeriodLabel(period.period_type)}</h4>
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded-full border',
          getRiskLevelColor(period.risk_level)
        )}>
          {period.risk_level} risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Temperature:</span><br />
          <span className="font-medium">
            {formatTemperature(period.temperature_c, preferences)}
          </span>
        </div>
        
        <div>
          <span className="text-gray-600">Feels like:</span><br />
          <span className="font-medium">
            {formatTemperature(period.feels_like_c, preferences)}
          </span>
        </div>

        <div>
          <span className="text-gray-600">Wind:</span><br />
          <span className="font-medium">
            {formatWindSpeed(period.wind_speed_kph, preferences)} {period.wind_direction}
          </span>
        </div>

        <div>
          <span className="text-gray-600">Hiking Score:</span><br />
          <span className={cn('font-semibold', getHikingScoreColor(period.hiking_score))}>
            {period.hiking_score}/10
          </span>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        {period.weather_description}
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: any }) {
  const severityColors = {
    warning: 'bg-red-50 border-red-200 text-red-800',
    watch: 'bg-orange-50 border-orange-200 text-orange-800',
    advisory: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  }

  return (
    <div className={cn(
      'p-4 rounded-lg border-l-4',
      severityColors[alert.severity as keyof typeof severityColors]
    )}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium">{alert.title}</h4>
          <p className="text-sm mt-1">{alert.description}</p>
          <p className="text-xs mt-2">
            Valid: {new Date(alert.valid_from).toLocaleString()} - {new Date(alert.valid_to).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}