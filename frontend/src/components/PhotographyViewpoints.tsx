import { useQuery } from '@tanstack/react-query'
import {
  SunIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { integrationsApi } from '@/api/client'
import type { PhotographyViewpointData, PhotographyViewpoint } from '@/types'
import { cn } from '@/utils/cn'

interface PhotographyViewpointsProps {
  locationId: string
}

const lightColors: Record<string, string> = {
  morning: 'text-amber-400',
  evening: 'text-orange-400',
  any: 'text-slate-300',
}

const lightLabels: Record<string, string> = {
  morning: 'Morning light',
  evening: 'Evening light',
  any: 'Any time',
}

function CompassBearing({ bearing }: { bearing: number }) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  const direction = directions[index]

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-8 h-8 rounded-full border border-slate-600 bg-slate-800/50">
        <div
          className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-emerald-400 rounded-full origin-bottom"
          style={{
            transform: `translate(-50%, -100%) rotate(${bearing}deg)`,
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
      <span className="text-xs text-slate-400 mono-nums">{bearing}° {direction}</span>
    </div>
  )
}

export function PhotographyViewpoints({ locationId }: PhotographyViewpointsProps) {
  const { data } = useQuery({
    queryKey: ['photography-viewpoints', locationId],
    queryFn: () => integrationsApi.getPhotographyViewpoints(locationId),
    enabled: !!locationId,
  })

  if (!data) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm">No viewpoint data available for this location</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Photography notes */}
      {data.photography_notes && (
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <p className="text-sm text-slate-300 leading-relaxed">{data.photography_notes}</p>
        </div>
      )}

      {/* Best seasons */}
      {data.best_seasons && data.best_seasons.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Best seasons:</span>
          {data.best_seasons.map((season) => (
            <span key={season} className="text-xs px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 capitalize">
              {season}
            </span>
          ))}
        </div>
      )}

      {/* Viewpoint cards */}
      <div className="space-y-3">
        {data.key_viewpoints.map((viewpoint, index) => (
          <div key={index} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="text-sm font-semibold text-slate-100">{viewpoint.name}</h4>
              <div className={cn('flex items-center gap-1 text-xs', lightColors[viewpoint.optimal_light] || 'text-slate-400')}>
                <SunIcon className="w-3.5 h-3.5" />
                {lightLabels[viewpoint.optimal_light] || viewpoint.optimal_light}
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-3">{viewpoint.description}</p>

            <div className="flex items-center justify-between">
              <CompassBearing bearing={viewpoint.compass_bearing} />
              <div className="flex flex-wrap gap-1 justify-end">
                {viewpoint.subjects.map((subject) => (
                  <span key={subject} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fotovue guide link */}
      {data.fotovue_guide_url && (
        <a
          href={data.fotovue_guide_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-900/10 transition-all"
        >
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">
              {data.fotovue_guide_name || 'Photography Guide'}
            </div>
            <div className="text-xs text-slate-500">Fotovue photography guidebook</div>
          </div>
          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-emerald-400" />
        </a>
      )}
    </div>
  )
}
