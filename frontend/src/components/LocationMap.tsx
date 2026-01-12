import { useState, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl'
import { useQuery } from '@tanstack/react-query'
import { locationApi } from '@/api/client'
import type { Location } from '@/types'
import { MapPinIcon } from '@heroicons/react/24/solid'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LocationMapProps {
  locations?: Location[]
  center?: [number, number] // [lat, lng]
  zoom?: number
  onLocationSelect?: (location: Location) => void
  selectedLocationId?: string
  className?: string
  interactive?: boolean
  showPopups?: boolean
}

// Free dark map style from CartoDB
const DARK_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Color based on hiking score
const getMarkerColor = (score?: number): string => {
  if (!score) return '#10b981' // emerald-500 default
  if (score >= 7) return '#22c55e' // green - excellent
  if (score >= 5) return '#10b981' // emerald - good
  if (score >= 3) return '#f59e0b' // amber - moderate
  return '#ef4444' // red - poor/dangerous
}

// Marker size based on elevation
const getMarkerSize = (elevation?: number): number => {
  if (!elevation) return 24
  if (elevation >= 1200) return 32
  if (elevation >= 1000) return 28
  return 24
}

export function LocationMap({
  locations = [],
  center = [57.0, -5.0], // Center of Scottish Highlands
  zoom = 7,
  onLocationSelect,
  selectedLocationId,
  className = "w-full h-80 rounded-xl",
  interactive = true,
  showPopups = true
}: LocationMapProps) {
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: zoom,
    bearing: 0,
    pitch: 0
  })

  const [popupInfo, setPopupInfo] = useState<Location | null>(null)

  const handleMarkerClick = useCallback((location: Location) => {
    if (showPopups) {
      setPopupInfo(location)
    }
    onLocationSelect?.(location)
  }, [onLocationSelect, showPopups])

  // Group locations by area for clustering effect
  const markers = useMemo(() => {
    return locations.map((location) => {
      const isSelected = selectedLocationId === location.id
      const color = getMarkerColor(location.current_score)
      const size = getMarkerSize(location.elevation_m)

      return (
        <Marker
          key={location.id}
          latitude={location.latitude}
          longitude={location.longitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            handleMarkerClick(location)
          }}
        >
          <div
            className={`
              cursor-pointer transition-all duration-200
              hover:scale-110 hover:z-10
              ${isSelected ? 'scale-125 z-20' : ''}
            `}
            title={`${location.name} (${location.elevation_m}m)`}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                  transform: 'scale(2)',
                }}
              />
            )}

            {/* Mountain marker icon */}
            <div
              className={`
                relative flex items-center justify-center
                ${isSelected ? 'drop-shadow-lg' : 'drop-shadow-md'}
              `}
              style={{ width: size, height: size }}
            >
              <MapPinIcon
                className="w-full h-full"
                style={{
                  color: color,
                  filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none'
                }}
              />

              {/* Elevation indicator dot */}
              <div
                className="absolute top-1 w-2 h-2 rounded-full bg-white/90"
                style={{
                  boxShadow: `0 0 4px ${color}`
                }}
              />
            </div>
          </div>
        </Marker>
      )
    })
  }, [locations, selectedLocationId, handleMarkerClick])

  return (
    <div className={`map-container relative ${className}`}>
      <Map
        {...viewState}
        onMove={evt => interactive && setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={DARK_MAP_STYLE}
        interactive={interactive}
        attributionControl={false}
        onClick={() => setPopupInfo(null)}
      >
        {/* Navigation controls */}
        {interactive && (
          <NavigationControl
            position="top-right"
            showCompass={true}
            visualizePitch={true}
          />
        )}

        {/* Scale */}
        <ScaleControl position="bottom-left" />

        {/* Location markers */}
        {markers}

        {/* Popup for selected location */}
        {popupInfo && showPopups && (
          <Popup
            latitude={popupInfo.latitude}
            longitude={popupInfo.longitude}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="location-popup"
          >
            <div className="p-1">
              <h3 className="font-semibold text-slate-100 text-sm">
                {popupInfo.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {popupInfo.area} • {popupInfo.elevation_m}m
              </p>
              {popupInfo.current_score !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`
                      text-xs font-medium px-2 py-0.5 rounded-full
                      ${popupInfo.current_score >= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                        popupInfo.current_score >= 5 ? 'bg-emerald-600/20 text-emerald-300' :
                        popupInfo.current_score >= 3 ? 'bg-warning-500/20 text-warning-400' :
                        'bg-danger-500/20 text-danger-400'}
                    `}
                  >
                    Score: {popupInfo.current_score}/10
                  </span>
                </div>
              )}
              {onLocationSelect && (
                <button
                  onClick={() => onLocationSelect(popupInfo)}
                  className="mt-2 w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2 py-1 transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Map legend */}
      <div className="absolute bottom-3 right-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50 text-xs">
        <div className="text-slate-400 font-medium mb-1.5">Hiking Conditions</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-slate-300">Excellent (7+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Good (5-7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Moderate (3-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">Poor (&lt;3)</span>
          </div>
        </div>
      </div>

      {/* Location count badge */}
      <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50">
        <span className="text-emerald-400 font-semibold">{locations.length}</span>
        <span className="text-slate-400 text-sm ml-1">locations</span>
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
