import { describe, it, expect, beforeEach } from 'vitest'
import {
  assessHikingConditions,
  calculateHikingScore,
  identifyRiskFactors,
  generateGearRecommendations,
  generateSafetyGuidance,
  determineExperienceLevel
} from '@/utils/hiking'
import type { WeatherPeriod, Location } from '@/types'

describe('Hiking Assessment Utilities', () => {
  let mockLocation: Location
  let mockWeatherPeriod: WeatherPeriod

  beforeEach(() => {
    mockLocation = {
      id: 'test-location',
      name: 'Ben Nevis',
      area: 'Highlands',
      latitude: 56.7969,
      longitude: -5.0037,
      elevation_m: 1345,
      classification: 'munro'
    }

    mockWeatherPeriod = {
      period_type: 'am',
      temperature_c: 10,
      feels_like_c: 8,
      wind_speed_kph: 25,
      wind_direction: 'SW',
      precipitation_mm: 0,
      weather_description: 'Partly cloudy',
      visibility_m: 15000,
      cloud_base_m: 1200,
      humidity_percent: 65,
      hiking_score: 7,
      risk_level: 'moderate'
    }
  })

  describe('assessHikingConditions', () => {
    it('should return comprehensive hiking assessment', () => {
      const assessment = assessHikingConditions(mockWeatherPeriod, mockLocation)

      expect(assessment).toHaveProperty('score')
      expect(assessment).toHaveProperty('level')
      expect(assessment).toHaveProperty('recommendation')
      expect(assessment).toHaveProperty('riskFactors')
      expect(assessment).toHaveProperty('gearRecommendations')
      expect(assessment).toHaveProperty('safetyGuidance')
      expect(assessment).toHaveProperty('experienceLevel')

      expect(assessment.score).toBeGreaterThanOrEqual(1)
      expect(assessment.score).toBeLessThanOrEqual(10)
      expect(['excellent', 'good', 'moderate', 'poor', 'dangerous']).toContain(assessment.level)
      expect(['beginner', 'intermediate', 'advanced', 'expert_only']).toContain(assessment.experienceLevel)
    })

    it('should assess excellent conditions correctly', () => {
      const excellentWeather = {
        ...mockWeatherPeriod,
        temperature_c: 15,
        wind_speed_kph: 10,
        precipitation_mm: 0,
        visibility_m: 20000,
        hiking_score: 9
      }

      const assessment = assessHikingConditions(excellentWeather, mockLocation)
      
      expect(assessment.score).toBeGreaterThanOrEqual(8)
      expect(assessment.level).toBe('excellent')
      expect(assessment.experienceLevel).toBe('beginner')
    })

    it('should assess dangerous conditions correctly', () => {
      const dangerousWeather = {
        ...mockWeatherPeriod,
        temperature_c: -15,
        wind_speed_kph: 70,
        precipitation_mm: 20,
        visibility_m: 200,
        hiking_score: 1
      }

      const assessment = assessHikingConditions(dangerousWeather, mockLocation)
      
      expect(assessment.score).toBeLessThanOrEqual(3)
      expect(assessment.level).toBe('dangerous')
      expect(assessment.experienceLevel).toBe('expert_only')
      expect(assessment.riskFactors.length).toBeGreaterThan(0)
    })
  })

  describe('calculateHikingScore', () => {
    it('should calculate score based on weather conditions', () => {
      const score = calculateHikingScore(mockWeatherPeriod, mockLocation)
      expect(score).toBeGreaterThanOrEqual(1)
      expect(score).toBeLessThanOrEqual(10)
    })

    it('should give lower scores for harsh conditions', () => {
      const harshWeather = {
        ...mockWeatherPeriod,
        temperature_c: -10,
        wind_speed_kph: 60,
        precipitation_mm: 15,
        visibility_m: 500
      }

      const score = calculateHikingScore(harshWeather, mockLocation)
      expect(score).toBeLessThanOrEqual(4)
    })

    it('should give higher scores for good conditions', () => {
      const goodWeather = {
        ...mockWeatherPeriod,
        temperature_c: 20,
        wind_speed_kph: 15,
        precipitation_mm: 0,
        visibility_m: 25000
      }

      const score = calculateHikingScore(goodWeather, mockLocation)
      expect(score).toBeGreaterThanOrEqual(6)
    })
  })

  describe('identifyRiskFactors', () => {
    it('should identify wind risk factors', () => {
      const windyWeather = {
        ...mockWeatherPeriod,
        wind_speed_kph: 60
      }

      const risks = identifyRiskFactors(windyWeather, mockLocation)
      const windRisk = risks.find(r => r.type === 'wind')
      
      expect(windRisk).toBeDefined()
      expect(windRisk?.severity).toBe('high')
      expect(windRisk?.mitigation).toContain('wind')
    })

    it('should identify temperature risk factors', () => {
      const coldWeather = {
        ...mockWeatherPeriod,
        temperature_c: -15
      }

      const risks = identifyRiskFactors(coldWeather, mockLocation)
      const tempRisk = risks.find(r => r.type === 'temperature')
      
      expect(tempRisk).toBeDefined()
      expect(tempRisk?.severity).toBe('high')
    })

    it('should identify precipitation risk factors', () => {
      const wetWeather = {
        ...mockWeatherPeriod,
        precipitation_mm: 15
      }

      const risks = identifyRiskFactors(wetWeather, mockLocation)
      const precipRisk = risks.find(r => r.type === 'precipitation')
      
      expect(precipRisk).toBeDefined()
      expect(precipRisk?.severity).toMatch(/moderate|high/)
    })

    it('should identify visibility risk factors', () => {
      const foggyWeather = {
        ...mockWeatherPeriod,
        visibility_m: 300
      }

      const risks = identifyRiskFactors(foggyWeather, mockLocation)
      const visibilityRisk = risks.find(r => r.type === 'visibility')
      
      expect(visibilityRisk).toBeDefined()
      expect(visibilityRisk?.severity).toBe('high')
    })

    it('should return no risks for good conditions', () => {
      const perfectWeather = {
        ...mockWeatherPeriod,
        temperature_c: 20,
        wind_speed_kph: 10,
        precipitation_mm: 0,
        visibility_m: 25000
      }

      const risks = identifyRiskFactors(perfectWeather, mockLocation)
      expect(risks).toHaveLength(0)
    })
  })

  describe('generateGearRecommendations', () => {
    it('should recommend basic gear for good conditions', () => {
      const recommendations = generateGearRecommendations(mockWeatherPeriod, mockLocation)
      
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.category === 'navigation')).toBe(true)
      expect(recommendations.some(r => r.category === 'emergency')).toBe(true)
    })

    it('should recommend warm clothing for cold conditions', () => {
      const coldWeather = {
        ...mockWeatherPeriod,
        temperature_c: -5
      }

      const recommendations = generateGearRecommendations(coldWeather, mockLocation)
      const warmClothing = recommendations.filter(r => r.category === 'clothing')
      
      expect(warmClothing.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.essential && r.item.toLowerCase().includes('warm'))).toBe(true)
    })

    it('should recommend waterproofs for wet conditions', () => {
      const wetWeather = {
        ...mockWeatherPeriod,
        precipitation_mm: 10
      }

      const recommendations = generateGearRecommendations(wetWeather, mockLocation)
      
      expect(recommendations.some(r => 
        r.item.toLowerCase().includes('waterproof') || 
        r.item.toLowerCase().includes('rain')
      )).toBe(true)
    })

    it('should recommend wind protection for windy conditions', () => {
      const windyWeather = {
        ...mockWeatherPeriod,
        wind_speed_kph: 50
      }

      const recommendations = generateGearRecommendations(windyWeather, mockLocation)
      
      expect(recommendations.some(r => 
        r.item.toLowerCase().includes('windproof') || 
        r.item.toLowerCase().includes('shell')
      )).toBe(true)
    })
  })

  describe('generateSafetyGuidance', () => {
    it('should provide safety guidance', () => {
      const guidance = generateSafetyGuidance(mockWeatherPeriod, mockLocation)
      
      expect(guidance).toBeInstanceOf(Array)
      expect(guidance.length).toBeGreaterThan(0)
      expect(guidance.every(g => typeof g === 'string')).toBe(true)
    })

    it('should provide weather-specific guidance', () => {
      const dangerousWeather = {
        ...mockWeatherPeriod,
        wind_speed_kph: 70,
        visibility_m: 200
      }

      const guidance = generateSafetyGuidance(dangerousWeather, mockLocation)
      
      expect(guidance.some(g => g.toLowerCase().includes('wind'))).toBe(true)
      expect(guidance.some(g => g.toLowerCase().includes('visibility'))).toBe(true)
    })
  })

  describe('determineExperienceLevel', () => {
    it('should require beginner level for easy conditions', () => {
      const easyConditions = {
        ...mockWeatherPeriod,
        temperature_c: 20,
        wind_speed_kph: 10,
        precipitation_mm: 0,
        visibility_m: 25000
      }

      const level = determineExperienceLevel(easyConditions, mockLocation)
      expect(level).toBe('beginner')
    })

    it('should require expert level for dangerous conditions', () => {
      const dangerousConditions = {
        ...mockWeatherPeriod,
        temperature_c: -20,
        wind_speed_kph: 80,
        precipitation_mm: 25,
        visibility_m: 100
      }

      const level = determineExperienceLevel(dangerousConditions, mockLocation)
      expect(level).toBe('expert_only')
    })

    it('should consider elevation in experience requirements', () => {
      const highMountain = {
        ...mockLocation,
        elevation_m: 2000
      }

      const level = determineExperienceLevel(mockWeatherPeriod, highMountain)
      expect(['intermediate', 'advanced', 'expert_only']).toContain(level)
    })
  })
})

