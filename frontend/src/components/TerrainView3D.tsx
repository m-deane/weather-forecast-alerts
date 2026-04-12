/**
 * TerrainView3D - Placeholder for future Three.js-based 3D terrain visualization.
 *
 * Future implementation plan:
 * - Use Three.js (or react-three-fiber) for WebGL rendering
 * - Load OS Terrain 50 or SRTM elevation data as a heightmap
 * - Drape satellite/topo imagery onto the 3D mesh
 * - Overlay weather data (cloud layer, precipitation zones) at altitude
 * - Camera controls: orbit, pan, zoom around the mountain
 * - Show hiking routes as 3D polylines on the terrain surface
 * - Visualize freezing level and cloud base as horizontal planes
 *
 * Libraries to consider:
 * - three / @react-three/fiber + @react-three/drei
 * - Mapbox GL JS with 3D terrain (requires API key)
 * - CesiumJS for globe-scale 3D terrain
 */

interface TerrainView3DProps {
  /** Mountain name for display */
  name?: string
  /** Center coordinates [lat, lng] */
  center?: [number, number]
  /** Elevation in meters (used for camera positioning) */
  elevation?: number
  /** CSS class name for the container */
  className?: string
  /** Freezing level in meters (future: render as horizontal plane) */
  freezingLevel?: number
  /** Cloud base in meters (future: render as cloud layer) */
  cloudBase?: number
}

export function TerrainView3D({
  name,
  className = 'w-full h-80 rounded-xl',
}: TerrainView3DProps) {
  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-800/50 border border-slate-700/50`}
    >
      <div className="text-center px-6">
        <div className="text-slate-400 text-lg font-medium mb-2">
          3D terrain visualization coming soon
        </div>
        <p className="text-slate-500 text-sm max-w-md">
          {name
            ? `An interactive 3D view of ${name} with elevation data, weather overlays, and hiking routes.`
            : 'An interactive 3D terrain view with elevation data, weather overlays, and hiking routes.'}
        </p>
      </div>
    </div>
  )
}

export default TerrainView3D
