import type { WeatherPeriod, UserPreferences, Location } from '@/types'

export interface HikingAssessment {
  score: number
  level: 'excellent' | 'good' | 'moderate' | 'poor' | 'dangerous'
  recommendation: string
  riskFactors: RiskFactor[]
  gearRecommendations: GearRecommendation[]
  safetyGuidance: string[]
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert_only'
}

export interface RiskFactor {
  type: 'wind' | 'temperature' | 'precipitation' | 'visibility' | 'terrain' | 'navigation'
  severity: 'low' | 'moderate' | 'high' | 'extreme'
  description: string
  mitigation: string
}

export interface GearRecommendation {
  category: 'clothing' | 'navigation' | 'emergency' | 'protection'
  essential: boolean
  items: string[]
  reasoning: string
}

export function assessHikingConditions(
  period: WeatherPeriod,
  location: Location,
  preferences: UserPreferences
): HikingAssessment {
  const riskFactors: RiskFactor[] = []
  const gearRecommendations: GearRecommendation[] = []
  const safetyGuidance: string[] = []

  // Analyze wind conditions
  const windRisk = assessWindRisk(period.wind_speed_kph, period.gust_speed_kph)
  if (windRisk) riskFactors.push(windRisk)

  // Analyze temperature conditions
  const tempRisk = assessTemperatureRisk(period.temperature_c, period.feels_like_c)
  if (tempRisk) riskFactors.push(tempRisk)

  // Analyze precipitation
  const precipRisk = assessPrecipitationRisk(period.precipitation_mm, period.precipitation_type)
  if (precipRisk) riskFactors.push(precipRisk)

  // Analyze visibility
  const visibilityRisk = assessVisibilityRisk(period.visibility_m, period.cloud_base_m)
  if (visibilityRisk) riskFactors.push(visibilityRisk)

  // Generate gear recommendations based on conditions
  gearRecommendations.push(...generateGearRecommendations(period, location, riskFactors))

  // Generate safety guidance
  safetyGuidance.push(...generateSafetyGuidance(riskFactors, location))

  // Determine overall assessment
  const score = period.hiking_score
  const level = getHikingLevel(score)
  const recommendation = getRecommendation(score, riskFactors, preferences.riskTolerance)
  const experienceLevel = getRequiredExperience(riskFactors, location)

  return {
    score,
    level,
    recommendation,
    riskFactors,
    gearRecommendations,
    safetyGuidance,
    experienceLevel
  }
}

function assessWindRisk(windSpeed: number, gustSpeed?: number): RiskFactor | null {
  const maxWind = Math.max(windSpeed, gustSpeed || 0)

  if (maxWind >= 60) {
    return {
      type: 'wind',
      severity: 'extreme',
      description: `Extreme winds (${maxWind} kph). Dangerous conditions on exposed terrain.`,
      mitigation: 'Avoid exposed ridges and summits. Consider postponing trip.'
    }
  } else if (maxWind >= 45) {
    return {
      type: 'wind',
      severity: 'high',
      description: `Strong winds (${maxWind} kph). Difficult walking on exposed ground.`,
      mitigation: 'Avoid exposed areas. Use lower-level routes. Secure all gear.'
    }
  } else if (maxWind >= 30) {
    return {
      type: 'wind',
      severity: 'moderate',
      description: `Fresh winds (${maxWind} kph). May affect balance on exposed ridges.`,
      mitigation: 'Take care on narrow ridges. Secure loose items.'
    }
  }

  return null
}

function assessTemperatureRisk(temp: number, feelsLike: number): RiskFactor | null {
  if (feelsLike <= -10) {
    return {
      type: 'temperature',
      severity: 'extreme',
      description: `Extreme cold (feels like ${feelsLike}°C). Risk of frostbite and hypothermia.`,
      mitigation: 'Full winter gear essential. Consider shorter routes. Monitor for cold injuries.'
    }
  } else if (feelsLike <= -5) {
    return {
      type: 'temperature',
      severity: 'high',
      description: `Very cold conditions (feels like ${feelsLike}°C). Risk of hypothermia.`,
      mitigation: 'Warm layers essential. Keep extremities covered. Maintain energy levels.'
    }
  } else if (feelsLike <= 0) {
    return {
      type: 'temperature',
      severity: 'moderate',
      description: `Freezing conditions (feels like ${feelsLike}°C). Ice possible on paths.`,
      mitigation: 'Extra insulation needed. Consider microspikes for grip.'
    }
  } else if (temp >= 30) {
    return {
      type: 'temperature',
      severity: 'moderate',
      description: `Hot conditions (${temp}°C). Risk of heat exhaustion.`,
      mitigation: 'Carry extra water. Start early. Seek shade during midday.'
    }
  }

  return null
}

