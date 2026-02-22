import { useMemo } from 'react'
import { cn } from '@/utils/cn'

type WeatherCondition =
  | 'clear' | 'sunny' | 'fair'
  | 'partly-cloudy' | 'mostly-cloudy' | 'cloudy' | 'overcast'
  | 'mist' | 'fog' | 'haze'
  | 'light-rain' | 'rain' | 'heavy-rain' | 'showers'
  | 'drizzle' | 'freezing-rain'
  | 'light-snow' | 'snow' | 'heavy-snow' | 'blizzard'
  | 'sleet' | 'hail'
  | 'thunderstorm' | 'thunder'
  | 'windy' | 'breezy'
  | 'unknown'

interface WeatherIconProps {
  condition: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
  showLabel?: boolean
}

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

// Map common weather descriptions to normalized conditions
const normalizeCondition = (description: string): WeatherCondition => {
  const desc = description.toLowerCase().trim()

  // Clear/Sunny
  if (desc.includes('clear') || desc.includes('sunny') || desc.includes('fair')) {
    return 'clear'
  }

  // Cloudy variants
  if (desc.includes('partly cloudy') || desc.includes('some clouds') || desc.includes('few clouds')) {
    return 'partly-cloudy'
  }
  if (desc.includes('mostly cloudy') || desc.includes('broken clouds')) {
    return 'mostly-cloudy'
  }
  if (desc.includes('overcast')) {
    return 'overcast'
  }
  if (desc.includes('cloud')) {
    return 'cloudy'
  }

  // Mist/Fog
  if (desc.includes('mist')) return 'mist'
  if (desc.includes('fog')) return 'fog'
  if (desc.includes('haze')) return 'haze'

  // Snow
  if (desc.includes('blizzard')) return 'blizzard'
  if (desc.includes('heavy snow')) return 'heavy-snow'
  if (desc.includes('light snow') || desc.includes('flurries')) return 'light-snow'
  if (desc.includes('snow')) return 'snow'
  if (desc.includes('sleet')) return 'sleet'
  if (desc.includes('hail')) return 'hail'

  // Rain
  if (desc.includes('thunderstorm') || desc.includes('thunder')) return 'thunderstorm'
  if (desc.includes('heavy rain') || desc.includes('downpour')) return 'heavy-rain'
  if (desc.includes('light rain') || desc.includes('drizzle')) return 'light-rain'
  if (desc.includes('shower')) return 'showers'
  if (desc.includes('freezing rain')) return 'freezing-rain'
  if (desc.includes('rain')) return 'rain'

  // Wind
  if (desc.includes('windy') || desc.includes('gale') || desc.includes('storm')) return 'windy'
  if (desc.includes('breez')) return 'breezy'

  return 'unknown'
}

// SVG Icons for each condition
const SunIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={cn(className, animated && 'animate-spin-slow')} fill="none">
    <circle cx="12" cy="12" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
    <g stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </g>
  </svg>
)

const PartlyCloudyIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="8" cy="8" r="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
    <g stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round">
      <line x1="8" y1="1" x2="8" y2="2.5"/>
      <line x1="2.5" y1="3.5" x2="3.5" y2="4.5"/>
      <line x1="1" y1="8" x2="2.5" y2="8"/>
      <line x1="13.5" y1="3.5" x2="12.5" y2="4.5"/>
      <line x1="15" y1="8" x2="13.5" y2="8"/>
    </g>
    <path
      d="M8 14a4 4 0 0 1 4-4h1a5 5 0 0 1 5 5v1a3 3 0 0 1-3 3H9a4 4 0 0 1-4-4v0a3 3 0 0 1 3-1z"
      fill="#94a3b8"
      stroke="#64748b"
      strokeWidth="0.5"
      className={animated ? 'animate-float' : ''}
    />
  </svg>
)

const CloudyIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={cn(className, animated && 'animate-float')} fill="none">
    <path
      d="M6 16a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 17 9a4 4 0 0 1 1 8H6z"
      fill="#cbd5e1"
      stroke="#94a3b8"
      strokeWidth="1"
    />
  </svg>
)

const OvercastIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M4 18a3 3 0 0 1 0-6h.5A4 4 0 0 1 12 9a3 3 0 0 1 1 6H4z"
      fill="#64748b"
      stroke="#475569"
      strokeWidth="0.5"
    />
    <path
      d="M8 14a4 4 0 0 1 0-8h.5A5 5 0 0 1 18 8a4 4 0 0 1 0 8H8z"
      fill="#94a3b8"
      stroke="#64748b"
      strokeWidth="0.5"
    />
  </svg>
)

const RainIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M6 12a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 17 5a4 4 0 0 1 1 8H6z"
      fill="#94a3b8"
      stroke="#64748b"
      strokeWidth="0.5"
    />
    <g stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className={animated ? 'animate-rain' : ''}>
      <line x1="8" y1="14" x2="8" y2="18"/>
      <line x1="12" y1="15" x2="12" y2="19"/>
      <line x1="16" y1="14" x2="16" y2="18"/>
    </g>
    <style>{`
      @keyframes rain {
        0%, 100% { transform: translateY(0); opacity: 1; }
        50% { transform: translateY(4px); opacity: 0.5; }
      }
      .animate-rain { animation: rain 1s ease-in-out infinite; }
    `}</style>
  </svg>
)

const HeavyRainIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M6 10a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 17 3a4 4 0 0 1 1 8H6z"
      fill="#64748b"
      stroke="#475569"
      strokeWidth="0.5"
    />
    <g stroke="#2563eb" strokeWidth="2" strokeLinecap="round" className={animated ? 'animate-rain' : ''}>
      <line x1="6" y1="12" x2="6" y2="17"/>
      <line x1="9" y1="13" x2="9" y2="20"/>
      <line x1="12" y1="12" x2="12" y2="17"/>
      <line x1="15" y1="13" x2="15" y2="20"/>
      <line x1="18" y1="12" x2="18" y2="17"/>
    </g>
  </svg>
)

const SnowIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M6 12a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 17 5a4 4 0 0 1 1 8H6z"
      fill="#cbd5e1"
      stroke="#94a3b8"
      strokeWidth="0.5"
    />
    <g fill="#e0f2fe" className={animated ? 'animate-snow' : ''}>
      <circle cx="8" cy="16" r="1.5"/>
      <circle cx="12" cy="18" r="1.5"/>
      <circle cx="16" cy="15" r="1.5"/>
      <circle cx="10" cy="20" r="1"/>
      <circle cx="14" cy="21" r="1"/>
    </g>
    <style>{`
      @keyframes snow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(2px); }
      }
      .animate-snow { animation: snow 2s ease-in-out infinite; }
    `}</style>
  </svg>
)

const MistIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <g stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.7">
      <line x1="3" y1="8" x2="21" y2="8"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <line x1="3" y1="16" x2="21" y2="16"/>
      <line x1="7" y1="20" x2="17" y2="20"/>
    </g>
  </svg>
)

const ThunderstormIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M6 10a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 17 3a4 4 0 0 1 1 8H6z"
      fill="#475569"
      stroke="#334155"
      strokeWidth="0.5"
    />
    <path
      d="M13 10l-2 5h3l-2 6 5-7h-3l2-4h-3z"
      fill="#fbbf24"
      stroke="#f59e0b"
      strokeWidth="0.5"
      className={animated ? 'animate-flash' : ''}
    />
    <style>{`
      @keyframes flash {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.3; }
      }
      .animate-flash { animation: flash 3s ease-in-out infinite; }
    `}</style>
  </svg>
)

const WindyIcon = ({ className, animated }: { className?: string, animated?: boolean }) => (
  <svg viewBox="0 0 24 24" className={cn(className, animated && 'animate-wind')} fill="none">
    <g stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8h10a2 2 0 1 0-2-2"/>
      <path d="M3 12h14a2 2 0 1 1-2 2"/>
      <path d="M3 16h8a2 2 0 1 0-2-2"/>
    </g>
    <style>{`
      @keyframes wind {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(2px); }
      }
      .animate-wind { animation: wind 1.5s ease-in-out infinite; }
    `}</style>
  </svg>
)

const UnknownIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="9" stroke="#64748b" strokeWidth="2" fill="none"/>
    <text x="12" y="16" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">?</text>
  </svg>
)

const getWeatherIcon = (condition: WeatherCondition) => {
  switch (condition) {
    case 'clear':
    case 'sunny':
    case 'fair':
      return SunIcon
    case 'partly-cloudy':
      return PartlyCloudyIcon
    case 'mostly-cloudy':
    case 'cloudy':
      return CloudyIcon
    case 'overcast':
      return OvercastIcon
    case 'mist':
    case 'fog':
    case 'haze':
      return MistIcon
    case 'light-rain':
    case 'drizzle':
    case 'showers':
      return RainIcon
    case 'rain':
    case 'heavy-rain':
    case 'freezing-rain':
      return HeavyRainIcon
    case 'light-snow':
    case 'snow':
    case 'heavy-snow':
    case 'blizzard':
    case 'sleet':
    case 'hail':
      return SnowIcon
    case 'thunderstorm':
    case 'thunder':
      return ThunderstormIcon
    case 'windy':
    case 'breezy':
      return WindyIcon
    default:
      return UnknownIcon
  }
}

const getConditionLabel = (condition: WeatherCondition): string => {
  const labels: Record<WeatherCondition, string> = {
    'clear': 'Clear',
    'sunny': 'Sunny',
    'fair': 'Fair',
    'partly-cloudy': 'Partly Cloudy',
    'mostly-cloudy': 'Mostly Cloudy',
    'cloudy': 'Cloudy',
    'overcast': 'Overcast',
    'mist': 'Mist',
    'fog': 'Fog',
    'haze': 'Haze',
    'light-rain': 'Light Rain',
    'rain': 'Rain',
    'heavy-rain': 'Heavy Rain',
    'showers': 'Showers',
    'drizzle': 'Drizzle',
    'freezing-rain': 'Freezing Rain',
    'light-snow': 'Light Snow',
    'snow': 'Snow',
    'heavy-snow': 'Heavy Snow',
    'blizzard': 'Blizzard',
    'sleet': 'Sleet',
    'hail': 'Hail',
    'thunderstorm': 'Thunderstorm',
    'thunder': 'Thunder',
    'windy': 'Windy',
    'breezy': 'Breezy',
    'unknown': 'Unknown',
  }
  return labels[condition]
}

export function WeatherIcon({
  condition,
  size = 'md',
  className,
  animated = true,
  showLabel = false
}: WeatherIconProps) {
  const normalizedCondition = useMemo(() => normalizeCondition(condition), [condition])
  const IconComponent = useMemo(() => getWeatherIcon(normalizedCondition), [normalizedCondition])
  const label = useMemo(() => getConditionLabel(normalizedCondition), [normalizedCondition])

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <IconComponent
        className={sizeClasses[size]}
        animated={animated}
      />
      {showLabel && (
        <span className="text-sm text-slate-400">{label}</span>
      )}
    </div>
  )
}

// Export individual icons for direct use
export {
  SunIcon,
  PartlyCloudyIcon,
  CloudyIcon,
  OvercastIcon,
  RainIcon,
  HeavyRainIcon,
  SnowIcon,
  MistIcon,
  ThunderstormIcon,
  WindyIcon,
  normalizeCondition,
  getConditionLabel
}
