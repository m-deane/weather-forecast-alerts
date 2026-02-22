import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { CloudIcon, SunIcon, CameraIcon } from '@heroicons/react/24/outline'

interface CloudInversionIndicatorProps {
  cloudBase?: number // meters
  freezingLevel?: number // meters
  summitElevation: number // meters
  humidity?: number // percentage
  windSpeed?: number // kph
  temperature?: number // celsius
  className?: string
}

type InversionPotential = 'high' | 'moderate' | 'low' | 'none'

function calculateInversionPotential(
  cloudBase: number | undefined,
  summitElevation: number,
  humidity: number | undefined,
  windSpeed: number | undefined,
  temperature: number | undefined
): { potential: InversionPotential; confidence: number; factors: string[] } {
  const factors: string[] = []
  let score = 0

  // Cloud base significantly below summit = key indicator
  if (cloudBase !== undefined) {
    if (cloudBase < summitElevation * 0.5) {
      score += 40
      factors.push('Cloud well below summit')
    } else if (cloudBase < summitElevation * 0.75) {
      score += 25
      factors.push('Cloud layer mid-mountain')
    } else if (cloudBase < summitElevation) {
      score += 10
      factors.push('Cloud near summit level')
    }
  }

  // Light winds favor inversions
  if (windSpeed !== undefined) {
    if (windSpeed < 10) {
      score += 25
      factors.push('Calm conditions')
    } else if (windSpeed < 20) {
      score += 15
      factors.push('Light winds')
    } else if (windSpeed > 40) {
      score -= 20
      factors.push('Strong winds (unlikely)')
    }
  }

  // High humidity in valleys + clear air above
  if (humidity !== undefined) {
    if (humidity > 85) {
      score += 15
      factors.push('High moisture levels')
    } else if (humidity > 70) {
      score += 10
      factors.push('Moderate humidity')
    }
  }

  // Cold overnight temperatures favor morning inversions
  if (temperature !== undefined) {
    if (temperature < 5) {
      score += 10
      factors.push('Cool air (favors morning fog)')
    }
  }

  // Determine potential level
  let potential: InversionPotential
  if (score >= 50) {
    potential = 'high'
  } else if (score >= 30) {
    potential = 'moderate'
  } else if (score >= 15) {
    potential = 'low'
  } else {
    potential = 'none'
  }

  return { potential, confidence: Math.min(100, Math.max(0, score)), factors }
}

const potentialStyles: Record<InversionPotential, { bg: string; border: string; text: string; label: string; icon: string }> = {
  high: {
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    label: 'HIGH',
    icon: '🏔️☀️',
  },
  moderate: {
    bg: 'bg-gradient-to-br from-yellow-500/15 to-amber-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    label: 'MODERATE',
    icon: '⛰️🌤️',
  },
  low: {
    bg: 'bg-gradient-to-br from-slate-500/15 to-slate-600/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    label: 'LOW',
    icon: '🌫️',
  },
  none: {
    bg: 'bg-slate-800/30',
    border: 'border-slate-700/30',
    text: 'text-slate-500',
    label: 'UNLIKELY',
    icon: '☁️',
  },
}

