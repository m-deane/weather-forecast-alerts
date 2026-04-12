/**
 * WindAnimationMap - Placeholder for future canvas-based wind particle animation.
 *
 * Future implementation plan:
 * - Use an HTML5 Canvas overlay on a Leaflet map
 * - Fetch wind vector data (e.g., GFS/ECMWF gridded wind fields)
 * - Render animated particles that follow wind streamlines
 * - Particle speed and density driven by real wind speed data
 * - Color particles by wind speed (green -> yellow -> red)
 *
 * Libraries to consider:
 * - leaflet-velocity (Leaflet plugin for wind/ocean current animation)
 * - Custom canvas implementation with requestAnimationFrame
 */

interface WindAnimationMapProps {
  /** Center coordinates [lat, lng] */
  center?: [number, number]
  /** Zoom level */
  zoom?: number
  /** CSS class name for the container */
  className?: string
  /** Wind data grid (future: replace with actual wind vector type) */
  windData?: unknown
}

export function WindAnimationMap({
  className = 'w-full h-80 rounded-xl',
}: WindAnimationMapProps) {
  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-800/50 border border-slate-700/50`}
    >
      <div className="text-center px-6">
        <div className="text-slate-400 text-lg font-medium mb-2">
          Wind animation coming soon
        </div>
        <p className="text-slate-500 text-sm max-w-md">
          This feature will display animated wind particles flowing across the map,
          driven by real forecast wind data for Scottish mountain areas.
        </p>
      </div>
    </div>
  )
}

export default WindAnimationMap
