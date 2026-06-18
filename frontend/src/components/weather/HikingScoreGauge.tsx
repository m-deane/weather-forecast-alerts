import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { scoreThresholds } from '@/utils/weather'

interface HikingScoreGaugeProps {
  score: number | null // 1-10, or null when no real score is available (estimated/scrape-failure path)
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showDescription?: boolean
  animated?: boolean
  variant?: 'gauge' | 'badge' | 'compact' | 'ring'
  className?: string
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive'
}

// Score to color mapping, adjusted by risk tolerance
const getScoreStyle = (score: number, riskTolerance?: string) => {
  const tolerance = (riskTolerance === 'conservative' || riskTolerance === 'aggressive')
    ? riskTolerance : 'moderate'
  const t = scoreThresholds[tolerance]

  if (score >= t.excellent) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      gradient: 'from-emerald-500 to-emerald-400',
      label: 'Excellent',
      description: 'Perfect conditions for hiking',
      ring: 'stroke-emerald-500'
    }
  }
  if (score >= t.good) {
    return {
      color: 'text-emerald-300',
      bg: 'bg-emerald-400',
      bgLight: 'bg-emerald-400/20',
      border: 'border-emerald-400/50',
      gradient: 'from-emerald-400 to-emerald-300',
      label: 'Good',
      description: 'Good conditions, some caution advised',
      ring: 'stroke-emerald-400'
    }
  }
  if (score >= t.moderate) {
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      gradient: 'from-amber-500 to-amber-400',
      label: 'Moderate',
      description: 'Challenging conditions, experience required',
      ring: 'stroke-amber-500'
    }
  }
  if (score >= t.poor) {
    return {
      color: 'text-orange-400',
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-500/20',
      border: 'border-orange-500/50',
      gradient: 'from-orange-500 to-orange-400',
      label: 'Poor',
      description: 'Difficult conditions, experts only',
      ring: 'stroke-orange-500'
    }
  }
  return {
    color: 'text-red-400',
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/20',
    border: 'border-red-500/50',
    gradient: 'from-red-500 to-red-400',
    label: 'Dangerous',
    description: 'Avoid - conditions are hazardous',
    ring: 'stroke-red-500'
  }
}

// Horizontal Gauge Variant
function GaugeVariant({
  score,
  style,
  showLabel,
  showDescription,
  animated,
  size
}: {
  score: number
  style: ReturnType<typeof getScoreStyle>
  showLabel: boolean
  showDescription: boolean
  animated: boolean
  size: 'sm' | 'md' | 'lg'
}) {
  const percentage = (score / 10) * 100

  const sizeClasses = {
    sm: { track: 'h-2', text: 'text-lg', label: 'text-xs' },
    md: { track: 'h-3', text: 'text-2xl', label: 'text-sm' },
    lg: { track: 'h-4', text: 'text-3xl', label: 'text-base' },
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          {showLabel && (
            <span className={cn('font-semibold', style.color, sizeClasses[size].label)}>
              {style.label}
            </span>
          )}
        </div>
        <div
          className={cn(
            'font-bold mono-nums',
            style.color,
            // Cinematic oversized hero numeral at the most prominent size only
            size === 'lg' ? 'hero-score' : sizeClasses[size].text
          )}
        >
          {score}<span className="text-slate-500 text-sm">/10</span>
        </div>
      </div>

      {/* Gauge Track */}
      <div className={cn('w-full bg-slate-700/50 rounded-full overflow-hidden', sizeClasses[size].track)}>
        <div
          className={cn(
            'h-full rounded-full transition-all ease-out',
            `bg-gradient-to-r ${style.gradient}`,
            animated ? 'duration-1000' : 'duration-0'
          )}
          style={{ width: animated ? `${percentage}%` : `${percentage}%` }}
        />
      </div>

      {/* Scale markers */}
      <div className="flex justify-between mt-1 text-xs text-slate-600">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>

      {/* Description */}
      {showDescription && (
        <p className="text-xs text-slate-500 mt-2">{style.description}</p>
      )}
    </div>
  )
}

// Badge Variant
function BadgeVariant({
  score,
  style,
  showLabel,
  size
}: {
  score: number
  style: ReturnType<typeof getScoreStyle>
  showLabel: boolean
  size: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: { container: 'px-2 py-1', text: 'text-sm', label: 'text-xs' },
    md: { container: 'px-3 py-1.5', text: 'text-lg', label: 'text-xs' },
    lg: { container: 'px-4 py-2', text: 'text-xl', label: 'text-sm' },
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        style.bgLight,
        style.border,
        sizeClasses[size].container
      )}
    >
      <span className={cn('font-bold mono-nums', style.color, sizeClasses[size].text)}>
        {score}
      </span>
      {showLabel && (
        <span className={cn('text-slate-300', sizeClasses[size].label)}>
          {style.label}
        </span>
      )}
    </div>
  )
}

// Compact Variant (just score)
function CompactVariant({
  score,
  style,
  size
}: {
  score: number
  style: ReturnType<typeof getScoreStyle>
  size: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <span className={cn('font-bold mono-nums', style.color, sizeClasses[size])}>
      {score}<span className="text-slate-500">/10</span>
    </span>
  )
}

// Ring/Circular Variant
function RingVariant({
  score,
  style,
  showLabel,
  size,
  animated
}: {
  score: number
  style: ReturnType<typeof getScoreStyle>
  showLabel: boolean
  size: 'sm' | 'md' | 'lg'
  animated: boolean
}) {
  const percentage = (score / 10) * 100
  const circumference = 2 * Math.PI * 40 // radius = 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-[8px]' },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
  }

  return (
    <div className={cn('relative', sizeClasses[size].container)}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-700/50"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn(style.ring, animated && 'transition-all duration-1000')}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: animated ? strokeDashoffset : strokeDashoffset,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold mono-nums', style.color, sizeClasses[size].text)}>
          {score}
        </span>
        {showLabel && (
          <span className={cn('text-slate-400 uppercase tracking-wider', sizeClasses[size].label)}>
            {style.label}
          </span>
        )}
      </div>
    </div>
  )
}

export function HikingScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  showDescription = false,
  animated = true,
  variant = 'gauge',
  className,
  riskTolerance
}: HikingScoreGaugeProps) {
  // Suppress entirely when there is no real score — never render a fabricated number
  const normalizedScore = useMemo(
    () => (score === null ? null : Math.max(1, Math.min(10, Math.round(score)))),
    [score]
  )
  const style = useMemo(
    () => getScoreStyle(normalizedScore ?? 0, riskTolerance),
    [normalizedScore, riskTolerance]
  )

  const content = useMemo(() => {
    if (normalizedScore === null) {
      const labelSize = size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-sm'
      return (
        <span
          className={cn('font-medium text-slate-500 mono-nums', labelSize)}
          title="Estimated data — hiking score unavailable"
        >
          —
        </span>
      )
    }
    switch (variant) {
      case 'badge':
        return <BadgeVariant score={normalizedScore} style={style} showLabel={showLabel} size={size} />
      case 'compact':
        return <CompactVariant score={normalizedScore} style={style} size={size} />
      case 'ring':
        return <RingVariant score={normalizedScore} style={style} showLabel={showLabel} size={size} animated={animated} />
      default:
        return (
          <GaugeVariant
            score={normalizedScore}
            style={style}
            showLabel={showLabel}
            showDescription={showDescription}
            animated={animated}
            size={size}
          />
        )
    }
  }, [variant, normalizedScore, style, showLabel, showDescription, animated, size])

  return <div className={className}>{content}</div>
}

// Export helper function
export { getScoreStyle }
