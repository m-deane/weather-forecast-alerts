import { useMemo } from 'react'
import { cn } from '@/utils/cn'

interface TemperatureDisplayProps {
  temperature: number // Celsius
  feelsLike?: number
  unit?: 'C' | 'F'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showUnit?: boolean
  showFeelsLike?: boolean
  showIcon?: boolean
  variant?: 'default' | 'badge' | 'compact'
  className?: string
}

// Temperature to color mapping (Scottish mountain context - cold biased)
const getTemperatureStyle = (temp: number) => {
  if (temp <= -10) {
    return {
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      label: 'Extreme Cold',
      icon: '🥶'
    }
  }
  if (temp <= 0) {
    return {
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-500/50',
      label: 'Freezing',
      icon: '❄️'
    }
  }
  if (temp <= 5) {
    return {
      color: 'text-sky-400',
      bg: 'bg-sky-500/20',
      border: 'border-sky-500/50',
      label: 'Cold',
      icon: '🌡️'
    }
  }
  if (temp <= 10) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      label: 'Cool',
      icon: '🍃'
    }
  }
  if (temp <= 15) {
    return {
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/20',
      border: 'border-emerald-400/50',
      label: 'Mild',
      icon: '🌤️'
    }
  }
  if (temp <= 20) {
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      label: 'Warm',
      icon: '☀️'
    }
  }
  if (temp <= 25) {
    return {
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/50',
      label: 'Hot',
      icon: '🔥'
    }
  }
  return {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    label: 'Very Hot',
    icon: '🌡️'
  }
}

const sizeClasses = {
  xs: { text: 'text-sm', unit: 'text-xs', feels: 'text-xs' },
  sm: { text: 'text-lg', unit: 'text-sm', feels: 'text-xs' },
  md: { text: 'text-2xl', unit: 'text-base', feels: 'text-sm' },
  lg: { text: 'text-3xl', unit: 'text-lg', feels: 'text-sm' },
  xl: { text: 'text-4xl', unit: 'text-xl', feels: 'text-base' },
}

// Convert Celsius to Fahrenheit
const celsiusToFahrenheit = (celsius: number): number => {
  return Math.round((celsius * 9/5) + 32)
}

// Thermometer Icon SVG
const ThermometerIcon = ({ className, temperature }: { className?: string; temperature: number }) => {
  const style = getTemperatureStyle(temperature)
  // Fill height based on temperature (-20 to 40 range mapped to 0-100%)
  const fillPercent = Math.max(0, Math.min(100, ((temperature + 20) / 60) * 100))

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      {/* Thermometer outline */}
      <path
        d="M12 15V4a2 2 0 1 0-4 0v11a4 4 0 1 0 4 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-600"
      />
      {/* Fill level */}
      <path
        d="M10 15V8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className={style.color}
        style={{
          clipPath: `inset(${100 - fillPercent}% 0 0 0)`
        }}
      />
      {/* Bulb */}
      <circle
        cx="10"
        cy="18"
        r="2"
        fill="currentColor"
        className={style.color}
      />
    </svg>
  )
}

// Default Variant
function DefaultVariant({
  temperature,
  feelsLike,
  unit,
  showUnit,
  showFeelsLike,
  showIcon,
  size,
  style
}: {
  temperature: number
  feelsLike?: number
  unit: 'C' | 'F'
  showUnit: boolean
  showFeelsLike: boolean
  showIcon: boolean
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  style: ReturnType<typeof getTemperatureStyle>
}) {
  const displayTemp = unit === 'F' ? celsiusToFahrenheit(temperature) : temperature
  const displayFeels = feelsLike !== undefined
    ? (unit === 'F' ? celsiusToFahrenheit(feelsLike) : feelsLike)
    : undefined

  const sizeConfig = sizeClasses[size]

  return (
    <div className="inline-flex flex-col">
      <div className="flex items-center gap-1">
        {showIcon && (
          <span className="mr-1">{style.icon}</span>
        )}
        <span className={cn('font-bold mono-nums', style.color, sizeConfig.text)}>
          {displayTemp > 0 ? displayTemp : displayTemp}
        </span>
        {showUnit && (
          <span className={cn('text-slate-500', sizeConfig.unit)}>
            °{unit}
          </span>
        )}
      </div>
      {showFeelsLike && displayFeels !== undefined && (
        <span className={cn('text-slate-500', sizeConfig.feels)}>
          Feels like <span className={style.color}>{displayFeels}°</span>
        </span>
      )}
    </div>
  )
}

