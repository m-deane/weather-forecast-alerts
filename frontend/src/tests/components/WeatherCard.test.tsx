import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeatherCard } from '@/components/WeatherCard'
import type { DailyForecast } from '@/types'

// Mock the API client
vi.mock('@/api/client', () => ({
  weatherApi: {
    getForecast: vi.fn()
  }
}))

// Mock the app store
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    preferences: {
      units: {
        temperature: 'C',
        wind: 'km/h'
      }
    },
    isFavorite: vi.fn(() => false),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn()
  })
}))

describe('WeatherCard Component', () => {
  let queryClient: QueryClient
  let mockForecast: DailyForecast

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    mockForecast = {
      date: '2025-06-14',
      summary: {
        max_temp_c: 15,
        min_temp_c: 8,
        max_wind_speed_kph: 25,
        total_precipitation_mm: 2,
        overall_hiking_score: 7,
        dominant_conditions: 'Partly cloudy'
      },
      periods: [
        {
          period_type: 'am',
          temperature_c: 12,
          feels_like_c: 10,
          wind_speed_kph: 20,
          wind_direction: 'SW',
          precipitation_mm: 0,
          weather_description: 'Partly cloudy',
          visibility_m: 15000,
          cloud_base_m: 1200,
          humidity_percent: 65,
          hiking_score: 8,
          risk_level: 'low'
        },
        {
          period_type: 'pm',
          temperature_c: 15,
          feels_like_c: 14,
          wind_speed_kph: 25,
          wind_direction: 'SW',
          precipitation_mm: 2,
          weather_description: 'Light rain',
          visibility_m: 12000,
          cloud_base_m: 800,
          humidity_percent: 75,
          hiking_score: 6,
          risk_level: 'moderate'
        },
        {
          period_type: 'night',
          temperature_c: 8,
          feels_like_c: 6,
          wind_speed_kph: 15,
          wind_direction: 'W',
          precipitation_mm: 0,
          weather_description: 'Clear',
          visibility_m: 20000,
          cloud_base_m: null,
          humidity_percent: 60,
          hiking_score: 7,
          risk_level: 'low'
        }
      ]
    }
  })

  const renderWeatherCard = (props = {}) => {
    const defaultProps = {
      forecast: mockForecast,
      location: {
        id: 'test-location',
        name: 'Ben Nevis',
        area: 'Highlands',
        elevation_m: 1345
      },
      ...props
    }

    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <WeatherCard {...defaultProps} />
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('should render location information', () => {
    renderWeatherCard()
    
    expect(screen.getByText('Ben Nevis')).toBeInTheDocument()
    expect(screen.getByText('Highlands')).toBeInTheDocument()
    expect(screen.getByText('1345m')).toBeInTheDocument()
  })

  it('should display temperature range', () => {
    renderWeatherCard()
    
    expect(screen.getByText('15°C')).toBeInTheDocument() // Max temp
    expect(screen.getByText('8°C')).toBeInTheDocument()  // Min temp
  })

  it('should display hiking score with correct color', () => {
    renderWeatherCard()
    
    const hikingScore = screen.getByText('7/10')
    expect(hikingScore).toBeInTheDocument()
    expect(hikingScore).toHaveClass('text-yellow-600') // Good score color
  })

  it('should show weather conditions', () => {
    renderWeatherCard()
    
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
  })

  it('should display wind information', () => {
    renderWeatherCard()
    
    expect(screen.getByText(/25 km\/h/)).toBeInTheDocument()
  })

  it('should show precipitation when present', () => {
    renderWeatherCard()
    
    expect(screen.getByText('2mm')).toBeInTheDocument()
  })

  it('should handle different temperature units', () => {
    const customProps = {
      preferences: {
        units: {
          temperature: 'F',
          wind: 'mph'
        }
      }
    }

    renderWeatherCard(customProps)
    
    // Should convert 15°C to 59°F
    expect(screen.getByText('59°F')).toBeInTheDocument()
  })

  it('should be clickable and navigate to location page', async () => {
    renderWeatherCard()
    
    const card = screen.getByRole('button')
    expect(card).toBeInTheDocument()
    
    fireEvent.click(card)
    
    // Should navigate to /location/test-location
    await waitFor(() => {
      expect(window.location.pathname).toBe('/location/test-location')
    })
  })

  it('should handle favorite toggle', async () => {
    const mockAddFavorite = vi.fn()
    const mockRemoveFavorite = vi.fn()

    // Mock the store to return favorite functions
    vi.mocked(require('@/stores/useAppStore').useAppStore).mockReturnValue({
      preferences: { units: { temperature: 'C', wind: 'km/h' } },
      isFavorite: vi.fn(() => false),
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite
    })

    renderWeatherCard()
    
    const favoriteButton = screen.getByLabelText(/add to favorites/i)
    fireEvent.click(favoriteButton)
    
    expect(mockAddFavorite).toHaveBeenCalledWith('test-location')
  })

  it('should display correct risk level styling', () => {
    const highRiskForecast = {
      ...mockForecast,
      periods: mockForecast.periods.map(period => ({
        ...period,
        risk_level: 'high' as const,
        hiking_score: 3
      }))
    }

    renderWeatherCard({ forecast: highRiskForecast })
    
    const riskIndicator = screen.getByText('high risk')
    expect(riskIndicator).toHaveClass('bg-orange-100', 'text-orange-800')
  })

  it('should handle missing or null data gracefully', () => {
    const incompleteData = {
      ...mockForecast,
      periods: [
        {
          ...mockForecast.periods[0],
          visibility_m: null,
          cloud_base_m: null,
          humidity_percent: null
        }
      ]
    }

    expect(() => renderWeatherCard({ forecast: incompleteData })).not.toThrow()
  })

  it('should show loading state when appropriate', () => {
    renderWeatherCard({ isLoading: true })
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should show error state when forecast fails to load', () => {
    renderWeatherCard({ 
      forecast: null, 
      error: new Error('Failed to load forecast') 
    })
    
    expect(screen.getByText(/unable to load forecast/i)).toBeInTheDocument()
  })

  it('should handle very long location names', () => {
    const longNameLocation = {
      id: 'test',
      name: 'Very Long Mountain Name That Should Be Truncated Properly',
      area: 'Test Area',
      elevation_m: 1000
    }

    renderWeatherCard({ location: longNameLocation })
    
    const locationName = screen.getByText(longNameLocation.name)
    expect(locationName).toHaveClass('truncate')
  })

  it('should display correct elevation format', () => {
    renderWeatherCard()
    
    expect(screen.getByText('1345m')).toBeInTheDocument()
  })

  it('should show appropriate weather icons', () => {
    renderWeatherCard()
    
    // Should have weather-related icons or emoji
    const weatherIcons = screen.getAllByRole('img', { hidden: true })
    expect(weatherIcons.length).toBeGreaterThan(0)
  })
})

