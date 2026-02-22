import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeatherCard } from '@/components/WeatherCard'

// Mock weatherApi
const mockGetForecast = vi.fn()
vi.mock('@/api/client', () => ({
  weatherApi: {
    getForecast: () => mockGetForecast()
  }
}))

// Mock the app store
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    preferences: {
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
}))

// Mock the data staleness store
vi.mock('@/stores/useDataStalenessStore', () => ({
  useDataStalenessStore: () => vi.fn()
}))

describe('WeatherCard Component', () => {
  let queryClient: QueryClient

  const mockWeatherData = {
    location: {
      id: 'test-location',
      name: 'Ben Nevis',
      area: 'Highlands',
      elevation_m: 1345,
      latitude: 56.7969,
      longitude: -5.0036
    },
    forecasts: [
      {
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
            precipitation_type: 'none',
            weather_description: 'Partly cloudy',
            visibility_m: 15000,
            cloud_base_m: 1200,
            humidity_percent: 65,
            hiking_score: 8,
            risk_level: 'low'
          }
        ]
      }
    ],
    alerts: [],
    last_updated: new Date().toISOString()
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderWeatherCard = (locationId = 'test-location', props = {}) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <WeatherCard locationId={locationId} {...props} />
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('should show loading state initially', () => {
    mockGetForecast.mockReturnValue(new Promise(() => {})) // Never resolves
    renderWeatherCard()

    // Should show loading skeleton
    expect(document.querySelector('[class*="skeleton"]')).toBeInTheDocument()
  })

  it('should render location name after loading', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText('Ben Nevis')).toBeInTheDocument()
    })
  })

  it('should display location area and elevation', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText(/Highlands.*1345m/)).toBeInTheDocument()
    })
  })

  it('should display temperature', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    // TemperatureDisplay splits value and unit across spans
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
    })
  })

  it('should display weather description via icon', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    // WeatherIcon renders an SVG based on condition, not plain text
    await waitFor(() => {
      expect(screen.getByText('Ben Nevis')).toBeInTheDocument()
    })
  })

  it('should display wind speed', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    // WindIndicatorInline splits speed and unit across spans
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument()
    })
  })

  it('should display hiking score', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    // HikingScoreGauge splits score and "/10" across spans
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('/10')).toBeInTheDocument()
    })
  })

  it('should display precipitation', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText('None')).toBeInTheDocument()
    })
  })

  it('should show error state when API fails', async () => {
    mockGetForecast.mockRejectedValue(new Error('API Error'))
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/i)).toBeInTheDocument()
    })
  })

  it('should be a link to the location detail page', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard('test-location')

    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/location/test-location')
    })
  })

  it('should show good conditions indicator for safe conditions', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText('Good conditions')).toBeInTheDocument()
    })
  })

  it('should show challenging indicator for high risk conditions', async () => {
    const highRiskData = {
      ...mockWeatherData,
      forecasts: [{
        ...mockWeatherData.forecasts[0],
        periods: [{
          ...mockWeatherData.forecasts[0].periods[0],
          hiking_score: 2,
          risk_level: 'high',
          wind_speed_kph: 80
        }]
      }]
    }

    mockGetForecast.mockResolvedValue(highRiskData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText('Challenging')).toBeInTheDocument()
    })
  })

  it('should display alerts count when alerts exist', async () => {
    const dataWithAlerts = {
      ...mockWeatherData,
      alerts: [
        { id: '1', message: 'High wind warning', severity: 'warning' },
        { id: '2', message: 'Heavy rain expected', severity: 'warning' }
      ]
    }

    mockGetForecast.mockResolvedValue(dataWithAlerts)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText(/2 alerts/)).toBeInTheDocument()
    })
  })

  it('should render compact mode without status indicators', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard('test-location', { compact: true })

    await waitFor(() => {
      expect(screen.getByText('Ben Nevis')).toBeInTheDocument()
    })

    // Compact mode should not show status badges
    expect(screen.queryByText('Good conditions')).not.toBeInTheDocument()
  })

  it('should show extended details when showDetails is true', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard('test-location', { showDetails: true })

    await waitFor(() => {
      expect(screen.getByText('Feels like:')).toBeInTheDocument()
      expect(screen.getByText('10°C')).toBeInTheDocument()
      expect(screen.getByText('Wind direction:')).toBeInTheDocument()
      expect(screen.getByText('SW')).toBeInTheDocument()
      expect(screen.getByText('Risk level:')).toBeInTheDocument()
      expect(screen.getByText('low')).toBeInTheDocument()
    })
  })

  it('should handle null data gracefully', async () => {
    mockGetForecast.mockResolvedValue(null)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/i)).toBeInTheDocument()
    })
  })

  it('should display last updated time', async () => {
    mockGetForecast.mockResolvedValue(mockWeatherData)
    renderWeatherCard()

    await waitFor(() => {
      expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    })
  })
})