function assessPrecipitationRisk(amount: number, type: string): RiskFactor | null {
  if (amount >= 10) {
    return {
      type: 'precipitation',
      severity: type === 'snow' ? 'high' : 'moderate',
      description: `Heavy ${type} (${amount}mm). Slippery conditions and reduced visibility.`,
      mitigation: 'Full waterproofs essential. Consider route changes. Watch for flooding.'
    }
  } else if (amount >= 5) {
    return {
      type: 'precipitation',
      severity: 'moderate',
      description: `Moderate ${type} (${amount}mm). Wet and potentially slippery conditions.`,
      mitigation: 'Waterproof clothing recommended. Extra care on steep ground.'
    }
  }

  return null
}

function assessVisibilityRisk(visibility?: number, cloudBase?: number): RiskFactor | null {
  if (!visibility && !cloudBase) return null

  if (visibility && visibility < 100) {
    return {
      type: 'visibility',
      severity: 'extreme',
      description: 'Very poor visibility (<100m). Navigation extremely difficult.',
      mitigation: 'GPS and compass essential. Consider turning back. Stay on marked paths.'
    }
  } else if (visibility && visibility < 500) {
    return {
      type: 'visibility',
      severity: 'high',
      description: 'Poor visibility (<500m). Difficult navigation.',
      mitigation: 'Navigation aids essential. Stick to well-known routes.'
    }
  } else if (cloudBase && cloudBase < 300) {
    return {
      type: 'visibility',
      severity: 'moderate',
      description: 'Low cloud base. Summits likely in cloud.',
      mitigation: 'Expect reduced visibility on higher ground. Navigation skills required.'
    }
  }

  return null
}

function generateGearRecommendations(
  period: WeatherPeriod,
  location: Location,
  riskFactors: RiskFactor[]
): GearRecommendation[] {
  const recommendations: GearRecommendation[] = []

  // Base layer recommendations
  if (period.feels_like_c <= 5) {
    recommendations.push({
      category: 'clothing',
      essential: true,
      items: ['Insulating layers', 'Warm hat', 'Insulated gloves', 'Warm socks'],
      reasoning: 'Cold conditions require proper insulation to prevent hypothermia.'
    })
  }

  // Waterproof gear
  if (period.precipitation_mm > 1) {
    recommendations.push({
      category: 'clothing',
      essential: true,
      items: ['Waterproof jacket', 'Waterproof trousers', 'Waterproof gloves'],
      reasoning: 'Wet conditions require full waterproof protection.'
    })
  }

  // Wind protection
  if (period.wind_speed_kph > 30) {
    recommendations.push({
      category: 'clothing',
      essential: true,
      items: ['Windproof outer layer', 'Secure hood', 'Wind-resistant gloves'],
      reasoning: 'Strong winds increase heat loss and can affect balance.'
    })
  }

  // Navigation gear for poor visibility
  const hasVisibilityRisk = riskFactors.some(r => r.type === 'visibility' && r.severity === 'high')
  if (hasVisibilityRisk || location.difficulty === 'challenging' || location.difficulty === 'extreme') {
    recommendations.push({
      category: 'navigation',
      essential: true,
      items: ['GPS device', 'Compass', 'Map', 'Headtorch', 'Spare batteries'],
      reasoning: 'Poor visibility or challenging terrain requires reliable navigation.'
    })
  }

  // Emergency gear for high-risk conditions
  const hasHighRisk = riskFactors.some(r => r.severity === 'high' || r.severity === 'extreme')
  if (hasHighRisk || location.elevation_m > 1000) {
    recommendations.push({
      category: 'emergency',
      essential: true,
      items: ['Emergency shelter', 'First aid kit', 'Emergency food', 'Whistle', 'Emergency contact info'],
      reasoning: 'High-risk conditions or remote locations require emergency preparedness.'
    })
  }

  // Winter gear
  if (period.precipitation_type === 'snow' || period.feels_like_c < -2) {
    recommendations.push({
      category: 'protection',
      essential: true,
      items: ['Microspikes/crampons', 'Walking poles', 'Gaiters', 'Emergency bivi'],
      reasoning: 'Winter conditions require additional traction and emergency shelter.'
    })
  }

  return recommendations
}

