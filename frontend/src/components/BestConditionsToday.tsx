import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { weatherApi, locationApi } from '@/api/client'
import type { WeatherForecast } from '@/types'
import { WeatherIcon } from '@/components/weather/WeatherIcon'
import { TemperatureDisplay } from '@/components/weather/TemperatureDisplay'
import { HikingScoreGauge } from '@/components/weather/HikingScoreGauge'
import { WindIndicatorInline } from '@/components/weather/WindArrow'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/utils/cn'
import { TrophyIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface BestConditionCardProps {
  weather: WeatherForecast
  rank: number
}

function BestConditionCard({ weather, rank }: BestConditionCardProps) {
  const { preferences } = useAppStore()
  const location = weather.location
  const currentPeriod = weather.forecasts[0]?.periods[0]

  if (!currentPeriod) return null

  const rankColors = {
    1: { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/40', badge: 'bg-amber-500 text-amber-950' },
    2: { bg: 'from-slate-400/20 to-slate-500/10', border: 'border-slate-400/40', badge: 'bg-slate-400 text-slate-900' },
    3: { bg: 'from-orange-600/20 to-orange-700/10', border: 'border-orange-600/40', badge: 'bg-orange-600 text-orange-950' },
  }[rank] || { bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/40', badge: 'bg-emerald-500 text-emerald-950' }

  return (
    <Link
      to={`/location/${location.id}`}
      className={cn(
        'relative block rounded-xl border p-4 transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-900/20',
        'bg-gradient-to-br',
        rankColors.bg,
        rankColors.border
      )}
    >
      {/* Rank Badge */}
      <div className={cn(
        'absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center',
        'text-xs font-bold shadow-lg',
        rankColors.badge
      )}>
        {rank}
      </div>

      {/* Weather Icon & Temperature */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <WeatherIcon
            condition={currentPeriod.weather_description || 'cloudy'}
            size="lg"
            animated={true}
          />
          <TemperatureDisplay
            temperature={currentPeriod.temperature_c}
            feelsLike={currentPeriod.feels_like_c}
            size="lg"
            showFeelsLike={false}
          />
        </div>
        <HikingScoreGauge
          score={currentPeriod.hiking_score}
          variant="ring"
          size="sm"
          showLabel={false}
          riskTolerance={preferences.riskTolerance}
        />
      </div>

      {/* Location Info */}
      <div className="mb-2">
        <h3 className="font-semibold text-slate-100 text-lg leading-tight">
          {location.name}
        </h3>
        <p className="text-sm text-slate-400">
          {location.area} • {location.elevation_m}m
        </p>
      </div>

      {/* Weather Details */}
      <div className="flex items-center gap-4 text-sm">
        <WindIndicatorInline
          direction={currentPeriod.wind_direction || 'N'}
          speed={currentPeriod.wind_speed_kph}
        />
        <span className="text-slate-500">
          {currentPeriod.weather_description}
        </span>
      </div>
    </Link>
  )
}

interface BestConditionsTodayProps {
  className?: string
  limit?: number
  style?: React.CSSProperties
}

export function BestConditionsToday({ className, limit = 3, style }: BestConditionsTodayProps) {
  // Get all locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', 'all'],
    queryFn: () => locationApi.search(''),
  })

  const locationIds = useMemo(() => locations?.map(l => l.id) || [], [locations])

  // Batch fetch weather for all locations in a single API call
  const { data: allWeather, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather', 'compare', locationIds.join(',')],
    queryFn: () => weatherApi.compareLocations(locationIds),
    enabled: locationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Sort by hiking score and take top N
  const bestWeather = useMemo(() => {
    if (!allWeather) return []
    return allWeather
      .filter(w => (w.forecasts[0]?.periods[0]?.hiking_score || 0) > 0)
      .sort((a, b) =>
        (b.forecasts[0]?.periods[0]?.hiking_score || 0) -
        (a.forecasts[0]?.periods[0]?.hiking_score || 0)
      )
      .slice(0, limit)
  }, [allWeather, limit])

  if (locationsLoading || weatherLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-amber-400" />
          <h2 className="section-title !mb-0">Best Conditions Today</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingSkeleton height={160} className="rounded-xl" />
          <LoadingSkeleton height={160} className="rounded-xl" />
          <LoadingSkeleton height={160} className="rounded-xl" />
        </div>
      </div>
    )
  }

  if (bestWeather.length === 0) {
    return null
  }

  return (
    <section className={cn('fade-in-up', className)} style={style}>
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="w-5 h-5 text-amber-400" />
        <h2 className="section-title !mb-0">Best Conditions Today</h2>
        <SparklesIcon className="w-4 h-4 text-amber-400/60 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {bestWeather.map((w, index) => (
          <BestConditionCard
            key={w.location.id}
            weather={w}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  )
}
