import type { WeatherPeriod, Location } from '@/types'

export interface SunTimes {
  sunrise: Date
  sunset: Date
  goldenHourMorning: { start: Date; end: Date }
  goldenHourEvening: { start: Date; end: Date }
  blueHourMorning: { start: Date; end: Date }
  blueHourEvening: { start: Date; end: Date }
  solarNoon: Date
  dayLength: number // in hours
}

export interface MoonInfo {
  phase: number // 0-1, where 0 = new moon, 0.5 = full moon
  phaseName: string
  illumination: number // percentage
  moonrise?: Date
  moonset?: Date
  isVisible: boolean
}

export interface PhotographyConditions {
  score: number // 1-10
  level: 'poor' | 'fair' | 'good' | 'excellent'
  opportunities: PhotographyOpportunity[]
  inversionProbability: number // 0-100%
  visibilityScore: number // 1-10
  atmosphericConditions: string
  recommendations: string[]
  bestTimes: Date[]
}

export interface PhotographyOpportunity {
  type: 'golden_hour' | 'blue_hour' | 'inversion' | 'dramatic_weather' | 'clear_visibility' | 'night_sky'
  probability: number // 0-100%
  timeWindow: { start: Date; end: Date }
  description: string
  tips: string[]
}

export function calculateSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  // Simplified sun calculations - in production, use a library like SunCalc
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  
  // Equation of time and declination angle (simplified)
  const P = Math.asin(0.39795 * Math.cos(0.98563 * (dayOfYear - 173) * Math.PI / 180))
  
  // Hour angle calculation
  const argument = -Math.tan(latitude * Math.PI / 180) * Math.tan(P)
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, argument)))
  
  // Sunrise and sunset times
  const sunriseHour = 12 - (hourAngle * 180 / Math.PI) / 15
  const sunsetHour = 12 + (hourAngle * 180 / Math.PI) / 15
  
  const sunrise = new Date(date)
  sunrise.setHours(Math.floor(sunriseHour), (sunriseHour % 1) * 60, 0, 0)
  
  const sunset = new Date(date)
  sunset.setHours(Math.floor(sunsetHour), (sunsetHour % 1) * 60, 0, 0)
  
  const solarNoon = new Date(date)
  solarNoon.setHours(12, 0, 0, 0)
  
  // Golden hour (1 hour after sunrise, 1 hour before sunset)
  const goldenHourMorning = {
    start: new Date(sunrise.getTime()),
    end: new Date(sunrise.getTime() + 60 * 60 * 1000)
  }
  
  const goldenHourEvening = {
    start: new Date(sunset.getTime() - 60 * 60 * 1000),
    end: new Date(sunset.getTime())
  }
  
  // Blue hour (30 minutes before sunrise to 30 minutes after, and vice versa for evening)
  const blueHourMorning = {
    start: new Date(sunrise.getTime() - 30 * 60 * 1000),
    end: new Date(sunrise.getTime() + 30 * 60 * 1000)
  }
  
  const blueHourEvening = {
    start: new Date(sunset.getTime() - 30 * 60 * 1000),
    end: new Date(sunset.getTime() + 30 * 60 * 1000)
  }
  
  const dayLength = (sunset.getTime() - sunrise.getTime()) / (1000 * 60 * 60)
  
  return {
    sunrise,
    sunset,
    goldenHourMorning,
    goldenHourEvening,
    blueHourMorning,
    blueHourEvening,
    solarNoon,
    dayLength
  }
}

export function calculateMoonInfo(date: Date): MoonInfo {
  // Simplified moon phase calculation
  const newMoon = new Date('2024-01-11') // Reference new moon
  const synodicMonth = 29.53059 // days
  
  const daysSinceNewMoon = (date.getTime() - newMoon.getTime()) / (1000 * 60 * 60 * 24)
  const phase = (daysSinceNewMoon % synodicMonth) / synodicMonth
  
  let phaseName: string
  if (phase < 0.03 || phase > 0.97) phaseName = 'New Moon'
  else if (phase < 0.22) phaseName = 'Waxing Crescent'
  else if (phase < 0.28) phaseName = 'First Quarter'
  else if (phase < 0.47) phaseName = 'Waxing Gibbous'
  else if (phase < 0.53) phaseName = 'Full Moon'
  else if (phase < 0.72) phaseName = 'Waning Gibbous'
  else if (phase < 0.78) phaseName = 'Last Quarter'
  else phaseName = 'Waning Crescent'
  
  const illumination = Math.round((1 - Math.abs(phase - 0.5) * 2) * 100)
  
  return {
    phase,
    phaseName,
    illumination,
    isVisible: phase > 0.03 && phase < 0.97
  }
}

