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
  SunIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { weatherApi, locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { useDataStalenessStore } from '@/stores/useDataStalenessStore'
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
  getWindDescription,
  formatFreezingLevel,
  formatCloudBase,
  isAboveFreezingLevel,
  isInCloud
} from '@/utils/weather'
import { CustomizableDashboard } from '@/components/CustomizableDashboard'
import { ExportWeatherData } from '@/components/ExportWeatherData'
import type { WeatherPeriod, DailyForecast } from '@/types'

export function LocationPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate = useNavigate()
  const { preferences, isFavorite, addFavorite, removeFavorite, addRecent } = useAppStore()
  const setLastUpdated = useDataStalenessStore((state) => state.setLastUpdated)

  // Get weather forecast
  const { data: forecast, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ['weather', locationId],
    queryFn: () => weatherApi.getForecast(locationId!),
    enabled: !!locationId,
  })

  // Update data staleness store when forecast is loaded
  React.useEffect(() => {
    if (forecast?.last_updated) {
      setLastUpdated(forecast.last_updated)
    }
  }, [forecast?.last_updated, setLastUpdated])

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
      <div className="min-h-screen">
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-100 mb-2">Unable to load forecast</h1>
          <p className="text-slate-400 mb-4">Please try again later</p>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-primary"
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="header-gradient text-white safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{location.name}</h1>
            <p className="text-emerald-100 text-sm">
              {location.area} • {location.elevation_m}m • {location.classification}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => isFav ? removeFavorite(locationId) : addFavorite(locationId)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
          <h2 className="section-title">6-Day Forecast</h2>
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
            <h2 className="section-title">Today's Detailed Forecast</h2>
            <div className="grid gap-3">
              {currentDay.periods.map((period, index) => (
                <PeriodCard key={index} period={period} preferences={preferences} />
              ))}
            </div>
          </section>
        )}

        {/* Data source info */}
        <div className="text-xs text-slate-500 text-center pt-4">
          <p>Data from {forecast.data_source}</p>
          <p>Last updated: {new Date(forecast.last_updated).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function CurrentConditionsCard({ day, preferences }: { day: DailyForecast; preferences: any }) {
  const currentPeriod = day.periods[0] // Assuming first period is current

  // Calculate wind chill difference for display emphasis
  const windChillDiff = currentPeriod.temperature_c - currentPeriod.feels_like_c
  const significantWindChill = windChillDiff >= 3

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Current Conditions</h3>
          <p className="text-sm text-slate-500">{getPeriodLabel(currentPeriod.period_type)}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-100">
            {formatTemperature(currentPeriod.temperature_c, preferences)}
          </div>
          <div className={cn(
            'text-sm',
            significantWindChill ? 'text-emerald-400 font-medium' : 'text-slate-400'
          )}>
            Feels like {formatTemperature(currentPeriod.feels_like_c, preferences)}
            {significantWindChill && ' (wind chill)'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Hiking Score</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', getHikingScoreColor(currentPeriod.hiking_score))}>
              {currentPeriod.hiking_score}/10
            </span>
            <span className="text-sm text-slate-500">
              {getHikingScoreDescription(currentPeriod.hiking_score)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Wind</span>
          <span className="text-slate-200">
            {formatWindSpeed(currentPeriod.wind_speed_kph, preferences)} {currentPeriod.wind_direction}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Precipitation</span>
          <span className="text-slate-200">{formatPrecipitation(currentPeriod.precipitation_mm)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Visibility</span>
          <span className="text-slate-200">{getVisibilityDescription(currentPeriod.visibility_m)}</span>
        </div>

        {currentPeriod.cloud_base_m !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <CloudIcon className="w-4 h-4" />
              Cloud Base
            </span>
            <span className="text-slate-200">{formatCloudBase(currentPeriod.cloud_base_m)} ({getCloudBaseDescription(currentPeriod.cloud_base_m)})</span>
          </div>
        )}

        {currentPeriod.freezing_level_m !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1">
              <BeakerIcon className="w-4 h-4" />
              Freezing Level
            </span>
            <span className="text-emerald-400 font-medium">
              {formatFreezingLevel(currentPeriod.freezing_level_m)}
            </span>
          </div>
        )}
      </div>

      {/* Safety-Critical Conditions Banner */}
      {(currentPeriod.freezing_level_m !== undefined || currentPeriod.cloud_base_m !== undefined) && (
        <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Safety Conditions</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {currentPeriod.freezing_level_m !== undefined && (
              <div className="flex items-center gap-2">
                <BeakerIcon className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-emerald-300 font-medium">Freezing: {formatFreezingLevel(currentPeriod.freezing_level_m)}</div>
                  <div className="text-emerald-500 text-xs">
                    {currentPeriod.freezing_level_m < 500 ? 'Winter conditions likely' :
                     currentPeriod.freezing_level_m < 1000 ? 'Ice possible on summits' :
                     'Above most peaks'}
                  </div>
                </div>
              </div>
            )}
            {currentPeriod.cloud_base_m !== undefined && (
              <div className="flex items-center gap-2">
                <CloudIcon className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-slate-300 font-medium">Cloud: {formatCloudBase(currentPeriod.cloud_base_m)}</div>
                  <div className="text-slate-500 text-xs">
                    {currentPeriod.cloud_base_m < 500 ? 'Low visibility on hills' :
                     currentPeriod.cloud_base_m < 1000 ? 'Cloud on higher peaks' :
                     'Clear above most summits'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
        <p className="text-sm text-slate-300">{currentPeriod.weather_description}</p>
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

  // Get representative period for freezing level and cloud base (use midday/afternoon period if available)
  const representativePeriod = day.periods.find(p => p.period_type === 'pm') || day.periods[0]
  const freezingLevel = representativePeriod?.freezing_level_m
  const cloudBase = representativePeriod?.cloud_base_m

  // Calculate min feels_like across all periods for wind chill display
  const minFeelsLike = Math.min(...day.periods.map(p => p.feels_like_c))
  const significantWindChill = day.summary.min_temp_c - minFeelsLike >= 3

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-slate-100">{dayName}</div>
          <div className="text-sm text-slate-500">{dateStr}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-sm text-slate-500">High/Low</div>
            <div className="font-medium text-slate-200">
              {formatTemperature(day.summary.max_temp_c, preferences)} / {formatTemperature(day.summary.min_temp_c, preferences)}
            </div>
            {significantWindChill && (
              <div className="text-xs text-emerald-400">
                Feels {formatTemperature(minFeelsLike, preferences)}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-sm text-slate-500">Wind</div>
            <div className="font-medium text-slate-200">
              {formatWindSpeed(day.summary.max_wind_speed_kph, preferences)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-slate-500">Hiking</div>
            <div className={cn('font-semibold', getHikingScoreColor(day.summary.overall_hiking_score))}>
              {day.summary.overall_hiking_score}/10
            </div>
          </div>
        </div>
      </div>

      {/* Safety-critical weather conditions row */}
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        {day.summary.total_precipitation_mm > 0 && (
          <span className="text-slate-400">
            Rain: {formatPrecipitation(day.summary.total_precipitation_mm)}
          </span>
        )}

        {freezingLevel !== undefined && (
          <span className="text-emerald-400 flex items-center gap-1">
            <BeakerIcon className="w-3.5 h-3.5" />
            Freezing: {formatFreezingLevel(freezingLevel)}
          </span>
        )}

        {cloudBase !== undefined && (
          <span className="text-slate-400 flex items-center gap-1">
            <CloudIcon className="w-3.5 h-3.5" />
            Cloud: {formatCloudBase(cloudBase)}
          </span>
        )}
      </div>

      {/* Warning for very low freezing level */}
      {freezingLevel !== undefined && freezingLevel < 500 && (
        <div className="mt-2 text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-700/50 px-2 py-1 rounded inline-block">
          Winter conditions expected - ice/snow likely on higher ground
        </div>
      )}
    </div>
  )
}

function PeriodCard({ period, preferences }: { period: WeatherPeriod; preferences: any }) {
  // Calculate wind chill difference for display emphasis
  const windChillDiff = period.temperature_c - period.feels_like_c
  const significantWindChill = windChillDiff >= 3

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-100">{getPeriodLabel(period.period_type)}</h4>
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded-full border',
          getRiskLevelColor(period.risk_level)
        )}>
          {period.risk_level} risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">Temperature:</span><br />
          <span className="font-medium text-slate-200">
            {formatTemperature(period.temperature_c, preferences)}
          </span>
        </div>

        <div>
          <span className={cn(
            significantWindChill ? 'text-emerald-400' : 'text-slate-400'
          )}>
            Feels like{significantWindChill ? ' (wind chill)' : ''}:
          </span><br />
          <span className={cn(
            'font-medium',
            significantWindChill ? 'text-emerald-400' : 'text-slate-200'
          )}>
            {formatTemperature(period.feels_like_c, preferences)}
          </span>
        </div>

        <div>
          <span className="text-slate-400">Wind:</span><br />
          <span className="font-medium text-slate-200">
            {formatWindSpeed(period.wind_speed_kph, preferences)} {period.wind_direction}
          </span>
        </div>

        <div>
          <span className="text-slate-400">Hiking Score:</span><br />
          <span className={cn('font-semibold', getHikingScoreColor(period.hiking_score))}>
            {period.hiking_score}/10
          </span>
        </div>

        {/* Safety-critical fields */}
        {period.freezing_level_m !== undefined && (
          <div>
            <span className="text-emerald-400 flex items-center gap-1">
              <BeakerIcon className="w-3.5 h-3.5" />
              Freezing Level:
            </span>
            <span className="font-medium text-emerald-400">
              {formatFreezingLevel(period.freezing_level_m)}
            </span>
          </div>
        )}

        {period.cloud_base_m !== undefined && (
          <div>
            <span className="text-slate-400 flex items-center gap-1">
              <CloudIcon className="w-3.5 h-3.5" />
              Cloud Base:
            </span>
            <span className="font-medium text-slate-200">
              {formatCloudBase(period.cloud_base_m)}
            </span>
          </div>
        )}
      </div>

      {/* Safety warnings */}
      {(period.freezing_level_m !== undefined && period.freezing_level_m < 500) && (
        <div className="mt-3 p-2 bg-emerald-900/30 border border-emerald-700/50 rounded text-xs text-emerald-300">
          <strong>Winter Conditions:</strong> Freezing level at {formatFreezingLevel(period.freezing_level_m)} - expect ice, snow, and winter conditions on higher ground. Crampons and ice axe may be required.
        </div>
      )}

      {(period.cloud_base_m !== undefined && period.cloud_base_m < 500) && (
        <div className="mt-3 p-2 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300">
          <strong>Navigation Warning:</strong> Cloud base at {formatCloudBase(period.cloud_base_m)} - expect poor visibility on hills. Ensure competent navigation skills.
        </div>
      )}

      <div className="mt-3 text-sm text-slate-400">
        {period.weather_description}
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: any }) {
  const severityColors = {
    warning: 'bg-danger-900/30 border-danger-600 text-danger-300',
    watch: 'bg-orange-900/30 border-orange-600 text-orange-300',
    advisory: 'bg-warning-900/30 border-warning-600 text-warning-300',
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
          <p className="text-sm mt-1 opacity-80">{alert.description}</p>
          <p className="text-xs mt-2 opacity-60">
            Valid: {new Date(alert.valid_from).toLocaleString()} - {new Date(alert.valid_to).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}