// Badge Variant
function BadgeVariant({
  temperature,
  unit,
  showUnit,
  size,
  style
}: {
  temperature: number
  unit: 'C' | 'F'
  showUnit: boolean
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  style: ReturnType<typeof getTemperatureStyle>
}) {
  const displayTemp = unit === 'F' ? celsiusToFahrenheit(temperature) : temperature
  const sizeConfig = sizeClasses[size]

  const paddingClasses = {
    xs: 'px-1.5 py-0.5',
    sm: 'px-2 py-1',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5',
    xl: 'px-4 py-2',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        style.bg,
        style.border,
        paddingClasses[size]
      )}
    >
      <span className={cn('font-bold mono-nums', style.color, sizeConfig.text)}>
        {displayTemp}
      </span>
      {showUnit && (
        <span className={cn('text-slate-400', sizeConfig.unit)}>°{unit}</span>
      )}
    </div>
  )
}

// Compact Variant (inline, minimal)
function CompactVariant({
  temperature,
  unit,
  showUnit,
  size,
  style
}: {
  temperature: number
  unit: 'C' | 'F'
  showUnit: boolean
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  style: ReturnType<typeof getTemperatureStyle>
}) {
  const displayTemp = unit === 'F' ? celsiusToFahrenheit(temperature) : temperature
  const sizeConfig = sizeClasses[size]

  return (
    <span className={cn('font-semibold mono-nums', style.color, sizeConfig.text)}>
      {displayTemp}{showUnit && <span className="text-slate-500">°{unit}</span>}
    </span>
  )
}

export function TemperatureDisplay({
  temperature,
  feelsLike,
  unit = 'C',
  size = 'md',
  showUnit = true,
  showFeelsLike = false,
  showIcon = false,
  variant = 'default',
  className
}: TemperatureDisplayProps) {
  const style = useMemo(() => getTemperatureStyle(temperature), [temperature])

  const content = useMemo(() => {
    switch (variant) {
      case 'badge':
        return (
          <BadgeVariant
            temperature={temperature}
            unit={unit}
            showUnit={showUnit}
            size={size}
            style={style}
          />
        )
      case 'compact':
        return (
          <CompactVariant
            temperature={temperature}
            unit={unit}
            showUnit={showUnit}
            size={size}
            style={style}
          />
        )
      default:
        return (
          <DefaultVariant
            temperature={temperature}
            feelsLike={feelsLike}
            unit={unit}
            showUnit={showUnit}
            showFeelsLike={showFeelsLike}
            showIcon={showIcon}
            size={size}
            style={style}
          />
        )
    }
  }, [variant, temperature, feelsLike, unit, showUnit, showFeelsLike, showIcon, size, style])

  return <div className={className}>{content}</div>
}

// Temperature Range Display (for forecasts)
interface TemperatureRangeProps {
  high: number
  low: number
  unit?: 'C' | 'F'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TemperatureRange({
  high,
  low,
  unit = 'C',
  size = 'md',
  className
}: TemperatureRangeProps) {
  const highStyle = useMemo(() => getTemperatureStyle(high), [high])
  const lowStyle = useMemo(() => getTemperatureStyle(low), [low])

  const displayHigh = unit === 'F' ? celsiusToFahrenheit(high) : high
  const displayLow = unit === 'F' ? celsiusToFahrenheit(low) : low

  const sizeConfig = sizeClasses[size]

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('font-semibold mono-nums', highStyle.color, sizeConfig.text)}>
        {displayHigh}°
      </span>
      <span className="text-slate-600">/</span>
      <span className={cn('font-medium mono-nums', lowStyle.color, sizeConfig.text)}>
        {displayLow}°
      </span>
    </div>
  )
}

// Export helpers
export { getTemperatureStyle, celsiusToFahrenheit, ThermometerIcon }
