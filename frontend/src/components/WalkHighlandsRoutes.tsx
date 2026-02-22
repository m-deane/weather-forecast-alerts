import { useQuery } from '@tanstack/react-query'
import {
  MapIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { integrationsApi } from '@/api/client'
import type { WalkHighlandsRoute } from '@/types'
import { cn } from '@/utils/cn'

interface WalkHighlandsRoutesProps {
  locationId: string
  hikingScore?: number
}

function getGradeLabel(grade: number): string {
  switch (grade) {
    case 1: return 'Easy'
    case 2: return 'Moderate'
    case 3: return 'Moderate/Hard'
    case 4: return 'Hard'
    case 5: return 'Very Hard'
    default: return 'Unknown'
  }
}

function getGradeColor(grade: number): string {
  switch (grade) {
    case 1: return 'text-emerald-400'
    case 2: return 'text-emerald-400'
    case 3: return 'text-yellow-400'
    case 4: return 'text-orange-400'
    case 5: return 'text-red-400'
    default: return 'text-slate-400'
  }
}

function getWeatherRouteCompatibility(hikingScore: number | undefined, estimatedHours: number): { label: string; color: string } {
  if (hikingScore === undefined) return { label: 'Unknown', color: 'text-slate-400' }
  // Longer routes are more affected by bad weather
  const durationPenalty = estimatedHours > 6 ? 1 : estimatedHours > 4 ? 0.5 : 0
  const adjustedScore = hikingScore - durationPenalty
  if (adjustedScore >= 7) return { label: 'Good', color: 'text-emerald-400' }
  if (adjustedScore >= 5) return { label: 'Caution', color: 'text-yellow-400' }
  return { label: 'Poor', color: 'text-red-400' }
}

export function WalkHighlandsRoutes({ locationId, hikingScore }: WalkHighlandsRoutesProps) {
  const { data: routes } = useQuery({
    queryKey: ['routes', locationId],
    queryFn: () => integrationsApi.getRoutes(locationId),
    enabled: !!locationId,
  })

  if (!routes || routes.length === 0) {
    return null
  }

  return (
    <section className="fade-in-up">
      <h2 className="section-title flex items-center gap-2 mb-3">
        <MapIcon className="w-5 h-5 text-emerald-400" />
        Walking Routes
      </h2>
      <div className="space-y-3">
        {routes.map((route, index) => {
          const compatibility = getWeatherRouteCompatibility(hikingScore, route.estimated_hours)
          return (
            <div key={index} className="card hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">{route.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{route.category}</p>
                </div>
                <a
                  href={route.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0"
                >
                  Walk Highlands
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Distance</div>
                    <div className="text-slate-200 mono-nums">{route.distance_km} km</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Ascent</div>
                    <div className="text-slate-200 mono-nums">{route.ascent_m}m</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Time</div>
                    <div className="text-slate-200 mono-nums">{route.estimated_hours}h</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Grade</div>
                  <div className={cn('font-medium', getGradeColor(route.grade))}>
                    {getGradeLabel(route.grade)}
                  </div>
                </div>
              </div>

              {/* Weather-route compatibility */}
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/50">
                <span className="text-slate-500">Weather compatibility</span>
                <span className={cn('font-medium', compatibility.color)}>
                  {compatibility.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Route data from{' '}
        <a href="https://www.walkhighlands.co.uk" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400">
          Walk Highlands
        </a>
      </p>
    </section>
  )
}