export function assessInversionProbability(
  period: WeatherPeriod,
  location: Location,
  sunTimes: SunTimes
): number {
  let probability = 0
  
  // Base probability based on elevation (higher = better chance of being above inversion)
  if (location.elevation_m > 800) probability += 30
  else if (location.elevation_m > 500) probability += 20
  else if (location.elevation_m > 300) probability += 10
  
  // Temperature factors (stable, cool conditions favor inversions)
  if (period.temperature_c >= 0 && period.temperature_c <= 10) probability += 25
  else if (period.temperature_c > 10 && period.temperature_c <= 15) probability += 15
  
  // Wind factors (calm conditions favor inversions)
  if (period.wind_speed_kph <= 10) probability += 25
  else if (period.wind_speed_kph <= 20) probability += 15
  else if (period.wind_speed_kph <= 30) probability += 5
  
  // Pressure factors (high pressure systems favor inversions)
  // Note: This would require pressure data from weather API
  
  // Clear skies favor radiative cooling
  if (period.weather_description.toLowerCase().includes('clear')) probability += 15
  else if (period.weather_description.toLowerCase().includes('partly')) probability += 10
  
  // Time of day (early morning best for inversions)
  const currentHour = new Date().getHours()
  if (currentHour >= 5 && currentHour <= 9) probability += 20
  else if (currentHour >= 22 || currentHour <= 4) probability += 10
  
  return Math.min(100, Math.max(0, probability))
}

export function assessPhotographyConditions(
  period: WeatherPeriod,
  location: Location,
  date: Date
): PhotographyConditions {
  const sunTimes = calculateSunTimes(date, location.latitude, location.longitude)
  const moonInfo = calculateMoonInfo(date)
  
  // Calculate overall visibility score
  const visibilityScore = calculateVisibilityScore(period)
  
  // Calculate inversion probability
  const inversionProbability = assessInversionProbability(period, location, sunTimes)
  
  // Identify photography opportunities
  const opportunities = identifyPhotographyOpportunities(period, location, sunTimes, moonInfo)
  
  // Calculate overall photography score
  const score = calculatePhotographyScore(period, visibilityScore, inversionProbability, opportunities)
  
  // Determine level
  const level = getPhotographyLevel(score)
  
  // Generate recommendations
  const recommendations = generatePhotographyRecommendations(period, opportunities, sunTimes)
  
  // Identify best shooting times
  const bestTimes = identifyBestTimes(opportunities, sunTimes)
  
  return {
    score,
    level,
    opportunities,
    inversionProbability,
    visibilityScore,
    atmosphericConditions: describeAtmosphericConditions(period),
    recommendations,
    bestTimes
  }
}

function calculateVisibilityScore(period: WeatherPeriod): number {
  if (!period.visibility_m) return 5 // Default neutral score
  
  if (period.visibility_m >= 20000) return 10
  if (period.visibility_m >= 10000) return 8
  if (period.visibility_m >= 5000) return 6
  if (period.visibility_m >= 2000) return 4
  if (period.visibility_m >= 1000) return 2
  return 1
}

