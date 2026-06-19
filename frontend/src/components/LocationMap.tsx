import { useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { locationApi } from '@/api/client'
import type { Location } from '@/types'
import { getVerdict, VERDICT_TOKEN, VERDICT_GLYPH, type Verdict } from '@/lib/mapPalette'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
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
  // Real verdict data wired by call sites (Phase 3) — props only, zero fetches.
  // areaScores: today's AREA-AVERAGE hiking score keyed by area name (HomePage).
  // A pin whose area has no average stays hollow UNKNOWN — never fake green.
  areaScores?: Record<string, number>
  // beaconScore: the single-location true verdict (LocationPage), e.g.
  // currentDay.summary.overall_hiking_score. Applies to every rendered pin, so
  // pass it only on single-pin maps. null/undefined keeps the pin hollow UNKNOWN.
  beaconScore?: number | null
  // enableGuidedMoves: opt-in to Phase 4 guided re-framing (SearchPage only).
  // When the location set changes, the camera flies to the new bounds with a
  // distance-scaled, rate-limited move instead of an instant fit. Default false
  // preserves the existing instant MapBounds.fitBounds at every other call site.
  // Always reduced-motion-gated: under prefers-reduced-motion the move is instant.
  enableGuidedMoves?: boolean
}

// RainViewer API response shape (only the fields we use)
interface RainViewerResponse {
  radar: {
    past: Array<{ path: string }>
  }
}

