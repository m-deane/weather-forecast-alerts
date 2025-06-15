import type { WeatherPeriod, UserPreferences } from '@/types'

export function formatTemperature(tempC: number, preferences: UserPreferences): string {
  if (preferences.units.temperature === 'fahrenheit') {
    const tempF = Math.round((tempC * 9) / 5 + 32)
    return `${tempF}°F`
  }
  return `${Math.round(tempC)}°C`
}

export function formatWindSpeed(speedKph: number, preferences: UserPreferences): string {
  if (preferences.units.wind === 'mph') {
    const speedMph = Math.round(speedKph * 0.621371)
    return `${speedMph} mph`
  }
  return `${Math.round(speedKph)} kph`
}

export function formatDistance(distanceKm: number, preferences: UserPreferences): string {
  if (preferences.units.distance === 'miles') {
    const distanceMiles = Math.round(distanceKm * 0.621371)
    return `${distanceMiles} miles`
  }
  return `${Math.round(distanceKm)} km`
}

export function getWindDescription(speedKph: number): string {
  if (speedKph < 10) return 'Calm'
  if (speedKph < 20) return 'Light breeze'
  if (speedKph < 30) return 'Moderate breeze'
  if (speedKph < 40) return 'Fresh breeze'
  if (speedKph < 50) return 'Strong breeze'
  if (speedKph < 60) return 'Near gale'
  return 'Gale force'
}

export function getHikingScoreColor(score: number): string {
  if (score >= 8) return 'text-success-700'
  if (score >= 6) return 'text-success-600'
  if (score >= 4) return 'text-warning-600'
  if (score >= 2) return 'text-warning-700'
  return 'text-danger-700'
}

export function getHikingScoreDescription(score: number): string {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Moderate'
  if (score >= 2) return 'Poor'
  return 'Dangerous'
}

export function getRiskLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'low':
      return 'bg-success-100 text-success-800 border-success-200'
    case 'moderate':
      return 'bg-warning-100 text-warning-800 border-warning-200'
    case 'high':
      return 'bg-danger-100 text-danger-800 border-danger-200'
    case 'extreme':
      return 'bg-red-100 text-red-900 border-red-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function formatPrecipitation(mm: number): string {
  if (mm === 0) return 'None'
  if (mm < 1) return `${mm.toFixed(1)}mm (Light)`
  if (mm < 5) return `${mm.toFixed(1)}mm (Moderate)`
  return `${mm.toFixed(1)}mm (Heavy)`
}

export function getVisibilityDescription(visibilityM?: number): string {
  if (!visibilityM) return 'Unknown'
  
  const visibilityKm = visibilityM / 1000
  if (visibilityKm > 10) return 'Excellent (>10km)'
  if (visibilityKm > 4) return 'Good (4-10km)'
  if (visibilityKm > 1) return 'Moderate (1-4km)'
  return 'Poor (<1km)'
}

export function getCloudBaseDescription(cloudBaseM?: number): string {
  if (!cloudBaseM) return 'Unknown'
  
  if (cloudBaseM > 2000) return 'High (>2000m)'
  if (cloudBaseM > 1000) return 'Medium (1000-2000m)'
  if (cloudBaseM > 500) return 'Low (500-1000m)'
  return 'Very Low (<500m)'
}

export function calculateWindChill(tempC: number, windKph: number): number {
  // Wind chill calculation (simplified version)
  if (tempC > 10 || windKph < 5) return tempC
  
  const windMph = windKph * 0.621371
  const tempF = (tempC * 9) / 5 + 32
  
  const windChillF = 35.74 + 
    0.6215 * tempF - 
    35.75 * Math.pow(windMph, 0.16) + 
    0.4275 * tempF * Math.pow(windMph, 0.16)
  
  return (windChillF - 32) * 5 / 9
}

export function getPeriodLabel(period: WeatherPeriod['period_type']): string {
  switch (period) {
    case 'am': return 'Morning'
    case 'pm': return 'Afternoon'
    case 'night': return 'Night'
    case 'current': return 'Current'
    default: return 'All Day'
  }
}

export function isConditionSafe(period: WeatherPeriod, riskTolerance: 'conservative' | 'moderate' | 'aggressive'): boolean {
  const { wind_speed_kph, hiking_score, risk_level } = period
  
  // Conservative users
  if (riskTolerance === 'conservative') {
    if (risk_level === 'high' || risk_level === 'extreme') return false
    if (wind_speed_kph > 30) return false
    if (hiking_score < 6) return false
  }
  
  // Moderate users
  if (riskTolerance === 'moderate') {
    if (risk_level === 'extreme') return false
    if (wind_speed_kph > 45) return false
    if (hiking_score < 4) return false
  }
  
  // Aggressive users
  if (riskTolerance === 'aggressive') {
    if (wind_speed_kph > 60) return false
    if (hiking_score < 2) return false
  }
  
  return true
}