function identifyPhotographyOpportunities(
  period: WeatherPeriod,
  location: Location,
  sunTimes: SunTimes,
  moonInfo: MoonInfo
): PhotographyOpportunity[] {
  const opportunities: PhotographyOpportunity[] = []
  const now = new Date()
  
  // Golden hour opportunities
  if (period.visibility_m && period.visibility_m > 5000) {
    opportunities.push({
      type: 'golden_hour',
      probability: Math.min(90, (period.visibility_m / 10000) * 100),
      timeWindow: sunTimes.goldenHourMorning,
      description: 'Warm, soft light perfect for landscape photography',
      tips: [
        'Use graduated neutral density filters for high contrast scenes',
        'Consider foreground elements for depth',
        'Shoot in RAW for maximum editing flexibility'
      ]
    })
    
    opportunities.push({
      type: 'golden_hour',
      probability: Math.min(90, (period.visibility_m / 10000) * 100),
      timeWindow: sunTimes.goldenHourEvening,
      description: 'Evening golden hour with warm directional light',
      tips: [
        'Look for backlighting opportunities',
        'Use telephoto lenses to compress distant mountains',
        'Consider silhouette compositions'
      ]
    })
  }
  
  // Blue hour opportunities
  if (period.visibility_m && period.visibility_m > 2000) {
    opportunities.push({
      type: 'blue_hour',
      probability: 75,
      timeWindow: sunTimes.blueHourEvening,
      description: 'Deep blue sky with balanced ambient and artificial light',
      tips: [
        'Use tripod for longer exposures',
        'Bracket exposures for HDR',
        'Include city lights or illuminated features'
      ]
    })
  }
  
  // Cloud inversion opportunities
  const inversionProbability = assessInversionProbability(period, location, sunTimes)
  if (inversionProbability > 30) {
    opportunities.push({
      type: 'inversion',
      probability: inversionProbability,
      timeWindow: {
        start: new Date(sunTimes.sunrise.getTime() - 30 * 60 * 1000),
        end: new Date(sunTimes.sunrise.getTime() + 2 * 60 * 60 * 1000)
      },
      description: 'Cloud inversion with peaks emerging from fog',
      tips: [
        'Arrive before sunrise for setup',
        'Use wide-angle lenses to capture the scene',
        'Consider multiple exposures as conditions change',
        'Include foreground peaks for scale'
      ]
    })
  }
  
  // Dramatic weather opportunities
  if (period.precipitation_mm > 0 || period.wind_speed_kph > 40) {
    opportunities.push({
      type: 'dramatic_weather',
      probability: 70,
      timeWindow: {
        start: now,
        end: new Date(now.getTime() + 6 * 60 * 60 * 1000)
      },
      description: 'Dramatic weather conditions with moody atmosphere',
      tips: [
        'Protect camera gear from moisture',
        'Use fast shutter speeds to capture movement',
        'Look for breaks in clouds for dramatic lighting',
        'Consider black and white processing'
      ]
    })
  }
  
  // Clear visibility opportunities
  if (period.visibility_m && period.visibility_m > 15000 && period.wind_speed_kph < 20) {
    opportunities.push({
      type: 'clear_visibility',
      probability: 85,
      timeWindow: {
        start: now,
        end: new Date(now.getTime() + 8 * 60 * 60 * 1000)
      },
      description: 'Exceptional clarity for distant mountain views',
      tips: [
        'Use telephoto lenses for compression effects',
        'Look for layered mountain ridges',
        'Capture fine details in distant peaks',
        'Use polarizing filters to enhance contrast'
      ]
    })
  }
  
  // Night sky opportunities
  if (moonInfo.illumination < 30 && period.visibility_m && period.visibility_m > 10000) {
    const nightStart = new Date(sunTimes.sunset.getTime() + 60 * 60 * 1000)
    const nightEnd = new Date(sunTimes.sunrise.getTime() - 60 * 60 * 1000)
    
    opportunities.push({
      type: 'night_sky',
      probability: 80,
      timeWindow: { start: nightStart, end: nightEnd },
      description: 'Dark skies perfect for astrophotography',
      tips: [
        'Use wide-angle lenses (14-24mm)',
        'ISO 1600-6400 depending on camera',
        '15-30 second exposures to avoid star trails',
        'Include foreground silhouettes for context'
      ]
    })
  }
  
  return opportunities
}

function calculatePhotographyScore(
  period: WeatherPeriod,
  visibilityScore: number,
  inversionProbability: number,
  opportunities: PhotographyOpportunity[]
): number {
  let score = 0
  
  // Base visibility score (40% weight)
  score += visibilityScore * 0.4
  
  // Weather conditions (30% weight)
  if (period.precipitation_mm === 0) score += 3
  else if (period.precipitation_mm < 2) score += 2
  else if (period.precipitation_mm < 5) score += 1
  
  // Wind conditions (10% weight)
  if (period.wind_speed_kph < 15) score += 1
  else if (period.wind_speed_kph < 30) score += 0.5
  
  // Special opportunities (20% weight)
  const highProbOpportunities = opportunities.filter(o => o.probability > 70)
  score += Math.min(2, highProbOpportunities.length * 0.5)
  
  // Inversion bonus
  if (inversionProbability > 50) score += 1
  else if (inversionProbability > 30) score += 0.5
  
  return Math.min(10, Math.max(1, Math.round(score)))
}

