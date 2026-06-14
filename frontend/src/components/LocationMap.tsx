import { useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { locationApi } from '@/api/client'
import type { Location } from '@/types'
import 'leaflet/dist/leaflet.css'
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MapIcon,
  CloudIcon
} from '@heroicons/react/24/outline'

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

// RainViewer API response shape (only the fields we use)
interface RainViewerResponse {
  radar: {
    past: Array<{ path: string }>
  }
}

// Color based on hiking score
const getMarkerColor = (score?: number): string => {
  if (!score) return '#10b981' // emerald-500 default
  if (score >= 7) return '#22c55e' // green - excellent
  if (score >= 5) return '#10b981' // emerald - good
  if (score >= 3) return '#f59e0b' // amber - moderate
  return '#ef4444' // red - poor/dangerous
}

// Create custom marker icon
const createMarkerIcon = (color: string, isSelected: boolean, elevation?: number): DivIcon => {
  const size = elevation && elevation >= 1200 ? 32 : elevation && elevation >= 1000 ? 28 : 24
  const glowSize = isSelected ? size * 2 : 0

  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
        ${isSelected ? `
          <div style="
            position: absolute;
            inset: -${glowSize/4}px;
            background: radial-gradient(circle, ${color}40 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          "></div>
        ` : ''}
        <svg viewBox="0 0 24 24" style="
          width: 100%;
          height: 100%;
          fill: ${color};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) ${isSelected ? `drop-shadow(0 0 8px ${color})` : ''};
        ">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
        <div style="
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          box-shadow: 0 0 4px ${color};
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

// Map bounds handler
function MapBounds({ locations }: { locations: Location[] }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
    }
  }, [locations, map])

  return null
}

// Reset view control component
function ResetViewControl({ locations, center, zoom }: { locations: Location[], center: [number, number], zoom: number }) {
  const map = useMap()

  const handleResetView = () => {
    if (locations.length > 1) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true })
    } else {
      map.setView(center, zoom, { animate: true })
    }
  }

  return (
    <button
      onClick={handleResetView}
      className="absolute top-14 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50 z-[1000] hover:bg-slate-700/90 transition-colors"
      title="Reset map view"
      aria-label="Reset map view"
    >
      <MapIcon className="w-4 h-4 text-slate-300" />
    </button>
  )
}