export function CloudInversionIndicator({
  cloudBase,
  freezingLevel,
  summitElevation,
  humidity,
  windSpeed,
  temperature,
  className,
}: CloudInversionIndicatorProps) {
  const { potential, confidence, factors } = useMemo(
    () => calculateInversionPotential(cloudBase, summitElevation, humidity, windSpeed, temperature),
    [cloudBase, summitElevation, humidity, windSpeed, temperature]
  )

  const style = potentialStyles[potential]

  // Calculate layer heights for visualization
  const summitY = 10
  const baseY = 90
  const cloudLayerY = cloudBase !== undefined
    ? baseY - ((cloudBase / summitElevation) * (baseY - summitY))
    : 60

  return (
    <div className={cn('card', style.bg, 'border', style.border, className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span className="text-lg">{style.icon}</span>
          Cloud Inversion
        </h3>
        <span className={cn('text-sm font-bold px-2 py-0.5 rounded', style.text, 'bg-slate-800/50')}>
          {style.label}
        </span>
      </div>

      {/* Visual Mountain Cross-Section */}
      <div className="relative h-32 mb-4 bg-gradient-to-b from-sky-900/30 via-slate-800/30 to-slate-700/30 rounded-lg overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Cloud layer (if present) */}
          {cloudBase !== undefined && cloudBase < summitElevation && (
            <rect
              x="0"
              y={cloudLayerY - 10}
              width="200"
              height="25"
              fill="url(#cloudGrad)"
              className="animate-pulse"
              style={{ animationDuration: '4s' }}
            />
          )}

          {/* Mountain silhouette */}
          <path
            d="M 0 95 L 30 95 L 50 70 L 70 55 L 90 35 L 100 15 L 110 35 L 130 50 L 150 65 L 170 75 L 200 95 L 200 100 L 0 100 Z"
            fill="currentColor"
            className="text-slate-700"
          />

          {/* Summit highlight if above cloud */}
          {potential !== 'none' && cloudBase !== undefined && cloudBase < summitElevation * 0.8 && (
            <>
              <path
                d="M 85 40 L 100 15 L 115 40 Z"
                fill="currentColor"
                className="text-emerald-500/30"
              />
              {/* Sun at summit */}
              <circle cx="100" cy="8" r="4" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 3px #fbbf24)' }} />
            </>
          )}

          {/* Valley mist indication */}
          {potential !== 'none' && (
            <rect
              x="0"
              y="80"
              width="200"
              height="15"
              fill="currentColor"
              className="text-slate-400/20"
            />
          )}

          {/* Elevation markers */}
          <text x="5" y="18" className="fill-slate-500 text-[7px]">{summitElevation}m</text>
          {cloudBase !== undefined && (
            <text x="5" y={cloudLayerY + 3} className="fill-slate-400 text-[7px]">☁️ {cloudBase}m</text>
          )}
          <text x="5" y="93" className="fill-slate-600 text-[7px]">Base</text>
        </svg>

        {/* Clear summit badge */}
        {potential === 'high' && (
          <div className="absolute top-2 right-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-0.5 text-xs text-amber-400 flex items-center gap-1">
            <SunIcon className="w-3 h-3" />
            Clear summit
          </div>
        )}
      </div>

      {/* Conditions Summary */}
      <div className="space-y-2">
        {/* Layer info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-slate-800/40 rounded px-2 py-1.5">
            <div className="text-xs text-slate-500">Summit</div>
            <div className="font-medium text-slate-200 mono-nums">{summitElevation}m</div>
          </div>
          <div className="bg-slate-800/40 rounded px-2 py-1.5">
            <div className="text-xs text-slate-500">Cloud Base</div>
            <div className="font-medium text-slate-200 mono-nums">
              {cloudBase !== undefined ? `${cloudBase}m` : 'Unknown'}
            </div>
          </div>
        </div>

        {/* Contributing factors */}
        {factors.length > 0 && (
          <div className="text-xs text-slate-400">
            <span className="text-slate-500">Factors:</span>{' '}
            {factors.join(' • ')}
          </div>
        )}

        {/* Insufficient data notice */}
        {humidity === undefined && (
          <div className="text-xs text-slate-500 italic">
            Humidity data unavailable - inversion estimate based on limited factors
          </div>
        )}

        {/* Photography tip for high potential */}
        {potential === 'high' && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-3">
            <CameraIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-amber-400 font-medium">Photography opportunity!</span>
              <p className="text-slate-400 mt-0.5">
                Classic Scottish inversion conditions. Summit may be above the cloud sea - spectacular views possible.
              </p>
            </div>
          </div>
        )}

        {/* What is inversion info */}
        {potential === 'none' && (
          <div className="text-xs text-slate-500 mt-2">
            Cloud inversions occur when cold air is trapped in valleys while summits stay clear -
            a magical Scottish mountain experience.
          </div>
        )}
      </div>
    </div>
  )
}
