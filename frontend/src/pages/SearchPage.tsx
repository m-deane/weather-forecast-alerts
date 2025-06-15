import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { locationApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/utils/cn'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { LocationDetection } from '@/components/LocationDetection'
import type { Location } from '@/types'

interface FilterOptions {
  area: string
  classification: string
  difficulty: string
  elevation: { min: number; max: number }
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    area: searchParams.get('area') || '',
    classification: '',
    difficulty: '',
    elevation: { min: 0, max: 2000 }
  })
  
  const { addRecent, isFavorite, addFavorite, removeFavorite } = useAppStore()

  // Search locations - show all if query is empty
  const { data: locations = [], isLoading, error } = useQuery({
    queryKey: ['locations', 'search', query],
    queryFn: () => locationApi.search(query),
    enabled: true, // Always enabled, API handles empty queries
  })

  // Get areas for filter dropdown
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: locationApi.getAreas,
  })

  // Filter locations based on filters
  const filteredLocations = useMemo(() => {
    let filtered = locations

    if (filters.area) {
      filtered = filtered.filter(loc => 
        loc.area.toLowerCase().includes(filters.area.toLowerCase())
      )
    }

    if (filters.classification) {
      filtered = filtered.filter(loc => loc.classification === filters.classification)
    }

    if (filters.difficulty) {
      filtered = filtered.filter(loc => loc.difficulty === filters.difficulty)
    }

    filtered = filtered.filter(loc => 
      loc.elevation_m >= filters.elevation.min && 
      loc.elevation_m <= filters.elevation.max
    )

    return filtered
  }, [locations, filters])

  // Handle search input
  const handleSearch = (value: string) => {
    setQuery(value)
    if (value) {
      setSearchParams(prev => {
        prev.set('q', value)
        return prev
      })
    } else {
      setSearchParams(prev => {
        prev.delete('q')
        return prev
      })
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      area: '',
      classification: '',
      difficulty: '',
      elevation: { min: 0, max: 2000 }
    })
    setSearchParams(prev => {
      prev.delete('area')
      return prev
    })
  }

  // Handle location click
  const handleLocationClick = (locationId: string) => {
    addRecent(locationId)
  }

  // Handle location selection from GPS
  const handleLocationSelect = (location: any) => {
    addRecent(location.id)
    window.location.href = `/location/${location.id}`
  }

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    // Refetch locations if there's a query
    if (query.length >= 2) {
      // This will trigger a refetch via React Query
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 safe-top">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold mb-4">Search Mountains</h1>
          
          {/* Search input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search mountains..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            Filters
            {(filters.area || filters.classification || filters.difficulty) && (
              <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Area filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                value={filters.area}
                onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All areas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.name}>
                    {area.name} ({area.locationCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Classification filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classification
              </label>
              <select
                value={filters.classification}
                onChange={(e) => setFilters(prev => ({ ...prev, classification: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All types</option>
                <option value="munro">Munros (914m+)</option>
                <option value="corbett">Corbetts (762-914m)</option>
                <option value="graham">Grahams (610-762m)</option>
                <option value="hill">Hills (&lt;610m)</option>
              </select>
            </div>

            {/* Elevation range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Elevation: {filters.elevation.min}m - {filters.elevation.max}m
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={filters.elevation.min}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    elevation: { ...prev.elevation, min: Number(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={filters.elevation.max}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    elevation: { ...prev.elevation, max: Number(e.target.value) }
                  }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 py-4 space-y-6">
          {/* Location Detection */}
          {query.length < 2 && !filters.area && (
            <LocationDetection 
              locations={locations}
              onLocationSelect={handleLocationSelect}
            />
          )}

          {query.length < 2 && !filters.area ? (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for mountains</h3>
              <p className="text-gray-500">Enter at least 2 characters to search or use location services</p>
            </div>
        ) : isLoading ? (
          <LoadingSkeleton count={5} height={80} />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading locations</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No mountains found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
            </p>
            
            {filteredLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                isFavorite={isFavorite(location.id)}
                onFavoriteToggle={() => 
                  isFavorite(location.id) 
                    ? removeFavorite(location.id)
                    : addFavorite(location.id)
                }
                onClick={() => handleLocationClick(location.id)}
              />
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>
    </div>
  )
}

interface LocationCardProps {
  location: Location
  isFavorite: boolean
  onFavoriteToggle: () => void
  onClick: () => void
}

function LocationCard({ location, isFavorite, onFavoriteToggle, onClick }: LocationCardProps) {
  const classificationColors = {
    munro: 'bg-purple-100 text-purple-800',
    corbett: 'bg-blue-100 text-blue-800',
    graham: 'bg-green-100 text-green-800',
    hill: 'bg-gray-100 text-gray-800',
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    challenging: 'bg-orange-100 text-orange-800',
    extreme: 'bg-red-100 text-red-800',
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <Link
          to={`/location/${location.id}`}
          onClick={onClick}
          className="flex-1 min-w-0"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
              <p className="text-sm text-gray-500">{location.area}</p>
              <p className="text-sm text-gray-500">{location.elevation_m}m</p>
            </div>
            <div className="ml-3 space-y-1">
              <span className={cn(
                'inline-block px-2 py-1 text-xs font-medium rounded-full',
                classificationColors[location.classification]
              )}>
                {location.classification}
              </span>
              <br />
              <span className={cn(
                'inline-block px-2 py-1 text-xs font-medium rounded-full',
                difficultyColors[location.difficulty]
              )}>
                {location.difficulty}
              </span>
            </div>
          </div>
        </Link>
        
        <button
          onClick={(e) => {
            e.preventDefault()
            onFavoriteToggle()
          }}
          className={cn(
            'ml-2 p-2 rounded-full transition-colors',
            isFavorite 
              ? 'text-red-500 hover:text-red-600' 
              : 'text-gray-400 hover:text-red-500'
          )}
        >
          <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}