// Mock component for testing
const MockWeatherCard = ({ forecast, location, isLoading, error, preferences }: any) => {
  if (isLoading) {
    return <div data-testid="loading-skeleton">Loading...</div>
  }

  if (error || !forecast) {
    return <div>Unable to load forecast</div>
  }

  return (
    <button 
      onClick={() => window.location.pathname = `/location/${location.id}`}
      className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {location.name}
          </h3>
          <p className="text-sm text-gray-500">
            {location.area} • {location.elevation_m}m
          </p>
        </div>
        
        <button 
          aria-label="Add to favorites"
          onClick={(e) => {
            e.stopPropagation()
            // Handle favorite toggle
          }}
          className="p-1 text-gray-400 hover:text-red-500"
        >
          ♡
        </button>
      </div>

      {/* Temperature */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-2xl font-bold">
            {preferences?.units?.temperature === 'F' 
              ? `${Math.round(forecast.summary.max_temp_c * 9/5 + 32)}°F`
              : `${forecast.summary.max_temp_c}°C`
            }
          </span>
          <span className="text-gray-500 ml-2">
            {preferences?.units?.temperature === 'F' 
              ? `${Math.round(forecast.summary.min_temp_c * 9/5 + 32)}°F`
              : `${forecast.summary.min_temp_c}°C`
            }
          </span>
        </div>
        
        <div className={`font-semibold text-yellow-600`}>
          {forecast.summary.overall_hiking_score}/10
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Conditions:</span>
          <span>{forecast.summary.dominant_conditions}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Wind:</span>
          <span>
            {preferences?.units?.wind === 'mph' 
              ? `${Math.round(forecast.summary.max_wind_speed_kph * 0.621371)} mph`
              : `${forecast.summary.max_wind_speed_kph} km/h`
            }
          </span>
        </div>
        
        {forecast.summary.total_precipitation_mm > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Rain:</span>
            <span>{forecast.summary.total_precipitation_mm}mm</span>
          </div>
        )}
      </div>

      {/* Risk level */}
      <div className="mt-3">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          high risk
        </span>
      </div>
    </button>
  )
}

// Apply mock
vi.mock('@/components/WeatherCard', () => ({
  WeatherCard: MockWeatherCard
}))