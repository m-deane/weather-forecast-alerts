import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { MapPinIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { WeatherCard } from '@/components/WeatherCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { LocationMap } from '@/components/LocationMap'

export function HomePage() {
  const { favoriteLocationIds, recentLocationIds } = useAppStore()
  const navigate = useNavigate()

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
          <h1 className="text-2xl font-bold">Scottish Mountain Weather</h1>
          <p className="text-emerald-100 mt-1">Accurate forecasts for safe adventures</p>

          {/* Quick stats */}
          <div className="flex gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold">{allLocations?.length || 0}</div>
              <div className="text-xs text-emerald-100">Locations</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold">{areas?.length || 0}</div>
              <div className="text-xs text-emerald-100">Areas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-xl font-bold">{favoriteLocationIds.length}</div>
              <div className="text-xs text-emerald-100">Favorites</div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Interactive Map Section */}
        <section>
          <h2 className="section-title flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-emerald-400" />
            Mountain Locations
          </h2>
          <LocationMap
            locations={allLocations || []}
            onLocationSelect={(location) => navigate(`/location/${location.id}`)}
            className="w-full h-80"
          />
        </section>

        {/* Favorites Section */}
        {favoriteLocationIds.length > 0 && (
          <section>
            <h2 className="section-title flex items-center gap-2">
              <span className="text-red-400">♥</span>
              Favorite Locations
            </h2>
            <div className="space-y-3">
              {favoriteLocationIds.map(locationId => (
                <WeatherCard key={locationId} locationId={locationId} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Locations */}
        {recentLocationIds.length > 0 && (
          <section>
            <h2 className="section-title flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-slate-400" />
              Recent Locations
            </h2>
            <div className="space-y-3">
              {recentLocationIds.slice(0, 3).map(locationId => (
                <WeatherCard key={locationId} locationId={locationId} compact />
              ))}
            </div>
          </section>
        )}

        {/* All Locations */}
        <section>
          <h2 className="section-title">All Locations</h2>
          {locationsLoading ? (
            <LoadingSkeleton count={5} height={80} />
          ) : (
            <div className="space-y-3">
              {allLocations?.map(location => (
                <Link
                  key={location.id}
                  to={`/location/${location.id}`}
                  className="block card group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {location.name}
                      </h3>
                      <p className="text-sm text-slate-400">{location.area}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                          {location.elevation_m}m
                        </span>
                        <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded-full border border-emerald-700/50">
                          {location.classification}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Browse by Area */}
        <section>
          <h2 className="section-title">Browse by Area</h2>
          {areasLoading ? (
            <LoadingSkeleton count={5} height={60} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {areas?.map(area => (
                <Link
                  key={area.id}
                  to={`/search?area=${area.name}`}
                  className="card group hover:border-emerald-600/50"
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
        <section className="pt-4 pb-8">
          <Link
            to="/search"
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <MapPinIcon className="w-5 h-5" />
            Search All Mountains
          </Link>
        </section>
      </div>
    </div>
  )
}