function generateSafetyGuidance(riskFactors: RiskFactor[], location: Location): string[] {
  const guidance: string[] = []

  // Always include basic safety
  guidance.push('Check weather forecast before departure and monitor conditions.')
  guidance.push('Inform someone of your planned route and expected return time.')

  // Risk-specific guidance
  if (riskFactors.some(r => r.severity === 'extreme')) {
    guidance.push('⚠️ EXTREME CONDITIONS: Consider postponing your trip.')
    guidance.push('If proceeding, ensure you have extensive experience and full emergency equipment.')
  }

  if (riskFactors.some(r => r.type === 'wind' && r.severity === 'high')) {
    guidance.push('Avoid exposed ridges and summits in high winds.')
    guidance.push('Consider lower-level alternative routes.')
  }

  if (riskFactors.some(r => r.type === 'visibility')) {
    guidance.push('Carry navigation equipment and know how to use it.')
    guidance.push('Consider turning back if visibility deteriorates further.')
  }

  if (riskFactors.some(r => r.type === 'temperature' && r.severity >= 'moderate')) {
    guidance.push('Monitor yourself and others for signs of hypothermia.')
    guidance.push('Keep energy levels up with regular food and warm drinks.')
  }

  // Location-specific guidance
  if (location.difficulty === 'extreme') {
    guidance.push('This is a challenging mountain requiring advanced skills.')
    guidance.push('Ensure you have relevant experience before attempting.')
  }

  if (location.elevation_m > 1000) {
    guidance.push('Weather conditions can change rapidly at altitude.')
    guidance.push('Be prepared to turn back if conditions deteriorate.')
  }

  return guidance
}

function getHikingLevel(score: number): 'excellent' | 'good' | 'moderate' | 'poor' | 'dangerous' {
  if (score >= 8) return 'excellent'
  if (score >= 6) return 'good'
  if (score >= 4) return 'moderate'
  if (score >= 2) return 'poor'
  return 'dangerous'
}

function getRecommendation(
  score: number,
  riskFactors: RiskFactor[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): string {
  const hasExtremeRisk = riskFactors.some(r => r.severity === 'extreme')
  const hasHighRisk = riskFactors.some(r => r.severity === 'high')

  if (hasExtremeRisk) {
    return 'Dangerous conditions. Trip not recommended for most people.'
  }

  if (score >= 8 && !hasHighRisk) {
    return 'Excellent conditions for mountain activities.'
  }

  if (score >= 6) {
    if (riskTolerance === 'conservative' && hasHighRisk) {
      return 'Good conditions but consider your experience level.'
    }
    return 'Good conditions for hiking with proper preparation.'
  }

  if (score >= 4) {
    if (riskTolerance === 'conservative') {
      return 'Challenging conditions. Consider postponing if inexperienced.'
    }
    return 'Moderate conditions. Extra caution and preparation required.'
  }

  if (score >= 2) {
    return 'Poor conditions. Only recommended for experienced hikers.'
  }

  return 'Dangerous conditions. Trip not recommended.'
}

function getRequiredExperience(riskFactors: RiskFactor[], location: Location): 'beginner' | 'intermediate' | 'advanced' | 'expert_only' {
  const hasExtremeRisk = riskFactors.some(r => r.severity === 'extreme')
  const hasHighRisk = riskFactors.some(r => r.severity === 'high')
  const hasMultipleRisks = riskFactors.length >= 3

  if (hasExtremeRisk || location.difficulty === 'extreme') {
    return 'expert_only'
  }

  if (hasHighRisk || hasMultipleRisks || location.difficulty === 'challenging') {
    return 'advanced'
  }

  if (riskFactors.length > 0 || location.difficulty === 'moderate') {
    return 'intermediate'
  }

  return 'beginner'
}

export function getExperienceLevelColor(level: string): string {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'intermediate':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'advanced':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'expert_only':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getExperienceLevelDescription(level: string): string {
  switch (level) {
    case 'beginner':
      return 'Suitable for beginners with basic hill walking experience'
    case 'intermediate':
      return 'Requires some mountain experience and navigation skills'
    case 'advanced':
      return 'Advanced skills required. Extensive mountain experience necessary'
    case 'expert_only':
      return 'Expert mountaineers only. Extreme conditions or technical terrain'
    default:
      return 'Experience level assessment unavailable'
  }
}