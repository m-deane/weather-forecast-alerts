import { Link } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { WeatherCard } from '@/components/WeatherCard'
import { HeartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export function FavoritesPage() {
  const { favoriteLocationIds, removeFavorite } = useAppStore()

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 safe-top">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-100">Favorite Locations</h1>
          <p className="text-sm text-slate-400 mt-1">
            {favoriteLocationIds.length > 0
              ? `${favoriteLocationIds.length} saved location${favoriteLocationIds.length !== 1 ? 's' : ''}`
              : 'Save mountains to track their conditions'}
          </p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {favoriteLocationIds.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-300 mb-2">No favorites yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Add mountains to your favorites to quickly check their weather conditions.
            </p>
            <Link
              to="/search"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              Browse mountains
            </Link>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {favoriteLocationIds.map((locationId) => (
              <WeatherCard
                key={locationId}
                locationId={locationId}
                compact={false}
                showDetails={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