function getPhotographyLevel(score: number): 'poor' | 'fair' | 'good' | 'excellent' {
  if (score >= 8) return 'excellent'
  if (score >= 6) return 'good'
  if (score >= 4) return 'fair'
  return 'poor'
}

function generatePhotographyRecommendations(
  period: WeatherPeriod,
  opportunities: PhotographyOpportunity[],
  sunTimes: SunTimes
): string[] {
  const recommendations: string[] = []
  
  // Time-based recommendations
  const currentTime = new Date()
  const hoursToSunrise = (sunTimes.sunrise.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
  const hoursToSunset = (sunTimes.sunset.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
  
  if (hoursToSunrise > 0 && hoursToSunrise < 3) {
    recommendations.push('Arrive 30 minutes before sunrise for best positioning')
  }
  
  if (hoursToSunset > 0 && hoursToSunset < 2) {
    recommendations.push('Golden hour approaching - prepare for evening shoot')
  }
  
  // Weather-based recommendations
  if (period.wind_speed_kph > 30) {
    recommendations.push('Use faster shutter speeds to minimize camera shake')
    recommendations.push('Secure tripod and protect gear from wind')
  }
  
  if (period.precipitation_mm > 0) {
    recommendations.push('Bring weather protection for camera equipment')
    recommendations.push('Look for dramatic lighting between rain showers')
  }
  
  if (period.visibility_m && period.visibility_m > 15000) {
    recommendations.push('Exceptional clarity - perfect for telephoto landscape work')
  }
  
  // Opportunity-based recommendations
  const hasInversion = opportunities.some(o => o.type === 'inversion' && o.probability > 50)
  if (hasInversion) {
    recommendations.push('High chance of cloud inversion - arrive before dawn')
  }
  
  const hasNightSky = opportunities.some(o => o.type === 'night_sky')
  if (hasNightSky) {
    recommendations.push('Dark sky conditions favorable for astrophotography')
  }
  
  return recommendations
}

function identifyBestTimes(
  opportunities: PhotographyOpportunity[],
  sunTimes: SunTimes
): Date[] {
  const bestTimes: Date[] = []
  
  // Always include sunrise and sunset
  bestTimes.push(sunTimes.sunrise, sunTimes.sunset)
  
  // Add times for high-probability opportunities
  opportunities
    .filter(o => o.probability > 70)
    .forEach(o => {
      bestTimes.push(o.timeWindow.start)
    })
  
  // Sort and remove duplicates
  const uniqueTimes = Array.from(new Set(bestTimes.map(t => t.getTime())))
    .map(t => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime())
  
  return uniqueTimes.slice(0, 5) // Return top 5 times
}

function describeAtmosphericConditions(period: WeatherPeriod): string {
  const conditions: string[] = []
  
  if (period.visibility_m) {
    if (period.visibility_m > 20000) conditions.push('exceptionally clear')
    else if (period.visibility_m > 10000) conditions.push('very clear')
    else if (period.visibility_m > 5000) conditions.push('clear')
    else if (period.visibility_m > 2000) conditions.push('moderate haze')
    else conditions.push('poor visibility')
  }
  
  if (period.humidity_percent) {
    if (period.humidity_percent > 80) conditions.push('high humidity')
    else if (period.humidity_percent < 40) conditions.push('dry air')
  }
  
  if (period.wind_speed_kph > 40) conditions.push('very windy')
  else if (period.wind_speed_kph > 20) conditions.push('breezy')
  else if (period.wind_speed_kph < 10) conditions.push('calm')
  
  return conditions.join(', ') || 'moderate conditions'
}

export function formatTimeRange(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function getOpportunityColor(type: PhotographyOpportunity['type']): string {
  switch (type) {
    case 'golden_hour':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'blue_hour':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'inversion':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'dramatic_weather':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'clear_visibility':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'night_sky':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getOpportunityIcon(type: PhotographyOpportunity['type']): string {
  switch (type) {
    case 'golden_hour':
      return '🌅'
    case 'blue_hour':
      return '🌆'
    case 'inversion':
      return '☁️'
    case 'dramatic_weather':
      return '⛈️'
    case 'clear_visibility':
      return '🔭'
    case 'night_sky':
      return '✨'
    default:
      return '📸'
  }
}