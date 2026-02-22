import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { CameraIcon, SunIcon, MoonIcon, EyeIcon } from '@heroicons/react/24/outline'
import { calculateSunTimes as calculateSunTimesRaw } from '@/utils/photography'

interface PhotographyConditionsProps {
  visibility?: number // meters
  cloudBase?: number // meters
  cloudCover?: number // percentage
  precipitation?: number // mm
  windSpeed?: number // kph
  sunrise?: string // HH:MM
  sunset?: string // HH:MM
  latitude?: number // for calculating sunrise/sunset when not provided
  longitude?: number // for calculating sunrise/sunset when not provided
  className?: string
}

type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data'

interface PhotoCategory {
  name: string
  icon: string
  rating: ConditionRating
  tip: string
}

function getConditionRating(score: number): ConditionRating {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

const ratingStyles: Record<ConditionRating, { bg: string; text: string; label: string }> = {
  excellent: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'Excellent' },
  good: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: 'Good' },
  fair: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', label: 'Fair' },
  poor: { bg: 'bg-slate-500/15 border-slate-500/30', text: 'text-slate-400', label: 'Poor' },
  insufficient_data: { bg: 'bg-slate-800/30 border-slate-700/30', text: 'text-slate-500', label: 'No Data' },
}

// Derive formatted sunrise/sunset strings from the shared utility
function getFormattedSunTimes(latitude: number, longitude: number, date: Date) {
  const sunTimes = calculateSunTimesRaw(date, latitude, longitude)
  const formatTime = (d: Date) => {
    const h = d.getHours()
    const m = d.getMinutes()
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  return { sunrise: formatTime(sunTimes.sunrise), sunset: formatTime(sunTimes.sunset) }
}

export function PhotographyConditions({
  visibility,
  cloudBase,
  cloudCover,
  precipitation,
  windSpeed,
  sunrise: sunriseProp,
  sunset: sunsetProp,
  latitude,
  longitude,
  className,
}: PhotographyConditionsProps) {
  // Calculate real sunrise/sunset from lat/long if not directly provided
  const { sunrise, sunset, isCalculated } = useMemo(() => {
    if (sunriseProp && sunsetProp) {
      return { sunrise: sunriseProp, sunset: sunsetProp, isCalculated: false }
    }
    if (latitude !== undefined && longitude !== undefined) {
      const times = getFormattedSunTimes(latitude, longitude, new Date())
      return { sunrise: times.sunrise, sunset: times.sunset, isCalculated: true }
    }
    // No data available - use approximate defaults and flag them
    return { sunrise: '07:30', sunset: '17:00', isCalculated: false }
  }, [sunriseProp, sunsetProp, latitude, longitude])

  const hasSunTimes = sunriseProp !== undefined || (latitude !== undefined && longitude !== undefined)

  const categories = useMemo(() => {
    const cats: PhotoCategory[] = []

    // Determine if we have enough data for meaningful landscape assessment
    const hasLandscapeData = visibility !== undefined || precipitation !== undefined
    // Landscape/Daylight photography
    if (!hasLandscapeData && cloudCover === undefined) {
      cats.push({
        name: 'Landscape',
        icon: '\u{1F3D4}\uFE0F',
        rating: 'insufficient_data',
        tip: 'Visibility data unavailable',
      })
    } else {
      let landscapeScore = 50
      if (visibility !== undefined) {
        if (visibility > 20000) landscapeScore += 30
        else if (visibility > 10000) landscapeScore += 20
        else if (visibility > 5000) landscapeScore += 10
        else landscapeScore -= 20
      }
      if (precipitation !== undefined && precipitation > 0) landscapeScore -= 30
      if (cloudCover !== undefined) {
        // Dramatic clouds (40-70%) can be good for photography
        if (cloudCover >= 40 && cloudCover <= 70) landscapeScore += 15
        else if (cloudCover > 90) landscapeScore -= 15
      }
      cats.push({
        name: 'Landscape',
        icon: '\u{1F3D4}\uFE0F',
        rating: getConditionRating(landscapeScore),
        tip: visibility !== undefined && visibility > 10000 ? 'Clear views' : 'Limited visibility',
      })
    }

    // Golden hour conditions - cloud cover is the key driver
    if (cloudCover === undefined) {
      cats.push({
        name: 'Golden Hour',
        icon: '\u{1F305}',
        rating: 'insufficient_data',
        tip: 'Cloud cover data unavailable',
      })
    } else {
      let goldenScore = 60
      // Some clouds at golden hour create drama
      if (cloudCover >= 20 && cloudCover <= 60) goldenScore += 25
      else if (cloudCover > 80) goldenScore -= 20
      if (precipitation !== undefined && precipitation > 0) goldenScore -= 25
      cats.push({
        name: 'Golden Hour',
        icon: '\u{1F305}',
        rating: getConditionRating(goldenScore),
        tip: cloudCover >= 20 && cloudCover <= 60 ? 'Dramatic skies' : 'Check clouds',
      })
    }

    // Astrophotography conditions - cloud cover is essential
    if (cloudCover === undefined) {
      cats.push({
        name: 'Night Sky',
        icon: '\u{1F30C}',
        rating: 'insufficient_data',
        tip: 'Cloud cover data unavailable',
      })
    } else {
      let astroScore = 30
      if (cloudCover < 20) astroScore += 50
      else if (cloudCover < 40) astroScore += 25
      else astroScore -= 20
      if (visibility !== undefined && visibility > 15000) astroScore += 15
      // Northern Scotland has aurora potential
      cats.push({
        name: 'Night Sky',
        icon: '\u{1F30C}',
        rating: getConditionRating(astroScore),
        tip: cloudCover < 30 ? 'Stars visible' : 'Cloud cover',
      })
    }

    // Weather/Drama shots (rain, mist, moody) - works with partial data
    let dramaScore = 40
    let dramaHasData = false
    if (cloudCover !== undefined && cloudCover > 60) { dramaScore += 20; dramaHasData = true }
    if (precipitation !== undefined && precipitation > 0 && precipitation < 5) { dramaScore += 25; dramaHasData = true }
    if (cloudBase !== undefined && cloudBase < 800) { dramaScore += 20; dramaHasData = true }
    if (windSpeed !== undefined && windSpeed > 30) { dramaScore += 10; dramaHasData = true }
    if (!dramaHasData) {
      cats.push({
        name: 'Moody/Drama',
        icon: '\u{1F327}\uFE0F',
        rating: 'insufficient_data',
        tip: 'Weather data unavailable',
      })
    } else {
      cats.push({
        name: 'Moody/Drama',
        icon: '\u{1F327}\uFE0F',
        rating: getConditionRating(dramaScore),
        tip: cloudBase !== undefined && cloudBase < 800 ? 'Atmospheric' : 'Weather dependent',
      })
    }

    return cats
  }, [visibility, cloudBase, cloudCover, precipitation, windSpeed])

  // Overall rating - only count categories that have data
  const overallScore = useMemo(() => {
    const ratedCategories = categories.filter(c => c.rating !== 'insufficient_data')
    if (ratedCategories.length === 0) return null

    const scores = ratedCategories.map(c => {
      switch (c.rating) {
        case 'excellent': return 90
        case 'good': return 70
        case 'fair': return 50
        default: return 30
      }
    })
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [categories])

  const hasAnyData = overallScore !== null
  const overallRating = hasAnyData ? getConditionRating(overallScore) : 'insufficient_data' as ConditionRating
  const overallStyle = ratingStyles[overallRating]

  // Best window calculation
  const getBestWindow = () => {
    const now = new Date()
    const [sunriseH, sunriseM] = sunrise.split(':').map(Number)
    const [sunsetH, sunsetM] = sunset.split(':').map(Number)
    const currentHour = now.getHours()

    // Golden hours
    const morningGoldenEnd = sunriseH + 1
    const eveningGoldenStart = sunsetH - 1

    if (currentHour < morningGoldenEnd) {
      return { window: `${sunrise} - ${String(morningGoldenEnd).padStart(2, '0')}:${String(sunriseM).padStart(2, '0')}`, type: 'Morning golden hour' }
    }
    if (currentHour < eveningGoldenStart) {
      return { window: `${String(eveningGoldenStart).padStart(2, '0')}:${String(sunsetM).padStart(2, '0')} - ${sunset}`, type: 'Evening golden hour' }
    }
    return { window: `${sunrise} - ${String(morningGoldenEnd).padStart(2, '0')}:${String(sunriseM).padStart(2, '0')}`, type: 'Tomorrow morning' }
  }

  const bestWindow = getBestWindow()

  return (
    <div className={cn('card', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <CameraIcon className="w-5 h-5 text-violet-400" />
          Photography Conditions
        </h3>
        <span className={cn('text-sm font-bold px-2 py-1 rounded border', overallStyle.bg, overallStyle.text)}>
          {overallStyle.label}
        </span>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {categories.map((cat) => {
          const style = ratingStyles[cat.rating]
          return (
            <div
              key={cat.name}
              className={cn(
                'rounded-lg border p-2.5 transition-all hover:scale-[1.02]',
                style.bg
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-medium text-slate-200">{cat.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-semibold', style.text)}>{style.label}</span>
                <span className="text-xs text-slate-500">{cat.tip}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Best Window */}
      <div className="bg-slate-800/40 rounded-lg p-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Best Light</div>
          <div className="text-sm font-medium text-slate-200">{bestWindow.type}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-amber-400 mono-nums">{bestWindow.window}</div>
          {!hasSunTimes && (
            <div className="text-xs text-slate-500">Approximate times</div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-3 text-xs text-slate-500 space-y-1">
        {visibility !== undefined && visibility > 20000 && (
          <div className="flex items-center gap-1">
            <EyeIcon className="w-3 h-3 text-emerald-400" />
            <span>Exceptional visibility - distant peaks visible</span>
          </div>
        )}
        {cloudBase !== undefined && cloudBase < 600 && (
          <div className="flex items-center gap-1">
            <span>{'\u{1F32B}\uFE0F'}</span>
            <span>Low cloud may create atmospheric shots</span>
          </div>
        )}
        {categories.find(c => c.name === 'Night Sky')?.rating === 'excellent' && (
          <div className="flex items-center gap-1">
            <MoonIcon className="w-3 h-3 text-slate-400" />
            <span>Clear skies - aurora possible in northern Scotland</span>
          </div>
        )}
        {!hasAnyData && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Limited weather data available for photography assessment</span>
          </div>
        )}
      </div>
    </div>
  )
}
