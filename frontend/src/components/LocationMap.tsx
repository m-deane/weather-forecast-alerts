import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { locationApi } from '@/api/client'
import type { Location } from '@/types'

interface LocationMapProps {
  locations?: Location[]
  center?: [number, number] // [lat, lng]
  zoom?: number
  onLocationSelect?: (location: Location) => void
  selectedLocationId?: string
  className?: string
}

export function LocationMap({
  locations = [],
  center = [57.0, -5.0], // Center of Scottish Highlands
  zoom = 8,
  onLocationSelect,
  selectedLocationId,
  className = "w-full h-64 rounded-lg"
}: LocationMapProps) {
  const [mapCenter, setMapCenter] = useState(center)
  const [mapZoom, setMapZoom] = useState(zoom)

  // For now, we'll create a simple placeholder map
  // In a full implementation, this would use Mapbox GL JS or similar
  
  return (
    <div className={`bg-gray-100 border border-gray-300 relative overflow-hidden ${className}`}>
      {/* Map placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-100 to-gray-100">
        {/* Scotland outline placeholder */}
        <svg 
          viewBox="0 0 400 600" 
          className="absolute inset-0 w-full h-full opacity-20"
          fill="currentColor"
        >
          {/* Simplified Scotland shape */}
          <path d="M200 50 C150 60 120 100 110 150 C100 200 120 250 140 300 C160 350 180 400 200 450 C220 400 240 350 260 300 C280 250 300 200 290 150 C280 100 250 60 200 50 Z" />
        </svg>
        
        {/* Location markers */}
        {locations.map((location, index) => {
          // Convert lat/lng to approximate pixel positions
          const x = ((location.longitude + 8) / 6) * 100 // Rough conversion for Scottish bounds
          const y = ((60 - location.latitude) / 4) * 100
          
          return (
            <button
              key={location.id}
              onClick={() => onLocationSelect?.(location)}
              className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125 ${
                selectedLocationId === location.id 
                  ? 'bg-primary-600 ring-2 ring-primary-300' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              style={{
                left: `${Math.max(5, Math.min(95, x))}%`,
                top: `${Math.max(5, Math.min(95, y))}%`
              }}
              title={`${location.name} (${location.elevation_m}m)`}
            />
          )
        })}
      </div>

      {/* Map controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => setMapZoom(Math.min(12, mapZoom + 1))}
          className="w-8 h-8 bg-white shadow-md rounded flex items-center justify-center text-gray-600 hover:text-gray-900"
        >
          +
        </button>
        <button
          onClick={() => setMapZoom(Math.max(6, mapZoom - 1))}
          className="w-8 h-8 bg-white shadow-md rounded flex items-center justify-center text-gray-600 hover:text-gray-900"
        >
          −
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Mountains</span>
        </div>
        {selectedLocationId && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
            <span>Selected</span>
          </div>
        )}
      </div>

      {/* Loading overlay for future map implementation */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
        {locations.length === 0 ? (
          'Loading locations...'
        ) : (
          `${locations.length} locations`
        )}
      </div>
    </div>
  )
}

// Hook for nearby locations
export function useNearbyLocations(lat?: number, lon?: number, radius = 50) {
  return useQuery({
    queryKey: ['locations', 'nearby', lat, lon, radius],
    queryFn: () => locationApi.getNearby(lat!, lon!, radius),
    enabled: lat !== undefined && lon !== undefined,
  })
}