import { useMemo } from 'react'
import { cn } from '@/utils/cn'

interface WindArrowProps {
  direction: string // Cardinal direction: N, NE, E, SE, S, SW, W, NW
  speed: number // km/h
  size?: 'sm' | 'md' | 'lg'
  showSpeed?: boolean
  showDirection?: boolean
  className?: string
  animated?: boolean
}

const sizeClasses = {
  sm: { container: 'w-8 h-8', arrow: 'w-5 h-5', text: 'text-xs' },
  md: { container: 'w-12 h-12', arrow: 'w-7 h-7', text: 'text-sm' },
  lg: { container: 'w-16 h-16', arrow: 'w-10 h-10', text: 'text-base' },
}

// Convert cardinal direction to degrees
const directionToDegrees = (direction: string): number => {
  const dirMap: Record<string, number> = {
    'N': 0,
    'NNE': 22.5,
    'NE': 45,
    'ENE': 67.5,
    'E': 90,
    'ESE': 112.5,
    'SE': 135,
    'SSE': 157.5,
    'S': 180,
    'SSW': 202.5,
    'SW': 225,
    'WSW': 247.5,
    'W': 270,
    'WNW': 292.5,
    'NW': 315,
    'NNW': 337.5,
  }
  return dirMap[direction.toUpperCase()] ?? 0
}

// Get color based on wind speed (Beaufort scale inspired)
const getWindColor = (speed: number): { bg: string; text: string; border: string; label: string } => {
  if (speed < 15) {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/50',
      label: 'Calm'
    }
  }
  if (speed < 30) {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      label: 'Light'
    }
  }
  if (speed < 50) {
    return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/50',
      label: 'Moderate'
    }
  }
  if (speed < 70) {
    return {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/50',
      label: 'Strong'
    }
  }
  return {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    label: 'Severe'
  }
}

// SVG Arrow pointing up (will be rotated)
const ArrowSVG = ({ className, color }: { className?: string; color: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M12 2L6 12h4v8h4v-8h4L12 2z"
      fill="currentColor"
      className={color}
    />
  </svg>
)

// Wind animation lines
const WindLines = ({ className, animated }: { className?: string; animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={cn(className, animated && 'animate-wind-flow')} fill="none">
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
      <path d="M2 8h6" />
      <path d="M4 12h8" />
      <path d="M2 16h5" />
    </g>
    <style>{`
      @keyframes wind-flow {
        0%, 100% { opacity: 0.3; transform: translateX(0); }
        50% { opacity: 0.6; transform: translateX(2px); }
      }
      .animate-wind-flow { animation: wind-flow 1.5s ease-in-out infinite; }
    `}</style>
  </svg>
)

export function WindArrow({
  direction,
  speed,
  size = 'md',
  showSpeed = true,
  showDirection = true,
  className,
  animated = true
}: WindArrowProps) {
  const degrees = useMemo(() => directionToDegrees(direction), [direction])
  const colors = useMemo(() => getWindColor(speed), [speed])
  const sizeConfig = sizeClasses[size]

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      {/* Arrow Container */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center',
          colors.bg,
          'border',
          colors.border,
          sizeConfig.container,
          animated && speed > 30 && 'animate-pulse'
        )}
      >
        {/* Wind effect lines for strong wind */}
        {speed > 50 && (
          <WindLines
            className={cn('absolute opacity-40', colors.text, sizeConfig.arrow)}
            animated={animated}
          />
        )}

        {/* Main Arrow */}
        <div
          style={{ transform: `rotate(${degrees}deg)` }}
          className="transition-transform duration-300"
        >
          <ArrowSVG
            className={cn(sizeConfig.arrow, colors.text)}
            color={colors.text}
          />
        </div>
      </div>

      {/* Speed and Direction Labels */}
      {(showSpeed || showDirection) && (
        <div className={cn('flex items-center gap-1', sizeConfig.text)}>
          {showSpeed && (
            <span className={cn('font-semibold mono-nums', colors.text)}>
              {speed}
              <span className="text-slate-500 ml-0.5">kph</span>
            </span>
          )}
          {showDirection && (
            <span className="text-slate-400 font-medium">
              {direction}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Compact inline version
interface WindIndicatorProps {
  direction: string
  speed: number
  className?: string
}

export function WindIndicatorInline({ direction, speed, className }: WindIndicatorProps) {
  const degrees = useMemo(() => directionToDegrees(direction), [direction])
  const colors = useMemo(() => getWindColor(speed), [speed])

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div
        style={{ transform: `rotate(${degrees}deg)` }}
        className="transition-transform duration-300"
      >
        <svg viewBox="0 0 16 16" className={cn('w-4 h-4', colors.text)}>
          <path d="M8 2L4 9h3v5h2V9h3L8 2z" fill="currentColor" />
        </svg>
      </div>
      <span className={cn('font-medium mono-nums', colors.text)}>
        {speed}
      </span>
      <span className="text-slate-500 text-sm">
        kph {direction}
      </span>
    </div>
  )
}

// Wind Speed Bar (horizontal visualization)
interface WindSpeedBarProps {
  speed: number
  maxSpeed?: number
  showLabel?: boolean
  className?: string
}

export function WindSpeedBar({ speed, maxSpeed = 100, showLabel = true, className }: WindSpeedBarProps) {
  const percentage = Math.min((speed / maxSpeed) * 100, 100)
  const colors = useMemo(() => getWindColor(speed), [speed])

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">Wind Speed</span>
          <span className={cn('text-sm font-semibold mono-nums', colors.text)}>
            {speed} kph
          </span>
        </div>
      )}
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            speed < 15 ? 'bg-emerald-500' :
            speed < 30 ? 'bg-emerald-400' :
            speed < 50 ? 'bg-amber-500' :
            speed < 70 ? 'bg-orange-500' :
            'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-600 mt-0.5">
          <span>Calm</span>
          <span>Light</span>
          <span>Strong</span>
          <span>Gale</span>
        </div>
      )}
    </div>
  )
}

export { directionToDegrees, getWindColor }
