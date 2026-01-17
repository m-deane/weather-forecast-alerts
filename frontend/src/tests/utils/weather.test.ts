import { describe, it, expect } from 'vitest'
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getHikingScoreColor,
  getHikingScoreDescription,
  getRiskLevelColor,
  getVisibilityDescription,
  getCloudBaseDescription,
  getPeriodLabel,
  getWindDescription,
  calculateWindChill,
  isConditionSafe
} from '@/utils/weather'

// Create mock preferences object matching UserPreferences interface
const createPreferences = (overrides: Partial<{
  temperature: 'celsius' | 'fahrenheit'
  wind: 'kph' | 'mph'
  distance: 'km' | 'miles'
}> = {}) => ({
  units: {
    temperature: overrides.temperature || 'celsius',
    wind: overrides.wind || 'kph',
    distance: overrides.distance || 'km'
  },
  notifications: {
    enabled: false,
    severeWeatherAlerts: false,
    favoriteLocationUpdates: false
  },
  riskTolerance: 'moderate' as const
})

describe('Weather Utilities', () => {
  describe('formatTemperature', () => {
    it('should format temperature in Celsius by default', () => {
      const prefs = createPreferences()
      expect(formatTemperature(15, prefs)).toBe('15°C')
      expect(formatTemperature(-5, prefs)).toBe('-5°C')
      expect(formatTemperature(0, prefs)).toBe('0°C')
    })

    it('should format temperature in Fahrenheit when specified', () => {
      const prefs = createPreferences({ temperature: 'fahrenheit' })
      expect(formatTemperature(15, prefs)).toBe('59°F')
      expect(formatTemperature(0, prefs)).toBe('32°F')
      expect(formatTemperature(-5, prefs)).toBe('23°F')
    })

    it('should handle decimal temperatures', () => {
      const prefs = createPreferences()
      expect(formatTemperature(15.7, prefs)).toBe('16°C')
      expect(formatTemperature(-5.3, prefs)).toBe('-5°C')
    })
  })

  describe('formatWindSpeed', () => {
    it('should format wind speed in kph by default', () => {
      const prefs = createPreferences()
      expect(formatWindSpeed(25, prefs)).toBe('25 kph')
      expect(formatWindSpeed(0, prefs)).toBe('0 kph')
    })

    it('should format wind speed in mph when specified', () => {
      const prefs = createPreferences({ wind: 'mph' })
      expect(formatWindSpeed(25, prefs)).toBe('16 mph')
      expect(formatWindSpeed(50, prefs)).toBe('31 mph')
    })

    it('should handle decimal wind speeds', () => {
      const prefs = createPreferences()
      expect(formatWindSpeed(25.7, prefs)).toBe('26 kph')
    })
  })

  describe('formatPrecipitation', () => {
    it('should return None for zero precipitation', () => {
      expect(formatPrecipitation(0)).toBe('None')
    })

    it('should format light precipitation correctly', () => {
      expect(formatPrecipitation(0.5)).toBe('0.5mm (Light)')
    })

    it('should format moderate precipitation correctly', () => {
      expect(formatPrecipitation(2.5)).toBe('2.5mm (Moderate)')
    })

    it('should format heavy precipitation correctly', () => {
      expect(formatPrecipitation(10)).toBe('10.0mm (Heavy)')
    })
  })

  describe('getHikingScoreColor', () => {
    it('should return correct colors for different hiking scores', () => {
      expect(getHikingScoreColor(9)).toBe('text-success-700')  // >= 8
      expect(getHikingScoreColor(7)).toBe('text-success-600')  // >= 6
      expect(getHikingScoreColor(5)).toBe('text-warning-600')  // >= 4
      expect(getHikingScoreColor(3)).toBe('text-warning-700')  // >= 2
      expect(getHikingScoreColor(1)).toBe('text-danger-700')   // < 2
    })

    it('should handle edge cases', () => {
      expect(getHikingScoreColor(10)).toBe('text-success-700')
      expect(getHikingScoreColor(8)).toBe('text-success-700')
      expect(getHikingScoreColor(0)).toBe('text-danger-700')
    })
  })

  describe('getHikingScoreDescription', () => {
    it('should return correct descriptions for different hiking scores', () => {
      expect(getHikingScoreDescription(9)).toBe('Excellent')  // >= 8
      expect(getHikingScoreDescription(7)).toBe('Good')       // >= 6
      expect(getHikingScoreDescription(5)).toBe('Moderate')   // >= 4
      expect(getHikingScoreDescription(3)).toBe('Poor')       // >= 2
      expect(getHikingScoreDescription(1)).toBe('Dangerous')  // < 2
    })
  })

  describe('getRiskLevelColor', () => {
    it('should return correct colors for risk levels', () => {
      expect(getRiskLevelColor('low')).toBe('bg-success-100 text-success-800 border-success-200')
      expect(getRiskLevelColor('moderate')).toBe('bg-warning-100 text-warning-800 border-warning-200')
      expect(getRiskLevelColor('high')).toBe('bg-danger-100 text-danger-800 border-danger-200')
      expect(getRiskLevelColor('extreme')).toBe('bg-red-100 text-red-900 border-red-300')
    })

    it('should handle unknown risk levels', () => {
      expect(getRiskLevelColor('unknown')).toBe('bg-gray-100 text-gray-800 border-gray-200')
    })
  })

  describe('getVisibilityDescription', () => {
    it('should return correct descriptions for visibility ranges', () => {
      expect(getVisibilityDescription(25000)).toBe('Excellent (>10km)')  // > 10km
      expect(getVisibilityDescription(8000)).toBe('Good (4-10km)')       // > 4km
      expect(getVisibilityDescription(2000)).toBe('Moderate (1-4km)')    // > 1km
      expect(getVisibilityDescription(500)).toBe('Poor (<1km)')          // <= 1km
    })

    it('should handle null/undefined visibility', () => {
      expect(getVisibilityDescription(null as unknown as number)).toBe('Unknown')
      expect(getVisibilityDescription(undefined)).toBe('Unknown')
    })
  })

  describe('getCloudBaseDescription', () => {
    it('should return correct descriptions for cloud base', () => {
      expect(getCloudBaseDescription(2500)).toBe('High (>2000m)')
      expect(getCloudBaseDescription(1500)).toBe('Medium (1000-2000m)')
      expect(getCloudBaseDescription(750)).toBe('Low (500-1000m)')
      expect(getCloudBaseDescription(200)).toBe('Very Low (<500m)')
    })

    it('should handle boundary values', () => {
      expect(getCloudBaseDescription(2001)).toBe('High (>2000m)')
      expect(getCloudBaseDescription(2000)).toBe('Medium (1000-2000m)')
      expect(getCloudBaseDescription(1001)).toBe('Medium (1000-2000m)')
      expect(getCloudBaseDescription(1000)).toBe('Low (500-1000m)')
      expect(getCloudBaseDescription(501)).toBe('Low (500-1000m)')
      expect(getCloudBaseDescription(500)).toBe('Very Low (<500m)')
    })

    it('should handle undefined cloud base', () => {
      expect(getCloudBaseDescription(undefined)).toBe('Unknown')
    })
  })

  describe('getPeriodLabel', () => {
    it('should return correct labels for periods', () => {
      expect(getPeriodLabel('am')).toBe('Morning')
      expect(getPeriodLabel('pm')).toBe('Afternoon')
      expect(getPeriodLabel('night')).toBe('Night')
      expect(getPeriodLabel('current')).toBe('Current')
    })
  })

  describe('getWindDescription', () => {
    it('should return correct descriptions for wind speeds', () => {
      expect(getWindDescription(5)).toBe('Calm')           // < 10 kph
      expect(getWindDescription(15)).toBe('Light breeze')  // < 20 kph
      expect(getWindDescription(25)).toBe('Moderate breeze') // < 30 kph
      expect(getWindDescription(35)).toBe('Fresh breeze')  // < 40 kph
      expect(getWindDescription(45)).toBe('Strong breeze') // < 50 kph
      expect(getWindDescription(55)).toBe('Near gale')     // < 60 kph
      expect(getWindDescription(60)).toBe('Gale force')    // >= 60 kph
      expect(getWindDescription(80)).toBe('Gale force')
    })

    it('should handle boundary values', () => {
      expect(getWindDescription(0)).toBe('Calm')
      expect(getWindDescription(9)).toBe('Calm')
      expect(getWindDescription(10)).toBe('Light breeze')
      expect(getWindDescription(59)).toBe('Near gale')
      expect(getWindDescription(60)).toBe('Gale force')
    })
  })

  describe('calculateWindChill', () => {
    it('should return temperature when above threshold or wind is calm', () => {
      // Returns tempC when tempC > 10 OR windKph < 5
      expect(calculateWindChill(15, 30)).toBe(15)  // temp > 10
      expect(calculateWindChill(20, 50)).toBe(20)  // temp > 10
      expect(calculateWindChill(10, 0)).toBe(10)   // wind < 5
      expect(calculateWindChill(-5, 4)).toBe(-5)   // wind < 5
      expect(calculateWindChill(0, 3)).toBe(0)     // wind < 5
    })

    it('should calculate wind chill when conditions apply', () => {
      // Wind chill applies when temp <= 10 AND wind >= 5
      const result = calculateWindChill(0, 30)
      expect(result).toBeLessThan(0) // Should be colder than actual temp

      const result2 = calculateWindChill(-10, 40)
      expect(result2).toBeLessThan(-10) // Should feel much colder
    })

    it('should make temperature feel colder with higher wind', () => {
      const lowWind = calculateWindChill(5, 10)
      const highWind = calculateWindChill(5, 40)
      expect(highWind).toBeLessThan(lowWind) // Higher wind = feels colder
    })
  })

  describe('isConditionSafe', () => {
    const createPeriod = (overrides: Partial<{
      wind_speed_kph: number
      hiking_score: number
      risk_level: 'low' | 'moderate' | 'high' | 'extreme'
    }>) => ({
      period_type: 'am' as const,
      temperature_c: 10,
      feels_like_c: 8,
      wind_speed_kph: 20,
      wind_direction: 'NW',
      precipitation_mm: 0,
      precipitation_type: 'none' as const,
      weather_description: 'Clear',
      hiking_score: 7,
      risk_level: 'low' as const,
      ...overrides
    })

    it('should identify safe conditions for conservative users', () => {
      const safePeriod = createPeriod({ wind_speed_kph: 20, hiking_score: 8, risk_level: 'low' })
      expect(isConditionSafe(safePeriod, 'conservative')).toBe(true)
    })

    it('should identify unsafe conditions for conservative users', () => {
      const unsafePeriod = createPeriod({ wind_speed_kph: 60, hiking_score: 2, risk_level: 'high' })
      expect(isConditionSafe(unsafePeriod, 'conservative')).toBe(false)
    })

    it('should be more permissive for moderate users', () => {
      const period = createPeriod({ wind_speed_kph: 40, hiking_score: 5, risk_level: 'moderate' })
      expect(isConditionSafe(period, 'conservative')).toBe(false)
      expect(isConditionSafe(period, 'moderate')).toBe(true)
    })

    it('should be most permissive for aggressive users', () => {
      const period = createPeriod({ wind_speed_kph: 55, hiking_score: 3, risk_level: 'high' })
      expect(isConditionSafe(period, 'moderate')).toBe(false)
      expect(isConditionSafe(period, 'aggressive')).toBe(true)
    })
  })
})
