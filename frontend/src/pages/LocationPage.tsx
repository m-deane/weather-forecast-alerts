import React, { lazy, Suspense, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  HeartIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  BeakerIcon,
  MapPinIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { weatherApi, locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { useDataStalenessStore } from '@/stores/useDataStalenessStore'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { DataLoadError } from '@/components/EmptyState'
import { cn } from '@/utils/cn'
import {
  formatTemperature,
  formatWindSpeed,
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

const LocationMap = lazy(() => import('@/components/LocationMap'))
const CustomizableDashboard = lazy(() => import('@/components/CustomizableDashboard'))
import { ExportWeatherData } from '@/components/ExportWeatherData'
import { WeatherIcon } from '@/components/weather/WeatherIcon'
import { TemperatureDisplay } from '@/components/weather/TemperatureDisplay'
import { WindIndicatorInline } from '@/components/weather/WindArrow'
import { HikingScoreGauge } from '@/components/weather/HikingScoreGauge'
import { DaylightHours } from '@/components/weather/DaylightHours'
import { CloudInversionIndicator } from '@/components/weather/CloudInversionIndicator'
import { PhotographyConditions } from '@/components/weather/PhotographyConditions'
import { WeatherTrend } from '@/components/weather/WeatherTrend'
import { MountainPhotoGallery } from '@/components/MountainPhotoGallery'
import { WalkHighlandsRoutes } from '@/components/WalkHighlandsRoutes'
import { WalkTimeEstimator } from '@/components/WalkTimeEstimator'
import { GettingThere } from '@/components/GettingThere'
import { GoNoGoSummary } from '@/components/GoNoGoSummary'
import { SafeWindowBar } from '@/components/weather/SafeWindowBar'
import { WinterConditionsPanel } from '@/components/WinterConditionsPanel'
import { GearChecklist } from '@/components/GearChecklist'
import { ShareForecastCard } from '@/components/ShareForecastCard'
import { EmergencyInfo } from '@/components/EmergencyInfo'
import { WalkHistoryLog } from '@/components/WalkHistoryLog'
import { WeatherNarrative } from '@/components/weather/WeatherNarrative'
import { MountainWebcams } from '@/components/MountainWebcams'
import type { WeatherPeriod, DailyForecast } from '@/types'

export function LocationPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate = useNavigate()
  const { preferences, isFavorite, addFavorite, removeFavorite, addRecent } = useAppStore()
  const setLastUpdated = useDataStalenessStore((state) => state.setLastUpdated)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)
  const [planningOpen, setPlanningOpen] = useState(false)
  const [photoRefOpen, setPhotoRefOpen] = useState(false)

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
            <p className="text-emerald-200/60 text-xs mt-0.5">
              Summit forecast ({location.elevation_m}m)
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
        {/* 1. Estimated data warning banner */}
        {forecast.data_source?.includes('estimated') && (
          <div className="rounded-xl border border-amber-600/30 bg-amber-900/20 px-4 py-3 flex items-start gap-3 fade-in">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Estimated Data</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Real forecast data is not yet available for this location. All conditions shown — including the hiking score and Go/No-Go verdict — are seasonal estimates and must not be relied on for safety decisions.
              </p>
            </div>
          </div>
        )}

        {/* 2. Weather Alerts — safety-critical, shown first (only if alerts exist) */}
        {forecast.alerts && forecast.alerts.length > 0 && (
          <section className="fade-in">
            <h2 className="section-title flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
              Weather Alerts
            </h2>
            <div className="space-y-2">
              {forecast.alerts.map((alert, index) => (
                <AlertCard key={index} alert={alert} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Go / No-Go verdict for next 3 days */}
        <GoNoGoSummary forecasts={forecast.forecasts} />

        {/* 3a. AI-generated weather narrative for today */}
        {currentDay && (
          <WeatherNarrative
            forecast={currentDay}
            locationName={location.name}
            elevation={location.elevation_m}
          />
        )}

        {/* 3b. Safe Window Timeline — today's safety at a glance */}
        {currentDay && currentDay.periods.length > 1 && (
          <section className="fade-in-up">
            <SafeWindowBar periods={currentDay.periods} />
          </section>
        )}

        {/* 4. Winter conditions advisory for today */}
        {currentDay && <WinterConditionsPanel forecast={currentDay} />}

        {/* 5. Weather Trend — improving/deteriorating conditions */}
        <section className="fade-in-up" style={{ animationDelay: '0.05s' }}>
          <WeatherTrend forecasts={forecast.forecasts} />
        </section>

        {/* 6. 6-Day Forecast — the core content users need */}
        <section className="fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title">6-Day Forecast</h2>
          <div className="space-y-3 stagger-children">
            {forecast.forecasts.map((day, index) => {
              // Forecast confidence decreases after day 3
              const confidence = index <= 2 ? 'high' : index <= 4 ? 'medium' : 'low'
              // Reduce opacity for lower confidence days (day 4+)
              const opacityStyle = index >= 3
                ? { opacity: 1 - (index - 2) * 0.1 }
                : undefined

              return (
                <div key={day.date} style={opacityStyle} className="relative">
                  <DayForecastCard
                    day={day}
                    preferences={preferences}
                    isToday={index === 0}
                    isExpanded={expandedDayIndex === index}
                    onToggle={() => setExpandedDayIndex(expandedDayIndex === index ? null : index)}
                    confidence={confidence}
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-500 text-center mt-3">
            Forecasts beyond 3 days are less reliable — use for general planning only
          </p>
        </section>

        {/* 7. Current conditions */}
        <div className="fade-in-up" style={{ animationDelay: '0.15s' }}>
          <CurrentConditionsCard day={currentDay} preferences={preferences} />
        </div>

        {/* 8. Daylight Hours + Cloud Inversion grid */}
        <section className="fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DaylightHours
              latitude={location.latitude}
              longitude={location.longitude}
            />
            <CloudInversionIndicator
              cloudBase={currentDay?.periods[0]?.cloud_base_m}
              freezingLevel={currentDay?.periods[0]?.freezing_level_m}
              summitElevation={location.elevation_m}
              humidity={undefined}
              windSpeed={currentDay?.periods[0]?.wind_speed_kph}
              temperature={currentDay?.periods[0]?.temperature_c}
            />
          </div>
        </section>

        {/* 9. Collapsible Trip Planning section */}
        <div className="card p-0 overflow-hidden fade-in-up" style={{ animationDelay: '0.25s' }}>
          <button
            type="button"
            onClick={() => setPlanningOpen(!planningOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
            aria-expanded={planningOpen}
          >
            <h2 className="text-lg font-semibold text-slate-200">Trip Planning</h2>
            <ChevronDownIcon
              className={cn(
                "w-5 h-5 text-slate-400 transition-transform duration-300",
                planningOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          {planningOpen && (
            <div className="space-y-6 px-4 pb-4">
              <WalkHighlandsRoutes
                locationId={locationId}
                hikingScore={currentDay?.summary.overall_hiking_score}
              />
              <WalkTimeEstimator forecasts={forecast.forecasts} location={location} />
              <GearChecklist location={location} forecasts={forecast.forecasts} />
              <GettingThere locationId={locationId} />
              <WalkHistoryLog
                location={location}
                currentScore={currentDay?.summary.overall_hiking_score}
              />
            </div>
          )}
        </div>

        {/* 10. Collapsible Photography & Reference section */}
        <div className="card p-0 overflow-hidden fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            type="button"
            onClick={() => setPhotoRefOpen(!photoRefOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
            aria-expanded={photoRefOpen}
          >
            <h2 className="text-lg font-semibold text-slate-200">Photography & Reference</h2>
            <ChevronDownIcon
              className={cn(
                "w-5 h-5 text-slate-400 transition-transform duration-300",
                photoRefOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          {photoRefOpen && (
            <div className="space-y-6 px-4 pb-4">
              <PhotographyConditions
                visibility={currentDay?.periods[0]?.visibility_m}
                cloudBase={currentDay?.periods[0]?.cloud_base_m}
                cloudCover={undefined}
                precipitation={currentDay?.periods[0]?.precipitation_mm}
                windSpeed={currentDay?.periods[0]?.wind_speed_kph}
                latitude={location.latitude}
                longitude={location.longitude}
              />
              <MountainPhotoGallery locationId={locationId} />
              <MountainWebcams locationId={locationId} />
              <section>
                <h3 className="section-title flex items-center gap-2 mb-3">
                  <MapPinIcon className="w-5 h-5 text-emerald-400" />
                  Location
                </h3>
                <div className="card p-0 overflow-hidden">
                  <Suspense fallback={<LoadingSkeleton height={192} />}>
                    <LocationMap
                      locations={[location]}
                      selectedLocationId={location.id}
                      center={[location.latitude, location.longitude]}
                      zoom={11}
                      className="w-full h-48"
                      interactive={false}
                      showPopups={false}
                    />
                  </Suspense>
                  <div className="p-3 bg-slate-800/50 border-t border-slate-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-400">Coordinates:</span>
                        <span className="text-slate-200 ml-2 mono-nums">
                          {location.latitude.toFixed(4)}°N, {Math.abs(location.longitude).toFixed(4)}°W
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Elevation:</span>
                        <span className="text-emerald-400 ml-2 font-medium mono-nums">{location.elevation_m}m</span>
                      </div>
                    </div>
                    {location.os_grid_ref && (
                      <div className="text-sm">
                        <span className="text-slate-400">OS Grid:</span>
                        <span className="text-slate-200 ml-2 mono-nums">{location.os_grid_ref}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* 11. Emergency Info */}
        <EmergencyInfo
          area={location.area}
          locationName={location.name}
          latitude={location.latitude}
          longitude={location.longitude}
        />

        {/* 12. Export + Share row */}
        <div className="flex items-center justify-between gap-4 fade-in-up">
          <ExportWeatherData forecasts={forecast.forecasts} location={forecast.location} />
          {currentDay && (
            <ShareForecastCard location={location} forecast={currentDay} />
          )}
        </div>

        {/* 13. Customizable Dashboard */}
        <Suspense fallback={<LoadingSkeleton height={300} className="rounded-xl" />}>
          <CustomizableDashboard
            locationId={locationId}
            forecasts={forecast.forecasts}
            location={forecast.location}
            preferences={preferences}
          />
        </Suspense>

        {/* 14. Data source footer */}
        <div className="text-xs text-slate-500 text-center pt-4">
          {forecast.data_source?.includes('estimated') ? (
            <p className="text-amber-500/70">Showing estimated data - no real forecast available</p>
          ) : (
            <>
              <p>Data from {forecast.data_source}</p>
              <p>Last updated: {new Date(forecast.last_updated).toLocaleString()}</p>
            </>
          )}
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
        <div className="flex items-center gap-4">
          {/* Weather Icon */}
          <WeatherIcon
            condition={currentPeriod.weather_description || 'cloudy'}
            size="xl"
            animated={true}
          />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Current Conditions</h3>
            <p className="text-sm text-slate-500">{getPeriodLabel(currentPeriod.period_type)}</p>
          </div>
        </div>
        <div className="text-right">
          {/* Temperature Display Component */}
          <TemperatureDisplay
            temperature={currentPeriod.temperature_c}
            feelsLike={currentPeriod.feels_like_c}
            size="xl"
            showFeelsLike={true}
            variant="default"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Hiking Score</span>
          <HikingScoreGauge
            score={currentPeriod.hiking_score}
            variant="badge"
            size="md"
            showLabel={true}
            showDescription={true}
            riskTolerance={preferences.riskTolerance}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Wind</span>
          <WindIndicatorInline
            direction={currentPeriod.wind_direction || 'N'}
            speed={currentPeriod.wind_speed_kph}
            gustSpeed={currentPeriod.gust_speed_kph}
          />
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

      {/* Weather description with icon */}
      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
        <WeatherIcon
          condition={currentPeriod.weather_description || 'cloudy'}
          size="sm"
          animated={false}
        />
        <p className="text-sm text-slate-300 capitalize">{currentPeriod.weather_description}</p>
      </div>
    </div>
  )
}

function DayForecastCard({ day, preferences, isToday, isExpanded, onToggle, confidence }: {
  day: DailyForecast;
  preferences: any;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  confidence?: 'high' | 'medium' | 'low';
}) {
  const date = new Date(day.date)
  const dayName = isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const panelId = `day-detail-${day.date}`

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

  const hasPeriods = day.periods.length > 1

  return (
    <div className={cn(
      "card relative overflow-hidden transition-all duration-200",
      isToday && "ring-2 ring-emerald-500/50 bg-emerald-900/10",
      !isExpanded && "hover-lift"
    )}>
      {/* Today indicator strip */}
      {isToday && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
      )}

      {/* Clickable header — only interactive when expandable periods exist */}
      <div
        role={hasPeriods ? "button" : undefined}
        tabIndex={hasPeriods ? 0 : undefined}
        onClick={hasPeriods ? onToggle : undefined}
        onKeyDown={hasPeriods ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } } : undefined}
        className={cn(
          "w-full text-left rounded-lg",
          hasPeriods && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
        )}
        aria-expanded={hasPeriods ? isExpanded : undefined}
        aria-controls={hasPeriods ? panelId : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Weather condition icon using WeatherIcon component */}
            <WeatherIcon
              condition={hasSnow ? 'snow' : hasRain ? 'rain' : isWindy ? 'windy' : 'sunny'}
              size="lg"
              animated={isToday}
            />

            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold",
                  isToday ? "text-emerald-400 text-lg" : "text-slate-100"
                )}>{dayName}</span>
                {confidence && confidence !== 'high' && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider',
                    confidence === 'medium'
                      ? 'text-amber-400 bg-amber-900/20 border-amber-700/40'
                      : 'text-slate-400 bg-slate-700/30 border-slate-600/40'
                  )}>
                    {confidence === 'medium' ? 'Med confidence' : 'Low confidence'}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">{dateStr}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Temperature using TemperatureDisplay */}
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider-custom">Temp</div>
              <TemperatureDisplay
                temperature={day.summary.max_temp_c}
                size="sm"
                showUnit={true}
                variant="compact"
              />
              <TemperatureDisplay
                temperature={day.summary.min_temp_c}
                size="xs"
                showUnit={true}
                variant="compact"
                className="opacity-60"
              />
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

            {/* Hiking Score using HikingScoreGauge */}
            <div className="text-center min-w-[60px]">
              <div className="text-xs text-slate-500 uppercase tracking-wider-custom mb-1">Score</div>
              <HikingScoreGauge
                score={hikingScore}
                variant="badge"
                size="sm"
                showLabel={false}
                riskTolerance={preferences.riskTolerance}
              />
            </div>

            {/* Expand chevron */}
            {hasPeriods && (
              <ChevronDownIcon
                className={cn(
                  "w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0",
                  isExpanded && "rotate-180"
                )}
                aria-hidden="true"
              />
            )}
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

      {/* Expanded period detail panel */}
      {isExpanded && hasPeriods && (
        <div
          id={panelId}
          className="mt-4 pt-4 border-t border-slate-700/50 fade-in-down"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider-custom">
              Detailed Periods
            </h3>
            {day.summary.best_period && (
              <span className="text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/50 px-2 py-1 rounded-full">
                Best: {getPeriodLabel(day.summary.best_period as WeatherPeriod['period_type'])}
              </span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {day.periods.map((period) => (
              <div
                key={period.period_type}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  day.summary.best_period === period.period_type
                    ? "bg-emerald-900/20 border-emerald-700/50"
                    : "bg-slate-800/50 border-slate-700/50"
                )}
              >
                {/* Period header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <WeatherIcon
                      condition={period.weather_description || 'cloudy'}
                      size="sm"
                      animated={false}
                    />
                    <span className="font-medium text-slate-100 text-sm">
                      {getPeriodLabel(period.period_type)}
                    </span>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full border',
                    getRiskLevelColor(period.risk_level)
                  )}>
                    {period.risk_level}
                  </span>
                </div>

                {/* Period metrics */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Temp</span>
                    <div className="flex items-center gap-2">
                      <TemperatureDisplay
                        temperature={period.temperature_c}
                        size="xs"
                        showUnit={true}
                        variant="compact"
                      />
                      {period.temperature_c - period.feels_like_c >= 3 && (
                        <span className="text-xs text-cyan-400">
                          (feels {formatTemperature(period.feels_like_c, preferences)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Wind</span>
                    <WindIndicatorInline
                      direction={period.wind_direction || 'N'}
                      speed={period.wind_speed_kph}
                      gustSpeed={period.gust_speed_kph}
                    />
                  </div>

                  {period.precipitation_mm > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rain</span>
                      <span className="text-blue-400 mono-nums">{formatPrecipitation(period.precipitation_mm)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Score</span>
                    <HikingScoreGauge
                      score={period.hiking_score}
                      variant="compact"
                      size="sm"
                      riskTolerance={preferences.riskTolerance}
                    />
                  </div>

                  {period.freezing_level_m !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Freezing</span>
                      <span className={cn(
                        "mono-nums text-xs",
                        period.freezing_level_m < 500 ? "text-cyan-400" : "text-slate-300"
                      )}>
                        {formatFreezingLevel(period.freezing_level_m)}
                      </span>
                    </div>
                  )}

                  {period.cloud_base_m !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cloud</span>
                      <span className="text-slate-300 mono-nums text-xs">
                        {formatCloudBase(period.cloud_base_m)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Weather description */}
                <div className="mt-2 text-xs text-slate-500 capitalize">
                  {period.weather_description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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