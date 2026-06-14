import { lazy, Suspense, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { MapPinIcon, ClockIcon, HeartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { locationApi, weatherApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { WeatherCard } from '@/components/WeatherCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { NoFavorites, EmptyState } from '@/components/EmptyState'
import { BestConditionsToday } from '@/components/BestConditionsToday'
import { BestDayThisWeek } from '@/components/BestDayThisWeek'
import { cn } from '@/utils/cn'

const LocationMap = lazy(() => import('@/components/LocationMap'))

// Colour an area's average hiking score using the same thresholds as the Go/No-Go verdict
function areaScoreBadgeClass(score: number): string {
  if (score >= 7) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  if (score >= 4) return 'text-amber-300 bg-amber-500/15 border-amber-500/30'
  return 'text-red-300 bg-red-500/15 border-red-500/30'
}

export function HomePage() {
  const { favoriteLocationIds, recentLocationIds } = useAppStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [quickSearch, setQuickSearch] = useState('')

  const handleQuickSearch = (value: string) => {
    setQuickSearch(value)
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`)
    }
  }

  // Get areas for quick access
  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: locationApi.getAreas,
  })

  // Get all locations
  const { data: allLocations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', 'all'],
    queryFn: () => locationApi.search(''), // Empty search gets all
  })

  // Batch prefetch weather for all locations so WeatherCards find cached data
  const allLocationIds = useMemo(() => allLocations?.map(l => l.id) || [], [allLocations])

  const { data: allWeather } = useQuery({
    queryKey: ['weather', 'compare', allLocationIds.join(',')],
    queryFn: async () => {
      const forecasts = await weatherApi.compareLocations(allLocationIds)
      // Seed individual caches so each WeatherCard has data immediately
      for (const forecast of forecasts) {
        queryClient.setQueryData(['weather', forecast.location.id], forecast)
      }
      return forecasts
    },
    enabled: allLocationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Top 12 locations sorted by today's hiking score (descending)
  const top12LocationIds = useMemo(() => {
    if (!allWeather || allWeather.length === 0) return allLocations?.map(l => l.id).slice(0, 12) || []
    return [...allWeather]
      .sort((a, b) => {
        const scoreA = a.forecasts[0]?.periods[0]?.hiking_score ?? 0
        const scoreB = b.forecasts[0]?.periods[0]?.hiking_score ?? 0
        return scoreB - scoreA
      })
      .slice(0, 12)
      .map(w => w.location.id)
  }, [allWeather, allLocations])

  const totalLocationCount = allLocations?.length ?? 0

  // Average of today's hiking score per area (for sorting + display in Browse by Area)
  const areaAvgScores = useMemo(() => {
    const acc: Record<string, { sum: number; count: number }> = {}
    for (const w of allWeather ?? []) {
      const area = w.location?.area
      const score = w.forecasts?.[0]?.summary?.overall_hiking_score
      if (area && typeof score === 'number') {
        acc[area] = acc[area] || { sum: 0, count: 0 }
        acc[area].sum += score
        acc[area].count += 1
      }
    }
    const out: Record<string, number> = {}
    for (const [area, { sum, count }] of Object.entries(acc)) {
      out[area] = Math.round((sum / count) * 10) / 10
    }
    return out
  }, [allWeather])

  const sortedAreas = useMemo(() => {
    if (!areas) return []
    return [...areas].sort((a, b) => {
      const sa = areaAvgScores[a.name]
      const sb = areaAvgScores[b.name]
      if (sa == null && sb == null) return a.name.localeCompare(b.name)
      if (sa == null) return 1
      if (sb == null) return -1
      return sb - sa
    })
  }, [areas, areaAvgScores])

  // Determine what to show in the favorites/recents section
  const hasFavorites = favoriteLocationIds.length > 0
  const hasRecents = recentLocationIds.length > 0
  const favoritesToShow = favoriteLocationIds.slice(0, 4)
  const hasMoreFavorites = favoriteLocationIds.length > 4
  // Filter recents to exclude any that are already in favorites
  const filteredRecents = recentLocationIds.filter(id => !favoriteLocationIds.includes(id)).slice(0, 3)

  return (
    <div className="min-h-screen">
      {/* 1. Compact Hero Header — title + subtitle only, no stat pills */}
      <header className="header-gradient text-white safe-top relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="mountains" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M10 15 L5 8 L0 15 M10 15 L15 8 L20 15" stroke="currentColor" fill="none" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#mountains)"/>
          </svg>
        </div>

        <div className="relative px-4 py-5">
          <h1 className="hero-title fade-in-down text-balance">Scottish Mountain Weather</h1>
          <p className="hero-subtitle mt-1 fade-in-down" style={{ animationDelay: '0.1s' }}>Accurate forecasts for safe adventures</p>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* 2. Quick Search */}
        <section className="fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative max-w-xl mx-auto">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search mountains, areas..."
              value={quickSearch}
              onChange={(e) => handleQuickSearch(e.target.value)}
              className="input pl-10"
              aria-label="Search mountains and areas"
            />
          </div>
        </section>

        {/* 3. Best Day This Week */}
        <BestDayThisWeek className="fade-in-up" style={{ animationDelay: '0.15s' }} />

        {/* 4. Best Conditions Today */}
        <BestConditionsToday className="fade-in-up" style={{ animationDelay: '0.2s' }} />

        {/* 5. Favorites + Recent Locations (merged) */}
        <section className="fade-in-up" style={{ animationDelay: '0.25s' }}>
          {hasFavorites ? (
            <>
              {/* Favorites */}
              <h2 className="section-title flex items-center gap-2">
                <HeartIcon className="w-5 h-5 text-red-400" />
                Favorite Locations
              </h2>
              <div className="space-y-3">
                {favoritesToShow.map(locationId => (
                  <WeatherCard key={locationId} locationId={locationId} />
                ))}
              </div>
              {hasMoreFavorites && (
                <Link
                  to="/favorites"
                  className="block text-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors mt-3 py-2"
                >
                  View all {favoriteLocationIds.length} favorites
                </Link>
              )}

              {/* Recently Viewed (compact row below favorites) */}
              {filteredRecents.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-2">
                    <ClockIcon className="w-4 h-4 text-slate-500" />
                    Recently Viewed
                  </h3>
                  <div className="space-y-2">
                    {filteredRecents.map(locationId => (
                      <WeatherCard key={locationId} locationId={locationId} compact />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : hasRecents ? (
            <>
              {/* No favorites — show recents in the favorites position */}
              <h2 className="section-title flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-slate-400" />
                Recently Viewed
              </h2>
              <div className="space-y-3">
                {recentLocationIds.slice(0, 4).map(locationId => (
                  <WeatherCard key={locationId} locationId={locationId} />
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="section-title flex items-center gap-2">
                <HeartIcon className="w-5 h-5 text-red-400" />
                Favorite Locations
              </h2>
              <NoFavorites />
            </>
          )}
        </section>

        {/* 6. All Locations — top 12 by hiking score */}
        <section className="fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="section-title">Top Conditions Right Now</h2>
          {locationsLoading ? (
            <LoadingSkeleton count={5} height={80} />
          ) : !allLocations || allLocations.length === 0 ? (
            <EmptyState
              variant="no-locations"
              title="No locations available"
              description="Weather data is being loaded. Please check back soon."
            />
          ) : (
            <>
              <div className="space-y-3">
                {top12LocationIds.map(locationId => (
                  <WeatherCard key={locationId} locationId={locationId} compact />
                ))}
              </div>
              {totalLocationCount > 12 && (
                <Link
                  to="/search"
                  className="flex items-center justify-center gap-2 mt-4 py-3 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50 transition-colors"
                >
                  <MapPinIcon className="w-4 h-4" />
                  View all {totalLocationCount} mountains
                </Link>
              )}
            </>
          )}
        </section>

        {/* 7. Compact Interactive Map */}
        <section className="fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="section-title flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-emerald-400" />
            Mountain Map
          </h2>
          <Suspense fallback={<LoadingSkeleton height={192} className="rounded-xl" />}>
            <LocationMap
              locations={allLocations || []}
              onLocationSelect={(location) => navigate(`/location/${location.id}`)}
              className="w-full h-48 rounded-xl"
            />
          </Suspense>
          <Link
            to="/search"
            className="block text-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors mt-2 py-1"
          >
            Explore full map
          </Link>
        </section>

        {/* 8. Browse by Area */}
        <section className="fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="section-title">Browse by Area</h2>
          {Object.keys(areaAvgScores).length > 0 && (
            <p className="text-xs text-slate-500 -mt-2 mb-3">Sorted by today's average hiking score</p>
          )}
          {areasLoading ? (
            <LoadingSkeleton count={5} height={60} />
          ) : !areas || areas.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="No areas available"
              description="Area data is being loaded."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sortedAreas.map(area => {
                const avg = areaAvgScores[area.name]
                return (
                  <Link
                    key={area.id}
                    to={`/search?area=${area.name}`}
                    className="card group hover:border-emerald-600/50 hover-scale"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {area.name}
                      </h3>
                      {avg != null && (
                        <span
                          className={cn(
                            'flex-shrink-0 text-xs font-bold mono-nums px-1.5 py-0.5 rounded-md border',
                            areaScoreBadgeClass(avg)
                          )}
                          title="Average hiking score today (1–10)"
                          aria-label={`Average hiking score ${avg.toFixed(1)} out of 10`}
                        >
                          {avg.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{area.locationCount} locations</p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