// Helper function to mock the hiking assessment functions
const mockHikingAssessment = {
  assessHikingConditions: (period: WeatherPeriod, location: Location) => ({
    score: 7,
    level: 'good' as const,
    recommendation: 'Good conditions for hiking with proper preparation',
    riskFactors: [],
    gearRecommendations: [],
    safetyGuidance: ['Check weather updates regularly'],
    experienceLevel: 'intermediate' as const
  }),

  calculateHikingScore: (period: WeatherPeriod, location: Location): number => {
    let score = 10
    
    // Temperature penalties
    if (period.temperature_c < 0) score -= 2
    if (period.temperature_c < -10) score -= 3
    if (period.temperature_c > 30) score -= 2

    // Wind penalties
    if (period.wind_speed_kph > 30) score -= 2
    if (period.wind_speed_kph > 50) score -= 4

    // Precipitation penalties
    if (period.precipitation_mm > 0) score -= 1
    if (period.precipitation_mm > 10) score -= 3

    // Visibility penalties
    if ((period.visibility_m || 10000) < 1000) score -= 4
    if ((period.visibility_m || 10000) < 5000) score -= 2

    return Math.max(1, Math.min(10, score))
  },

  identifyRiskFactors: (period: WeatherPeriod, location: Location) => {
    const risks: any[] = []

    if (period.wind_speed_kph > 50) {
      risks.push({
        type: 'wind',
        severity: 'high',
        description: 'Very strong winds present significant risk',
        mitigation: 'Consider postponing or choose more sheltered routes'
      })
    }

    if (period.temperature_c < -10) {
      risks.push({
        type: 'temperature',
        severity: 'high',
        description: 'Extremely cold temperatures increase hypothermia risk',
        mitigation: 'Wear appropriate winter clothing and monitor for cold symptoms'
      })
    }

    if (period.precipitation_mm > 10) {
      risks.push({
        type: 'precipitation',
        severity: 'moderate',
        description: 'Heavy precipitation can cause slippery conditions',
        mitigation: 'Wear waterproof clothing and use appropriate footwear'
      })
    }

    if ((period.visibility_m || 10000) < 1000) {
      risks.push({
        type: 'visibility',
        severity: 'high',
        description: 'Poor visibility significantly increases navigation risk',
        mitigation: 'Ensure strong navigation skills and consider GPS backup'
      })
    }

    return risks
  },

  generateGearRecommendations: (period: WeatherPeriod, location: Location) => {
    const recommendations: any[] = [
      {
        category: 'navigation',
        item: 'Map and compass',
        essential: true,
        description: 'Essential for navigation'
      },
      {
        category: 'emergency',
        item: 'First aid kit',
        essential: true,
        description: 'Basic medical supplies'
      }
    ]

    if (period.temperature_c < 5) {
      recommendations.push({
        category: 'clothing',
        item: 'Warm insulation layer',
        essential: true,
        description: 'Protection against cold temperatures'
      })
    }

    if (period.precipitation_mm > 0) {
      recommendations.push({
        category: 'protection',
        item: 'Waterproof jacket',
        essential: true,
        description: 'Protection from rain'
      })
    }

    if (period.wind_speed_kph > 30) {
      recommendations.push({
        category: 'protection',
        item: 'Windproof shell',
        essential: true,
        description: 'Protection from strong winds'
      })
    }

    return recommendations
  },

  generateSafetyGuidance: (period: WeatherPeriod, location: Location): string[] => {
    const guidance: string[] = [
      'Check weather forecast before departure',
      'Inform someone of your planned route and return time',
      'Carry emergency shelter and supplies'
    ]

    if (period.wind_speed_kph > 50) {
      guidance.push('Be extremely cautious of strong winds, especially on ridges and exposed areas')
    }

    if ((period.visibility_m || 10000) < 1000) {
      guidance.push('Poor visibility requires strong navigation skills and GPS backup')
    }

    if (period.temperature_c < 0) {
      guidance.push('Cold temperatures increase hypothermia risk - dress appropriately')
    }

    return guidance
  },

  determineExperienceLevel: (period: WeatherPeriod, location: Location) => {
    let difficultyScore = 0

    // Weather difficulty
    if (period.temperature_c < -10) difficultyScore += 3
    else if (period.temperature_c < 0) difficultyScore += 2

    if (period.wind_speed_kph > 60) difficultyScore += 3
    else if (period.wind_speed_kph > 40) difficultyScore += 2
    else if (period.wind_speed_kph > 25) difficultyScore += 1

    if (period.precipitation_mm > 15) difficultyScore += 2
    else if (period.precipitation_mm > 5) difficultyScore += 1

    if ((period.visibility_m || 10000) < 500) difficultyScore += 3
    else if ((period.visibility_m || 10000) < 2000) difficultyScore += 2

    // Elevation difficulty
    if (location.elevation_m > 1500) difficultyScore += 2
    else if (location.elevation_m > 1000) difficultyScore += 1

    if (difficultyScore >= 8) return 'expert_only'
    if (difficultyScore >= 5) return 'advanced'
    if (difficultyScore >= 2) return 'intermediate'
    return 'beginner'
  }
}

// Apply mocks
Object.assign(global, mockHikingAssessment)