// Create custom marker icon.
// Encoding is two-channel: the verdict TOKEN is the hue, the verdict GLYPH is
// the greyscale/colour-blind-safe channel. UNKNOWN (no real score) renders as a
// stroke-only HOLLOW teardrop so an absent score is never shown as fake green.
// All marker motion (pulse halo, hover scale) lives inside the inner <div> —
// never on .custom-marker, which Leaflet owns and re-applies translate3d to.
const createMarkerIcon = (verdict: Verdict, isSelected: boolean, elevation?: number): DivIcon => {
  const size = elevation && elevation >= 1200 ? 32 : elevation && elevation >= 1000 ? 28 : 24
  const glowSize = isSelected ? size * 2 : 0
  const token = VERDICT_TOKEN[verdict]
  const glyph = VERDICT_GLYPH[verdict]
  const isHollow = verdict === 'UNKNOWN'

  // Hollow UNKNOWN pins use a stroke-only teardrop (no fill); the others fill
  // with the verdict token. The halo glow + hover share the token colour.
  const teardropFill = isHollow ? 'none' : token
  const teardropStroke = isHollow ? token : 'none'
  const teardropStrokeWidth = isHollow ? 2 : 0

  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div class="custom-marker-inner" style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
        ${isSelected ? `
          <div style="
            position: absolute;
            inset: -${glowSize/4}px;
            background: radial-gradient(circle, ${token}40 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          "></div>
        ` : ''}
        <svg viewBox="0 0 24 24" style="
          width: 100%;
          height: 100%;
          fill: ${teardropFill};
          stroke: ${teardropStroke};
          stroke-width: ${teardropStrokeWidth};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) ${isSelected ? `drop-shadow(0 0 8px ${token})` : ''};
        ">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
        ${glyph ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -65%);
            color: #ffffff;
            font-size: ${Math.round(size * 0.42)}px;
            font-weight: 700;
            line-height: 1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
          ">${glyph}</div>
        ` : `
          <div style="
            position: absolute;
            top: 4px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            background: rgba(255,255,255,0.9);
            border-radius: 50%;
            box-shadow: 0 0 4px ${token};
          "></div>
        `}
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

// Guided re-framing controller (Phase 4, SearchPage only).
//
// A SIBLING useEffect to MapBounds — it does NOT replace or modify the existing
// MapBounds.fitBounds useEffect, which still owns the very first frame and every
// non-guided surface. This one owns subsequent re-frames when the filtered set
// changes: it flies to the new bounds with a distance-scaled duration clamped to
// the 0.6–1.2s scene band, rate-limited by a `moveend` latch so a fast burst of
// filter changes can't stack overlapping camera moves.
//
// The whole motion path is gated by the re-evaluating usePrefersReducedMotion
// hook (passed in as a prop so the matchMedia listener lives above this through
// Suspense): when reduced motion is requested the camera jumps instantly
// (fitBounds with animate:false — the bounds-equivalent of an instant setView,
// no flyTo, no rAF), and MapContainer's zoom/fade/markerZoom animations are
// switched off too — matching the OS preference live.
function GuidedBounds({ locations, prefersReducedMotion }: { locations: Location[]; prefersReducedMotion: boolean }) {
  const map = useMap()
  // Latch is true while a guided move is in flight; the next request is dropped
  // until `moveend` clears it. Survives re-renders via a ref (never triggers one).
  const movingRef = useRef(false)
  // Skip the very first run: MapBounds already framed the initial set, so the
  // guided controller should only animate on subsequent changes.
  const firstRunRef = useRef(true)

  useEffect(() => {
    if (locations.length === 0) return

    const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number])

    // First mount: let MapBounds own the initial frame; just align without motion.
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }

    // Reduced motion: instant jump, no animation, no latch needed.
    if (prefersReducedMotion) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: false })
      return
    }

    // Rate-limit: drop the request if a guided move is still in flight.
    if (movingRef.current) return

    // Distance-scale the duration: how far the camera centre must travel maps
    // linearly into the 0.6–1.2s scene band (CSS --dur-scene-fast/-slow).
    const currentCenter = map.getCenter()
    // Centre of the target bounds (simple mean of lat/lng extremes).
    const lats = bounds.map(b => b[0])
    const lngs = bounds.map(b => b[1])
    const destLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const destLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const distanceMeters = map.distance(currentCenter, [destLat, destLng])

    // Map 0..~120km onto 0.6..1.2s, clamped at both ends.
    const MIN_DURATION = 0.6
    const MAX_DURATION = 1.2
    const DISTANCE_FOR_MAX = 120_000 // metres at which the move reaches full length
    const scaled =
      MIN_DURATION +
      (MAX_DURATION - MIN_DURATION) * Math.min(distanceMeters / DISTANCE_FOR_MAX, 1)
    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, scaled))

    movingRef.current = true
    const clearLatch = () => {
      movingRef.current = false
      map.off('moveend', clearLatch)
    }
    map.on('moveend', clearLatch)

    // easeLinearity is Leaflet's scalar approximation of the scene bezier.
    map.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: 10,
      duration,
      easeLinearity: 0.25,
    })

    return () => {
      map.off('moveend', clearLatch)
      movingRef.current = false
    }
  }, [locations, map, prefersReducedMotion])

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
      className="map-glass-hud absolute top-14 left-3 rounded-lg p-2 z-[1000] hover:bg-slate-700/90 transition-colors"
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
  showPopups = true,
  areaScores,
  beaconScore,
  enableGuidedMoves = false
}: LocationMapProps) {
  // Re-evaluating reduced-motion gate (matchMedia + change listener). Mounted
  // here, ABOVE the MapContainer/Suspense boundary, so no un-guarded guided move
  // can fire through Suspense; it also flips live when the OS preference changes.
  const prefersReducedMotion = usePrefersReducedMotion()

  // Under reduced motion, disable Leaflet's own animation engines too, so even
  // the initial fit and any internal zoom land instantly (no flyTo, no fade).
  const animateMap = !prefersReducedMotion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_activePopup, setActivePopup] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRadar, setShowRadar] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resolve the real score for a pin (Phase 3 — props only, zero fetches).
  // Priority: explicit area average (HomePage) > single-beacon (LocationPage) >
  // per-location current_score. Anything else stays undefined -> hollow UNKNOWN,
  // never fake green. areaScores is keyed by area NAME; an area with no average
  // yields undefined here.
  const scoreFor = useCallback(
    (location: Location): number | null | undefined => {
      if (areaScores) return areaScores[location.area]
      if (beaconScore !== undefined) return beaconScore
      return location.current_score
    },
    [areaScores, beaconScore]
  )

  // The score legend ships only when at least one rendered pin carries a real
  // score. Today's plain list maps (no areaScores/beaconScore, undefined
  // current_score) still render no legend; the area-average and single-beacon
  // surfaces enable it correctly.
  const hasAnyScore = locations.some(l => scoreFor(l) != null)

  // Label the legend honestly: area averages are NOT individual-summit verdicts.
  const legendTitle = areaScores ? 'Hiking Conditions (area average)' : 'Hiking Conditions'

  // Detect the h-48 (192px) HomePage thumbnail so the glass HUD gates its blur
  // OFF there — a blurred surface inside a scrolling list is the costly case.
  const isThumbnail = /\bh-48\b/.test(className)

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
      className={`map-container relative ${isThumbnail ? 'map-container--thumbnail' : ''} ${className} ${isFullscreen ? 'fixed inset-0 z-[9999] !h-screen !w-screen !rounded-none' : ''}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: isFullscreen ? '0' : '0.75rem' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={true}
        zoomAnimation={animateMap}
        fadeAnimation={animateMap}
        markerZoomAnimation={animateMap}
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
        {/* Phase 4: guided re-framing sibling — owns subsequent re-frames only
            (skips the first run so it never fights MapBounds' initial fit). */}
        {enableGuidedMoves && locations.length > 0 && (
          <GuidedBounds locations={locations} prefersReducedMotion={prefersReducedMotion} />
        )}
        {interactive && <ResetViewControl locations={locations} center={center} zoom={zoom} />}

        {locations.map((location) => {
          const isSelected = selectedLocationId === location.id
          const score = scoreFor(location)
          const verdict = getVerdict(score)
          const icon = createMarkerIcon(verdict, isSelected, location.elevation_m)

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
                    {score != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${VERDICT_TOKEN[getVerdict(score)]}22`,
                            color: VERDICT_TOKEN[getVerdict(score)],
                          }}
                        >
                          {areaScores ? 'Area avg' : 'Score'}: {score}/10
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

      {/* Map legend — only renders when at least one location has a real score,
          so the honest "all-unknown" state ships no score legend at all. */}
      {hasAnyScore && (
        <div className="map-glass-hud absolute bottom-3 right-3 rounded-lg px-3 py-2 text-xs z-[1000]">
          <div className="text-slate-400 font-medium mb-1.5">{legendTitle}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VERDICT_TOKEN.GO }} />
              <span className="text-slate-300">Go (7+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VERDICT_TOKEN.CAUTION }} />
              <span className="text-slate-300">Caution (4-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VERDICT_TOKEN['NO-GO'] }} />
              <span className="text-slate-300">No-Go (&lt;4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'transparent', border: `1.5px solid ${VERDICT_TOKEN.UNKNOWN}` }}
              />
              <span className="text-slate-300">Unknown</span>
            </div>
          </div>
        </div>
      )}

      {/* Location count badge */}
      <div className="map-glass-hud absolute top-3 left-3 rounded-lg px-3 py-1.5 z-[1000]">
        <span className="text-emerald-400 font-semibold">{locations.length}</span>
        <span className="text-slate-400 text-sm ml-1">locations</span>
      </div>

      {/* Rain radar toggle button */}
      {interactive && (
        <button
          onClick={() => setShowRadar(prev => !prev)}
          className={`map-glass-hud absolute top-24 left-3 rounded-lg p-2 z-[1000] transition-colors ${
            showRadar
              ? 'border-emerald-500/70 text-emerald-400 hover:bg-emerald-900/30'
              : 'text-slate-300 hover:bg-slate-700/90'
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
          className="map-glass-hud absolute top-3 right-3 rounded-lg p-2 z-[1000] hover:bg-slate-700/90 transition-colors"
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
        }
        /* Hover scale lives on the inner child, never on .custom-marker:
           Leaflet 1.9.4 owns .leaflet-marker-icon and re-applies translate3d on
           every pan/zoom, so a transform on the wrapper would collide. The
           transition rides the reveal ease token (literal fallback preserves
           today's 0.2s ease). */
        .custom-marker-inner {
          transition: transform 0.2s var(--ease-reveal, ease);
        }
        .custom-marker:hover {
          z-index: 1000 !important;
        }
        .custom-marker:hover .custom-marker-inner {
          transform: scale(1.15);
        }
        .leaflet-popup-content-wrapper {
          background: linear-gradient(145deg, var(--map-ink, #1e293b) 0%, var(--map-ink-2, #0f172a) 100%);
          color: #e2e8f0;
          border-radius: 0.75rem;
          border: 1px solid var(--map-hairline, #334155);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        .leaflet-popup-tip {
          background: var(--map-ink, #1e293b);
          border: 1px solid var(--map-hairline, #334155);
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
          color: var(--map-mute, #64748b) !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e2e8f0 !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-control-zoom a {
          background: var(--map-ink, #1e293b) !important;
          color: #e2e8f0 !important;
          border: 1px solid var(--map-hairline, #334155) !important;
          transition: all 0.2s var(--ease-reveal, ease) !important;
        }
        .leaflet-control-zoom a:hover {
          background: var(--map-hairline, #334155) !important;
          color: #10b981 !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.9) !important;
          color: var(--map-mute, #64748b) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
        .leaflet-control-attribution a:hover {
          color: #10b981 !important;
        }
        /* Emerald tint on map tiles to match app theme — LEAVE AS-IS (§3.7):
           varising this changes no behaviour and still tints the radar pane. */
        .leaflet-tile-pane {
          filter: sepia(0.2) hue-rotate(120deg) saturate(0.6) brightness(0.9);
        }
        /* Fullscreen specific styles */
        .map-container:fullscreen .leaflet-container {
          border-radius: 0 !important;
        }
        .map-container:fullscreen {
          background: var(--map-ink-2, #0f172a);
        }
        /* Dark theme for LayersControl */
        .leaflet-control-layers {
          background: rgba(30, 41, 59, 0.95) !important;
          border: 1px solid var(--map-hairline, #334155) !important;
          border-radius: 0.5rem !important;
          color: #e2e8f0 !important;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-control-layers-toggle {
          background-color: var(--map-ink, #1e293b) !important;
          border: 1px solid var(--map-hairline, #334155) !important;
          border-radius: 0.5rem !important;
          width: 32px !important;
          height: 32px !important;
        }
        .leaflet-control-layers-separator {
          border-top-color: var(--map-hairline, #334155) !important;
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
