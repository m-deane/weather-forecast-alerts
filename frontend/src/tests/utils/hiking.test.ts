import { describe, it, expect, beforeEach } from 'vitest'
import {
  assessHikingConditions,
  getExperienceLevelColor,
  getExperienceLevelDescription
} from '@/utils/hiking'
import type { WeatherPeriod, Location, UserPreferences } from '@/types'

describe('Hiking Assessment Utilities', () => {
  let mockLocation: Location
  let mockWeatherPeriod: WeatherPeriod
  let mockPreferences: UserPreferences

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
      precipitation_type: 'none',
      weather_description: 'Partly cloudy',
      visibility_m: 15000,
      cloud_base_m: 1200,
      humidity_percent: 65,
      hiking_score: 7,
      risk_level: 'moderate'
    }

    mockPreferences = {
      units: {
        temperature: 'celsius',
        wind: 'kph',
        distance: 'km'
      },
      notifications: {
        enabled: false,
        severeWeatherAlerts: false,
        favoriteLocationUpdates: false
      },
      riskTolerance: 'moderate'
    }
  })

  describe('assessHikingConditions', () => {
    it('should return comprehensive hiking assessment', () => {
      const assessment = assessHikingConditions(mockWeatherPeriod, mockLocation, mockPreferences)

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
      const excellentWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        temperature_c: 15,
        feels_like_c: 15,
        wind_speed_kph: 10,
        precipitation_mm: 0,
        precipitation_type: 'none',
        visibility_m: 20000,
        hiking_score: 9,
        risk_level: 'low'
      }

      const assessment = assessHikingConditions(excellentWeather, mockLocation, mockPreferences)

      expect(assessment.score).toBeGreaterThanOrEqual(8)
      expect(assessment.level).toBe('excellent')
    })

    it('should assess dangerous conditions correctly', () => {
      const dangerousWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        temperature_c: -15,
        feels_like_c: -25,
        wind_speed_kph: 70,
        gust_speed_kph: 90,
        precipitation_mm: 20,
        precipitation_type: 'snow',
        visibility_m: 50,
        hiking_score: 1,
        risk_level: 'extreme'
      }

      const assessment = assessHikingConditions(dangerousWeather, mockLocation, mockPreferences)

      expect(assessment.score).toBeLessThanOrEqual(3)
      expect(assessment.level).toBe('dangerous')
      expect(assessment.experienceLevel).toBe('expert_only')
      expect(assessment.riskFactors.length).toBeGreaterThan(0)
    })

    it('should identify wind risk factors', () => {
      const windyWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        wind_speed_kph: 65,
        gust_speed_kph: 80,
        hiking_score: 4,
        risk_level: 'high'
      }

      const assessment = assessHikingConditions(windyWeather, mockLocation, mockPreferences)
      const windRisk = assessment.riskFactors.find(r => r.type === 'wind')

      expect(windRisk).toBeDefined()
      expect(['high', 'extreme']).toContain(windRisk?.severity)
    })

    it('should identify temperature risk factors', () => {
      const coldWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        temperature_c: -15,
        feels_like_c: -20,
        hiking_score: 3,
        risk_level: 'high'
      }

      const assessment = assessHikingConditions(coldWeather, mockLocation, mockPreferences)
      const tempRisk = assessment.riskFactors.find(r => r.type === 'temperature')

      expect(tempRisk).toBeDefined()
      expect(['high', 'extreme']).toContain(tempRisk?.severity)
    })

    it('should identify precipitation risk factors', () => {
      const wetWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        precipitation_mm: 15,
        precipitation_type: 'rain',
        hiking_score: 4,
        risk_level: 'moderate'
      }

      const assessment = assessHikingConditions(wetWeather, mockLocation, mockPreferences)
      const precipRisk = assessment.riskFactors.find(r => r.type === 'precipitation')

      expect(precipRisk).toBeDefined()
      expect(['moderate', 'high']).toContain(precipRisk?.severity)
    })

    it('should identify visibility risk factors', () => {
      const foggyWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        visibility_m: 300,
        hiking_score: 3,
        risk_level: 'high'
      }

      const assessment = assessHikingConditions(foggyWeather, mockLocation, mockPreferences)
      const visibilityRisk = assessment.riskFactors.find(r => r.type === 'visibility')

      expect(visibilityRisk).toBeDefined()
      expect(['moderate', 'high', 'extreme']).toContain(visibilityRisk?.severity)
    })

    it('should generate gear recommendations for cold conditions', () => {
      const coldWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        temperature_c: 0,
        feels_like_c: -5,
        hiking_score: 5,
        risk_level: 'moderate'
      }

      const assessment = assessHikingConditions(coldWeather, mockLocation, mockPreferences)
      const clothingRecs = assessment.gearRecommendations.filter(r => r.category === 'clothing')

      expect(clothingRecs.length).toBeGreaterThan(0)
      expect(clothingRecs.some(r => r.essential)).toBe(true)
    })

    it('should generate gear recommendations for wet conditions', () => {
      const wetWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        precipitation_mm: 5,
        precipitation_type: 'rain',
        hiking_score: 5,
        risk_level: 'moderate'
      }

      const assessment = assessHikingConditions(wetWeather, mockLocation, mockPreferences)
      const clothingRecs = assessment.gearRecommendations.filter(r => r.category === 'clothing')

      expect(clothingRecs.some(r =>
        r.items.some((item: string) => item.toLowerCase().includes('waterproof'))
      )).toBe(true)
    })

    it('should generate gear recommendations for windy conditions', () => {
      const windyWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        wind_speed_kph: 40,
        hiking_score: 5,
        risk_level: 'moderate'
      }

      const assessment = assessHikingConditions(windyWeather, mockLocation, mockPreferences)
      const clothingRecs = assessment.gearRecommendations.filter(r => r.category === 'clothing')

      expect(clothingRecs.some(r =>
        r.items.some((item: string) => item.toLowerCase().includes('wind'))
      )).toBe(true)
    })

    it('should generate safety guidance', () => {
      const assessment = assessHikingConditions(mockWeatherPeriod, mockLocation, mockPreferences)

      expect(assessment.safetyGuidance).toBeInstanceOf(Array)
      expect(assessment.safetyGuidance.length).toBeGreaterThan(0)
      expect(assessment.safetyGuidance.every(g => typeof g === 'string')).toBe(true)
    })

    it('should recommend higher experience for dangerous conditions', () => {
      const dangerousWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        wind_speed_kph: 70,
        temperature_c: -10,
        feels_like_c: -20,
        visibility_m: 100,
        hiking_score: 1,
        risk_level: 'extreme'
      }

      const assessment = assessHikingConditions(dangerousWeather, mockLocation, mockPreferences)
      expect(assessment.experienceLevel).toBe('expert_only')
    })

    it('should return no risk factors for perfect conditions', () => {
      const perfectWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        temperature_c: 20,
        feels_like_c: 20,
        wind_speed_kph: 10,
        precipitation_mm: 0,
        precipitation_type: 'none',
        visibility_m: 25000,
        hiking_score: 10,
        risk_level: 'low'
      }

      const assessment = assessHikingConditions(perfectWeather, mockLocation, mockPreferences)
      expect(assessment.riskFactors.length).toBe(0)
    })

    it('should provide appropriate recommendation based on risk tolerance', () => {
      const moderateWeather: WeatherPeriod = {
        ...mockWeatherPeriod,
        wind_speed_kph: 35,
        hiking_score: 5,
        risk_level: 'moderate'
      }

      const conservativePrefs: UserPreferences = {
        ...mockPreferences,
        riskTolerance: 'conservative'
      }

      const aggressivePrefs: UserPreferences = {
        ...mockPreferences,
        riskTolerance: 'aggressive'
      }

      const conservativeAssessment = assessHikingConditions(moderateWeather, mockLocation, conservativePrefs)
      const aggressiveAssessment = assessHikingConditions(moderateWeather, mockLocation, aggressivePrefs)

      // Conservative should be more cautious
      expect(conservativeAssessment.recommendation).not.toBe(aggressiveAssessment.recommendation)
    })
  })

  describe('getExperienceLevelColor', () => {
    it('should return correct colors for each experience level', () => {
      expect(getExperienceLevelColor('beginner')).toContain('green')
      expect(getExperienceLevelColor('intermediate')).toContain('blue')
      expect(getExperienceLevelColor('advanced')).toContain('orange')
      expect(getExperienceLevelColor('expert_only')).toContain('red')
    })

    it('should return gray for unknown levels', () => {
      expect(getExperienceLevelColor('unknown')).toContain('gray')
    })
  })

  describe('getExperienceLevelDescription', () => {
    it('should return correct descriptions for each experience level', () => {
      expect(getExperienceLevelDescription('beginner')).toContain('beginner')
      expect(getExperienceLevelDescription('intermediate')).toContain('mountain experience')
      expect(getExperienceLevelDescription('advanced')).toContain('Advanced')
      expect(getExperienceLevelDescription('expert_only')).toContain('Expert')
    })

    it('should return fallback for unknown levels', () => {
      expect(getExperienceLevelDescription('unknown')).toContain('unavailable')
    })
  })
})
