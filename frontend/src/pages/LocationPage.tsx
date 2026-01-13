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
import { DataLoadError, NoAlerts, EmptyState } from '@/components/EmptyState'
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
        <DataLoadError onRetry={() => window.location.reload()} />
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
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-6 h-6" aria-hidden="true" />
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
              className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label={isFav ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
              aria-pressed={isFav}
            >
              {isFav ? (
                <HeartIconSolid className="w-6 h-6 text-red-400 bounce-in" aria-hidden="true" />
              ) : (
                <HeartIcon className="w-6 h-6" aria-hidden="true" />
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
              aria-label={`Share ${location.name} weather`}
            >
              <ShareIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Export functionality */}
        <div className="flex justify-end fade-in">
          <ExportWeatherData forecasts={forecast.forecasts} location={forecast.location} />
        </div>

        {/* Current conditions */}
        <div className="fade-in-up">
          <CurrentConditionsCard day={currentDay} preferences={preferences} />
        </div>

        {/* Alerts */}
        <section className="fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
            Weather Alerts
          </h2>
          {forecast.alerts && forecast.alerts.length > 0 ? (
            <div className="space-y-2">
              {forecast.alerts.map((alert, index) => (
                <AlertCard key={index} alert={alert} />
              ))}
            </div>
          ) : (
            <NoAlerts />
          )}
        </section>

        {/* Daily forecasts */}
        <section className="fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="section-title">6-Day Forecast</h2>
          <div className="space-y-3 stagger-children">
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
          <section className="fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="section-title">Today's Detailed Forecast</h2>
            <div className="grid gap-3 stagger-children">
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
          <div className="text-3xl font-bold text-slate-100 mono-nums">
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
        <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Safety Conditions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentPeriod.freezing_level_m !== undefined && (
              <div className={cn(
                'hazard-indicator',
                currentPeriod.freezing_level_m < 500 ? 'hazard-ice' : 'bg-slate-700/30 text-slate-300 border-slate-600/50'
              )}>
                <BeakerIcon className="w-5 h-5" />
                <div>
                  <div className="font-medium mono-nums">Freezing: {formatFreezingLevel(currentPeriod.freezing_level_m)}</div>
                  <div className="text-xs opacity-80">
                    {currentPeriod.freezing_level_m < 500 ? 'Winter conditions likely' :
                     currentPeriod.freezing_level_m < 1000 ? 'Ice possible on summits' :
                     'Above most peaks'}
                  </div>
                </div>
              </div>
            )}
            {currentPeriod.cloud_base_m !== undefined && (
              <div className={cn(
                'hazard-indicator',
                currentPeriod.cloud_base_m < 500 ? 'hazard-visibility' : 'bg-slate-700/30 text-slate-300 border-slate-600/50'
              )}>
                <CloudIcon className="w-5 h-5" />
                <div>
                  <div className="font-medium mono-nums">Cloud: {formatCloudBase(currentPeriod.cloud_base_m)}</div>
                  <div className="text-xs opacity-80">
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

  // Determine weather condition icon based on data
  const hasRain = day.summary.total_precipitation_mm > 0
  const hasSnow = freezingLevel !== undefined && freezingLevel < 800 && hasRain
  const isWindy = day.summary.max_wind_speed_kph > 40
  const hikingScore = day.summary.overall_hiking_score

  // Score color classes with background
  const getScoreClasses = (score: number) => {
    if (score >= 7) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (score >= 5) return 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30'
    if (score >= 3) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <div className={cn(
      "card relative overflow-hidden transition-all duration-200 hover-lift",
      isToday && "ring-2 ring-emerald-500/50 bg-emerald-900/10"
    )}>
      {/* Today indicator strip */}
      {isToday && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Weather condition icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            hikingScore >= 7 ? "bg-emerald-500/20" :
            hikingScore >= 5 ? "bg-emerald-600/20" :
            hikingScore >= 3 ? "bg-amber-500/20" : "bg-red-500/20"
          )}>
            {hasSnow ? (
              <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-6-6l6 6 6-6M6 9l6-6 6 6" />
              </svg>
            ) : hasRain ? (
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            ) : isWindy ? (
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </div>

          <div>
            <div className={cn(
              "font-semibold",
              isToday ? "text-emerald-400 text-lg" : "text-slate-100"
            )}>{dayName}</div>
            <div className="text-sm text-slate-500">{dateStr}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Temperature */}
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wider-custom">Temp</div>
            <div className="font-semibold text-slate-200 mono-nums">
              {formatTemperature(day.summary.max_temp_c, preferences)}
            </div>
            <div className="text-xs text-slate-500 mono-nums">
              {formatTemperature(day.summary.min_temp_c, preferences)}
            </div>
            {significantWindChill && (
              <div className="text-xs text-cyan-400 mt-0.5">
                Feels {formatTemperature(minFeelsLike, preferences)}
              </div>
            )}
          </div>

          {/* Wind */}
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wider-custom">Wind</div>
            <div className={cn(
              "font-semibold mono-nums",
              isWindy ? "text-amber-400" : "text-slate-200"
            )}>
              {formatWindSpeed(day.summary.max_wind_speed_kph, preferences)}
            </div>
          </div>

          {/* Hiking Score with visual bar */}
          <div className="text-center min-w-[60px]">
            <div className="text-xs text-slate-500 uppercase tracking-wider-custom mb-1">Score</div>
            <div className={cn(
              "font-bold text-lg px-2 py-0.5 rounded-lg border mono-nums",
              getScoreClasses(hikingScore)
            )}>
              {hikingScore}
            </div>
            {/* Visual score bar */}
            <div className="mt-1 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  hikingScore >= 7 ? "bg-emerald-500" :
                  hikingScore >= 5 ? "bg-emerald-600" :
                  hikingScore >= 3 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${hikingScore * 10}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Safety-critical weather conditions row */}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {hasRain && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
            </svg>
            {formatPrecipitation(day.summary.total_precipitation_mm)}
          </span>
        )}

        {freezingLevel !== undefined && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
            freezingLevel < 500
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
          )}>
            <BeakerIcon className="w-3 h-3" />
            {formatFreezingLevel(freezingLevel)}
          </span>
        )}

        {cloudBase !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <CloudIcon className="w-3 h-3" />
            {formatCloudBase(cloudBase)}
          </span>
        )}
      </div>

      {/* Warning for very low freezing level */}
      {freezingLevel !== undefined && freezingLevel < 500 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-cyan-300 bg-cyan-900/30 border border-cyan-700/50 px-3 py-2 rounded-lg">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
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
    <div className="card hover-lift">
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
  const severityClasses = {
    warning: 'alert-banner-danger',
    watch: 'alert-banner-warning',
    advisory: 'alert-banner-info',
  }

  return (
    <div className={cn(
      'alert-banner fade-in shake',
      severityClasses[alert.severity as keyof typeof severityClasses] || 'alert-banner-warning'
    )} style={{ animationIterationCount: 1 }}>
      <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{alert.title}</h4>
          <span className={cn(
            'safety-badge text-xs',
            alert.severity === 'warning' ? 'safety-badge-danger' :
            alert.severity === 'watch' ? 'safety-badge-warning' :
            'safety-badge-caution'
          )}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{alert.description}</p>
        <p className="text-xs mt-2 opacity-70 mono-nums">
          Valid: {new Date(alert.valid_from).toLocaleString()} - {new Date(alert.valid_to).toLocaleString()}
        </p>
      </div>
    </div>
  )
}