// Rain radar overlay component that fetches the latest radar timestamp from RainViewer
function RainRadarOverlay({ visible }: { visible: boolean }) {
  const [radarPath, setRadarPath] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return

    let cancelled = false

    async function fetchRadarTimestamp() {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const data: RainViewerResponse = await response.json()
        const pastFrames = data.radar?.past
        if (!cancelled && pastFrames && pastFrames.length > 0) {
          // Use the most recent radar frame
          setRadarPath(pastFrames[pastFrames.length - 1].path)
        }
      } catch {
        // RainViewer API unavailable - silently fail, radar just won't show
      }
    }

    fetchRadarTimestamp()

    // Refresh radar timestamp every 5 minutes (300000ms) to keep overlay current
    const interval = setInterval(fetchRadarTimestamp, 300000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [visible])

  if (!visible || !radarPath) return null

  return (
    <TileLayer
      url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`}
      attribution='<a href="https://www.rainviewer.com/">RainViewer</a>'
      opacity={0.5}
      zIndex={400}
    />
  )
}

export default function LocationMap({
  locations = [],
  center = [57.0, -5.0], // Center of Scottish Highlands
  zoom = 7,
  onLocationSelect,
  selectedLocationId,
  className = "w-full h-80 rounded-xl",
  interactive = true,
  showPopups = true
}: LocationMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_activePopup, setActivePopup] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRadar, setShowRadar] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  const handleMarkerClick = useCallback((location: Location) => {
    if (showPopups) {
      setActivePopup(location.id)
    }
    onLocationSelect?.(location)
  }, [onLocationSelect, showPopups])

  // Tile layer URLs and attributions
  const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  const darkAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  const topoTileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  const topoAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

  // OpenWeatherMap tile layers require an API key.
  // To enable, set VITE_OWM_API_KEY in your frontend .env file.
  // Available layers: wind_new, clouds_new, precipitation_new
  // Tile format: https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API_KEY}
  // These are left as commented configuration for when an API key is available:
  //
  // const owmApiKey = import.meta.env.VITE_OWM_API_KEY
  // const owmWindUrl = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${owmApiKey}`
  // const owmCloudsUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${owmApiKey}`
  // const owmPrecipUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmApiKey}`

  return (
    <div
      ref={containerRef}
      className={`map-container relative ${className} ${isFullscreen ? 'fixed inset-0 z-[9999] !h-screen !w-screen !rounded-none' : ''}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: isFullscreen ? '0' : '0.75rem' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={true}
      >
        {/* Base layer switcher: Standard (dark) and Topographic */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard">
            <TileLayer
              url={darkTileUrl}
              attribution={darkAttribution}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topographic">
            <TileLayer
              url={topoTileUrl}
              attribution={topoAttribution}
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Rain radar overlay (toggled via custom button below) */}
        <RainRadarOverlay visible={showRadar} />

        {locations.length > 1 && <MapBounds locations={locations} />}
        {interactive && <ResetViewControl locations={locations} center={center} zoom={zoom} />}

        {locations.map((location) => {
          const isSelected = selectedLocationId === location.id
          const color = getMarkerColor(location.current_score)
          const icon = createMarkerIcon(color, isSelected, location.elevation_m)

          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerClick(location),
              }}
            >
              {showPopups && (
                <Popup className="dark-popup">
                  <div className="p-1 min-w-[150px]">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {location.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {location.area} &bull; {location.elevation_m}m
                    </p>
                    {location.current_score !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`
                            text-xs font-medium px-2 py-0.5 rounded-full
                            ${location.current_score >= 7 ? 'bg-green-100 text-green-700' :
                              location.current_score >= 5 ? 'bg-emerald-100 text-emerald-700' :
                              location.current_score >= 3 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'}
                          `}
                        >
                          Score: {location.current_score}/10
                        </span>
                      </div>
                    )}
                    {onLocationSelect && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onLocationSelect(location)
                        }}
                        className="mt-2 w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2 py-1 transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </Popup>
              )}
            </Marker>
          )
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-3 right-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50 text-xs z-[1000]">
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
      <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50 z-[1000]">
        <span className="text-emerald-400 font-semibold">{locations.length}</span>
        <span className="text-slate-400 text-sm ml-1">locations</span>
      </div>

      {/* Rain radar toggle button */}
      {interactive && (
        <button
          onClick={() => setShowRadar(prev => !prev)}
          className={`absolute top-24 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border z-[1000] transition-colors ${
            showRadar
              ? 'border-emerald-500/70 text-emerald-400 hover:bg-emerald-900/30'
              : 'border-slate-700/50 text-slate-300 hover:bg-slate-700/90'
          }`}
          title={showRadar ? 'Hide rain radar' : 'Show rain radar'}
          aria-label={showRadar ? 'Hide rain radar' : 'Show rain radar'}
          aria-pressed={showRadar}
        >
          <CloudIcon className="w-4 h-4" />
        </button>
      )}

      {/* Fullscreen toggle button */}
      {interactive && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50 z-[1000] hover:bg-slate-700/90 transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="w-4 h-4 text-slate-300" />
          ) : (
            <ArrowsPointingOutIcon className="w-4 h-4 text-slate-300" />
          )}
        </button>
      )}

      {/* Add CSS for marker animation and layer control dark theme */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes marker-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .custom-marker {
          background: none !important;
          border: none !important;
          transition: transform 0.2s ease;
        }
        .custom-marker:hover {
          transform: scale(1.15);
          z-index: 1000 !important;
        }
        .leaflet-popup-content-wrapper {
          background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
          color: #e2e8f0;
          border-radius: 0.75rem;
          border: 1px solid #334155;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        .leaflet-popup-tip {
          background: #1e293b;
          border: 1px solid #334155;
          border-top: none;
          border-left: none;
        }
        .leaflet-popup-content {
          margin: 10px 14px;
        }
        .leaflet-popup-content h3 {
          color: #f1f5f9;
        }
        .leaflet-popup-content p {
          color: #94a3b8;
        }
        .leaflet-popup-close-button {
          color: #64748b !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e2e8f0 !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border: 1px solid #334155 !important;
          transition: all 0.2s ease !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
          color: #10b981 !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.9) !important;
          color: #64748b !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
        .leaflet-control-attribution a:hover {
          color: #10b981 !important;
        }
        /* Emerald tint on map tiles to match app theme */
        .leaflet-tile-pane {
          filter: sepia(0.2) hue-rotate(120deg) saturate(0.6) brightness(0.9);
        }
        /* Fullscreen specific styles */
        .map-container:fullscreen .leaflet-container {
          border-radius: 0 !important;
        }
        .map-container:fullscreen {
          background: #0f172a;
        }
        /* Dark theme for LayersControl */
        .leaflet-control-layers {
          background: rgba(30, 41, 59, 0.95) !important;
          border: 1px solid #334155 !important;
          border-radius: 0.5rem !important;
          color: #e2e8f0 !important;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-control-layers-toggle {
          background-color: #1e293b !important;
          border: 1px solid #334155 !important;
          border-radius: 0.5rem !important;
          width: 32px !important;
          height: 32px !important;
        }
        .leaflet-control-layers-separator {
          border-top-color: #334155 !important;
        }
        .leaflet-control-layers label {
          color: #cbd5e1 !important;
        }
        .leaflet-control-layers label span {
          color: #cbd5e1 !important;
        }
      `}</style>
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
