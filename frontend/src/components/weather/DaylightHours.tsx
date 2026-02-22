import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { calculateSunTimes as calculateSunTimesRaw } from '@/utils/photography'

interface DaylightHoursProps {
  latitude: number
  longitude: number
  date?: Date
  className?: string
}

// Derive formatted sun times from the shared calculateSunTimes utility
function getSunTimesForDisplay(latitude: number, longitude: number, date: Date) {
  const sunTimes = calculateSunTimesRaw(date, latitude, longitude)

  const formatTime = (d: Date) => {
    const h = d.getHours()
    const m = d.getMinutes()
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const daylightMinutes = Math.round(sunTimes.dayLength * 60)

  return {
    sunrise: formatTime(sunTimes.sunrise),
    sunset: formatTime(sunTimes.sunset),
    daylightMinutes,
    goldenMorning: {
      start: formatTime(sunTimes.goldenHourMorning.start),
      end: formatTime(sunTimes.goldenHourMorning.end),
    },
    goldenEvening: {
      start: formatTime(sunTimes.goldenHourEvening.start),
      end: formatTime(sunTimes.goldenHourEvening.end),
    },
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function DaylightHours({ latitude, longitude, date = new Date(), className }: DaylightHoursProps) {
  const sunTimes = useMemo(() => getSunTimesForDisplay(latitude, longitude, date), [latitude, longitude, date])

  // Current time position on the arc (0-100%)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [sunriseH, sunriseM] = sunTimes.sunrise.split(':').map(Number)
  const [sunsetH, sunsetM] = sunTimes.sunset.split(':').map(Number)
  const sunriseMinutes = sunriseH * 60 + sunriseM
  const sunsetMinutes = sunsetH * 60 + sunsetM

  const dayProgress = Math.max(0, Math.min(100,
    ((currentMinutes - sunriseMinutes) / (sunsetMinutes - sunriseMinutes)) * 100
  ))

  const isDaytime = currentMinutes >= sunriseMinutes && currentMinutes <= sunsetMinutes

  // Determine daylight quality for Scottish context
  const getDaylightQuality = (minutes: number) => {
    if (minutes < 420) return { label: 'Very Short', color: 'text-red-400', desc: 'Limited hill time' }
    if (minutes < 540) return { label: 'Short', color: 'text-amber-400', desc: 'Early start essential' }
    if (minutes < 720) return { label: 'Moderate', color: 'text-yellow-400', desc: 'Plan carefully' }
    if (minutes < 900) return { label: 'Good', color: 'text-emerald-400', desc: 'Full day possible' }
    return { label: 'Long', color: 'text-emerald-300', desc: 'Extended daylight' }
  }

  const quality = getDaylightQuality(sunTimes.daylightMinutes)

  return (
    <div className={cn('card', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <SunIcon className="w-5 h-5 text-amber-400" />
          Daylight Hours
        </h3>
        <span className={cn('text-sm font-medium', quality.color)}>
          {quality.label}
        </span>
      </div>

      {/* Sun Arc Visualization */}
      <div className="relative h-20 mb-4">
        {/* Arc background */}
        <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet">
          {/* Horizon line */}
          <line x1="10" y1="70" x2="190" y2="70" stroke="currentColor" className="text-slate-600" strokeWidth="1" />

          {/* Night area (left) */}
          <path
            d="M 10 70 Q 30 70, 40 50"
            fill="none"
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Day arc */}
          <path
            d="M 40 50 Q 100 -10, 160 50"
            fill="none"
            stroke="url(#dayGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Night area (right) */}
          <path
            d="M 160 50 Q 170 70, 190 70"
            fill="none"
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Golden hour highlights */}
          <path
            d="M 40 50 Q 55 30, 70 25"
            fill="none"
            stroke="currentColor"
            className="text-amber-500/60"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 130 25 Q 145 30, 160 50"
            fill="none"
            stroke="currentColor"
            className="text-orange-500/60"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="dayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="70%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* Current sun position */}
          {isDaytime && (
            <circle
              cx={40 + (dayProgress / 100) * 120}
              cy={50 - Math.sin((dayProgress / 100) * Math.PI) * 45}
              r="8"
              fill="#fbbf24"
              className="animate-pulse"
              style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }}
            />
          )}

          {/* Moon if nighttime */}
          {!isDaytime && (
            <circle
              cx={currentMinutes < sunriseMinutes ? 25 : 175}
              cy="55"
              r="6"
              fill="#94a3b8"
              style={{ filter: 'drop-shadow(0 0 3px #94a3b8)' }}
            />
          )}

          {/* Sunrise marker */}
          <circle cx="40" cy="50" r="3" fill="#f59e0b" />
          <text x="40" y="65" textAnchor="middle" className="fill-slate-400 text-[8px]">
            {sunTimes.sunrise}
          </text>

          {/* Solar noon marker */}
          <circle cx="100" cy="5" r="2" fill="#fcd34d" />

          {/* Sunset marker */}
          <circle cx="160" cy="50" r="3" fill="#f97316" />
          <text x="160" y="65" textAnchor="middle" className="fill-slate-400 text-[8px]">
            {sunTimes.sunset}
          </text>
        </svg>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Sunrise</div>
          <div className="text-lg font-semibold text-amber-400 mono-nums">{sunTimes.sunrise}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Daylight</div>
          <div className="text-lg font-semibold text-slate-100 mono-nums">
            {formatDuration(sunTimes.daylightMinutes)}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Sunset</div>
          <div className="text-lg font-semibold text-orange-400 mono-nums">{sunTimes.sunset}</div>
        </div>
      </div>

      {/* Golden Hour Info */}
      {sunTimes.goldenMorning && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1">
            <span className="text-amber-400">📸</span>
            Golden hours
          </span>
          <span className="mono-nums">
            {sunTimes.goldenMorning.start}-{sunTimes.goldenMorning.end} • {sunTimes.goldenEvening?.start}-{sunTimes.goldenEvening?.end}
          </span>
        </div>
      )}

      {/* Warning for short days */}
      {sunTimes.daylightMinutes < 540 && (
        <div className="mt-3 text-xs text-amber-300 bg-amber-900/30 border border-amber-700/50 rounded-lg px-3 py-2">
          <strong>Short day warning:</strong> {quality.desc}. Carry a headtorch and plan your route to finish before dark.
        </div>
      )}
    </div>
  )
}
