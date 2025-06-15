import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'
import { locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { WeatherCard } from '@/components/WeatherCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function HomePage() {
  const { favoriteLocationIds, recentLocationIds } = useAppStore()

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white safe-top">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold">Scottish Mountain Weather</h1>
          <p className="text-primary-100 mt-1">Accurate forecasts for safe adventures</p>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Favorites Section */}
        {favoriteLocationIds.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
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
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
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
          <h2 className="text-lg font-semibold mb-3">All Locations</h2>
          {locationsLoading ? (
            <LoadingSkeleton count={5} height={80} />
          ) : (
            <div className="space-y-3">
              {allLocations?.map(location => (
                <Link
                  key={location.id}
                  to={`/location/${location.id}`}
                  className="block card hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{location.name}</h3>
                      <p className="text-sm text-gray-600">{location.area}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {location.elevation_m}m
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {location.classification}
                        </span>
                      </div>
                    </div>
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Browse by Area */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Browse by Area</h2>
          {areasLoading ? (
            <LoadingSkeleton count={5} height={60} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {areas?.map(area => (
                <Link
                  key={area.id}
                  to={`/search?area=${area.name}`}
                  className="card hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium">{area.name}</h3>
                  <p className="text-sm text-gray-500">{area.locationCount} locations</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="pt-4">
          <Link
            to="/search"
            className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Search All Mountains
          </Link>
        </section>
      </div>
    </div>
  )
}