import { lazy, Suspense, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { MapPinIcon, ClockIcon, HeartIcon } from '@heroicons/react/24/outline'
import { locationApi, weatherApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { WeatherCard } from '@/components/WeatherCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { NoFavorites, NoRecentLocations, EmptyState } from '@/components/EmptyState'
import { BestConditionsToday } from '@/components/BestConditionsToday'

const LocationMap = lazy(() => import('@/components/LocationMap'))

export function HomePage() {
  const { favoriteLocationIds, recentLocationIds } = useAppStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  useQuery({
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

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
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

        <div className="relative px-4 py-8">
          <h1 className="hero-title fade-in-down text-balance">Scottish Mountain Weather</h1>
          <p className="hero-subtitle mt-2 fade-in-down" style={{ animationDelay: '0.1s' }}>Accurate forecasts for safe adventures</p>

          {/* Quick stats */}
          <div className="flex gap-4 mt-4 stagger-children">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold mono-nums">{allLocations?.length || 0}</div>
              <div className="text-xs text-emerald-100 tracking-wider-custom uppercase">Locations</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold mono-nums">{areas?.length || 0}</div>
              <div className="text-xs text-emerald-100 tracking-wider-custom uppercase">Areas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold mono-nums">{favoriteLocationIds.length}</div>
              <div className="text-xs text-emerald-100 tracking-wider-custom uppercase">Favorites</div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Interactive Map Section - Hero Size */}
        <section className="fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="section-title flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-emerald-400 pulse" />
            Mountain Locations
          </h2>
          <Suspense fallback={<LoadingSkeleton height={400} className="rounded-xl" />}>
            <LocationMap
              locations={allLocations || []}
              onLocationSelect={(location) => navigate(`/location/${location.id}`)}
              className="w-full h-[50vh] min-h-[400px]"
            />
          </Suspense>
        </section>

        {/* Best Conditions Today */}
        <BestConditionsToday className="fade-in-up" style={{ animationDelay: '0.4s' }} />

        {/* Favorites Section */}
        <section className="fade-in-up" style={{ animationDelay: '0.6s' }}>
          <h2 className="section-title flex items-center gap-2">
            <HeartIcon className="w-5 h-5 text-red-400" />
            Favorite Locations
          </h2>
          {favoriteLocationIds.length > 0 ? (
            <div className="space-y-3 stagger-children">
              {favoriteLocationIds.map(locationId => (
                <WeatherCard key={locationId} locationId={locationId} />
              ))}
            </div>
          ) : (
            <NoFavorites />
          )}
        </section>

        {/* Browse by Area */}
        <section className="fade-in-up" style={{ animationDelay: '0.8s' }}>
          <h2 className="section-title">Browse by Area</h2>
          {areasLoading ? (
            <LoadingSkeleton count={5} height={60} />
          ) : !areas || areas.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="No areas available"
              description="Area data is being loaded."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 stagger-children">
              {areas.map(area => (
                <Link
                  key={area.id}
                  to={`/search?area=${area.name}`}
                  className="card group hover:border-emerald-600/50 hover-scale"
                >
                  <h3 className="font-medium text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {area.name}
                  </h3>
                  <p className="text-sm text-slate-500">{area.locationCount} locations</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="pt-4 pb-8 fade-in-up" style={{ animationDelay: '1.0s' }}>
          <Link
            to="/search"
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 ripple hover-scale"
          >
            <MapPinIcon className="w-5 h-5" />
            Search All Mountains
          </Link>
        </section>

        {/* Recent Locations */}
        <section className="fade-in-up" style={{ animationDelay: '1.2s' }}>
          <h2 className="section-title flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-slate-400" />
            Recent Locations
          </h2>
          {recentLocationIds.length > 0 ? (
            <div className="space-y-3 stagger-children">
              {recentLocationIds.slice(0, 3).map(locationId => (
                <WeatherCard key={locationId} locationId={locationId} compact />
              ))}
            </div>
          ) : (
            <NoRecentLocations />
          )}
        </section>

        {/* All Locations */}
        <section className="fade-in-up" style={{ animationDelay: '1.4s' }}>
          <h2 className="section-title">All Locations</h2>
          {locationsLoading ? (
            <LoadingSkeleton count={5} height={80} />
          ) : !allLocations || allLocations.length === 0 ? (
            <EmptyState
              variant="no-locations"
              title="No locations available"
              description="Weather data is being loaded. Please check back soon."
            />
          ) : (
            <div className="space-y-3 stagger-children">
              {allLocations.map(location => (
                <WeatherCard key={location.id} locationId={location.id} compact />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
