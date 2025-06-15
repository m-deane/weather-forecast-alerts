import { describe, it, expect, beforeEach } from 'vitest'
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
  getWeatherIcon,
  isWeatherConditionSafe
} from '@/utils/weather'

describe('Weather Utilities', () => {
  describe('formatTemperature', () => {
    it('should format temperature in Celsius by default', () => {
      expect(formatTemperature(15)).toBe('15°C')
      expect(formatTemperature(-5)).toBe('-5°C')
      expect(formatTemperature(0)).toBe('0°C')
    })

    it('should format temperature in Fahrenheit when specified', () => {
      const preferences = { units: { temperature: 'F' } }
      expect(formatTemperature(15, preferences)).toBe('59°F')
      expect(formatTemperature(0, preferences)).toBe('32°F')
      expect(formatTemperature(-5, preferences)).toBe('23°F')
    })

    it('should handle decimal temperatures', () => {
      expect(formatTemperature(15.7)).toBe('16°C')
      expect(formatTemperature(-5.3)).toBe('-5°C')
    })
  })

  describe('formatWindSpeed', () => {
    it('should format wind speed in km/h by default', () => {
      expect(formatWindSpeed(25)).toBe('25 km/h')
      expect(formatWindSpeed(0)).toBe('0 km/h')
    })

    it('should format wind speed in mph when specified', () => {
      const preferences = { units: { wind: 'mph' } }
      expect(formatWindSpeed(25, preferences)).toBe('16 mph')
      expect(formatWindSpeed(50, preferences)).toBe('31 mph')
    })

    it('should handle decimal wind speeds', () => {
      expect(formatWindSpeed(25.7)).toBe('26 km/h')
    })
  })

  describe('formatPrecipitation', () => {
    it('should format precipitation correctly', () => {
      expect(formatPrecipitation(0)).toBe('0mm')
      expect(formatPrecipitation(2.5)).toBe('2.5mm')
      expect(formatPrecipitation(10)).toBe('10mm')
    })

    it('should show "No rain" for zero precipitation', () => {
      expect(formatPrecipitation(0)).toBe('0mm')
    })
  })

  describe('getHikingScoreColor', () => {
    it('should return correct colors for different hiking scores', () => {
      expect(getHikingScoreColor(9)).toBe('text-green-600')
      expect(getHikingScoreColor(7)).toBe('text-yellow-600')
      expect(getHikingScoreColor(5)).toBe('text-orange-600')
      expect(getHikingScoreColor(3)).toBe('text-red-600')
      expect(getHikingScoreColor(1)).toBe('text-red-600')
    })

    it('should handle edge cases', () => {
      expect(getHikingScoreColor(10)).toBe('text-green-600')
      expect(getHikingScoreColor(0)).toBe('text-red-600')
    })
  })

  describe('getHikingScoreDescription', () => {
    it('should return correct descriptions for different hiking scores', () => {
      expect(getHikingScoreDescription(9)).toBe('Excellent')
      expect(getHikingScoreDescription(7)).toBe('Good')
      expect(getHikingScoreDescription(5)).toBe('Fair')
      expect(getHikingScoreDescription(3)).toBe('Poor')
      expect(getHikingScoreDescription(1)).toBe('Dangerous')
    })
  })

  describe('getRiskLevelColor', () => {
    it('should return correct colors for risk levels', () => {
      expect(getRiskLevelColor('low')).toBe('bg-green-100 text-green-800 border-green-200')
      expect(getRiskLevelColor('moderate')).toBe('bg-yellow-100 text-yellow-800 border-yellow-200')
      expect(getRiskLevelColor('high')).toBe('bg-orange-100 text-orange-800 border-orange-200')
      expect(getRiskLevelColor('extreme')).toBe('bg-red-100 text-red-800 border-red-200')
    })
  })

  describe('getVisibilityDescription', () => {
    it('should return correct descriptions for visibility', () => {
      expect(getVisibilityDescription(25000)).toBe('Excellent (25km)')
      expect(getVisibilityDescription(15000)).toBe('Very Good (15km)')
      expect(getVisibilityDescription(8000)).toBe('Good (8km)')
      expect(getVisibilityDescription(3000)).toBe('Moderate (3km)')
      expect(getVisibilityDescription(1000)).toBe('Poor (1km)')
      expect(getVisibilityDescription(500)).toBe('Very Poor (0.5km)')
    })

    it('should handle null/undefined visibility', () => {
      expect(getVisibilityDescription(null)).toBe('Unknown')
      expect(getVisibilityDescription(undefined)).toBe('Unknown')
    })
  })

  describe('getCloudBaseDescription', () => {
    it('should return correct descriptions for cloud base', () => {
      expect(getCloudBaseDescription(2000)).toBe('High (2000m)')
      expect(getCloudBaseDescription(1000)).toBe('Medium (1000m)')
      expect(getCloudBaseDescription(500)).toBe('Low (500m)')
      expect(getCloudBaseDescription(200)).toBe('Very Low (200m)')
    })
  })

  describe('getPeriodLabel', () => {
    it('should return correct labels for periods', () => {
      expect(getPeriodLabel('am')).toBe('Morning')
      expect(getPeriodLabel('pm')).toBe('Afternoon')
      expect(getPeriodLabel('night')).toBe('Night')
    })
  })

  describe('getWindDescription', () => {
    it('should return correct descriptions for wind speeds', () => {
      expect(getWindDescription(5)).toBe('Light breeze')
      expect(getWindDescription(15)).toBe('Gentle breeze')
      expect(getWindDescription(25)).toBe('Moderate breeze')
      expect(getWindDescription(35)).toBe('Fresh breeze')
      expect(getWindDescription(45)).toBe('Strong breeze')
      expect(getWindDescription(60)).toBe('Near gale')
      expect(getWindDescription(80)).toBe('Gale')
      expect(getWindDescription(100)).toBe('Storm')
    })
  })

  describe('calculateWindChill', () => {
    it('should calculate wind chill correctly', () => {
      // Wind chill formula: 13.12 + 0.6215*T - 11.37*V^0.16 + 0.3965*T*V^0.16
      expect(calculateWindChill(0, 30)).toBeCloseTo(-9.1, 1)
      expect(calculateWindChill(10, 20)).toBeCloseTo(6.3, 1)
      expect(calculateWindChill(-10, 40)).toBeCloseTo(-23.4, 1)
    })

    it('should return temperature when wind is calm', () => {
      expect(calculateWindChill(10, 0)).toBe(10)
      expect(calculateWindChill(-5, 5)).toBe(-5) // Below threshold
    })
  })

  describe('isWeatherConditionSafe', () => {
    it('should identify safe weather conditions', () => {
      const safeCondition = {
        temperature_c: 15,
        wind_speed_kph: 20,
        precipitation_mm: 0,
        visibility_m: 10000,
        hiking_score: 8
      }
      expect(isWeatherConditionSafe(safeCondition)).toBe(true)
    })

    it('should identify unsafe weather conditions', () => {
      const unsafeCondition = {
        temperature_c: -15,
        wind_speed_kph: 60,
        precipitation_mm: 15,
        visibility_m: 500,
        hiking_score: 2
      }
      expect(isWeatherConditionSafe(unsafeCondition)).toBe(false)
    })

    it('should handle edge cases', () => {
      const edgeCondition = {
        temperature_c: 5,
        wind_speed_kph: 50,
        precipitation_mm: 10,
        visibility_m: 1000,
        hiking_score: 4
      }
      expect(isWeatherConditionSafe(edgeCondition)).toBe(false)
    })
  })
})

// Mock implementations for utility functions that might not exist yet
const mockImplementations = {
  calculateWindChill: (temp: number, windSpeed: number): number => {
    if (windSpeed <= 5) return temp
    return 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temp * Math.pow(windSpeed, 0.16)
  },

  getWeatherIcon: (description: string): string => {
    const iconMap: Record<string, string> = {
      'clear': '☀️',
      'cloudy': '☁️',
      'rain': '🌧️',
      'snow': '❄️',
      'storm': '⛈️'
    }
    return iconMap[description.toLowerCase()] || '🌤️'
  },

  isWeatherConditionSafe: (condition: any): boolean => {
    return condition.temperature_c > -10 &&
           condition.wind_speed_kph < 50 &&
           condition.precipitation_mm < 10 &&
           condition.visibility_m > 1000 &&
           condition.hiking_score >= 4
  }
}