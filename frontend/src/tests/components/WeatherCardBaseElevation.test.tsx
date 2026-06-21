import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeatherCard } from '@/components/WeatherCard'

// Mock weatherApi — same pattern as WeatherCard.test.tsx
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

// Summit period — the existing/primary figures.
const summitPeriod = {
  period_type: 'am',
  temperature_c: 2,
  feels_like_c: -3,
  wind_speed_kph: 35,
  wind_direction: 'NW',
  precipitation_mm: 0,
  precipitation_type: 'none',
  weather_description: 'Partly cloudy',
  visibility_m: 15000,
  cloud_base_m: 900,
  humidity_percent: 70,
  hiking_score: 4,
  risk_level: 'moderate'
}

// Base period — warmer/calmer than the summit, per the lower altitude.
const basePeriod = {
  ...summitPeriod,
  temperature_c: 9,
  feels_like_c: 7,
  wind_speed_kph: 18,
  hiking_score: 8
}

// Forecast WITH base data (Feature 2 contract: periods_base + elevation_base_m).
const forecastWithBase = {
  location: {
    id: 'beinn-eighe',
    name: 'Beinn Eighe',
    area: 'Torridon',
    elevation_m: 1010,
    elevation_base_m: 500,
    forecast_altitude_label_base: 'Base forecast (500m)',
    latitude: 57.5961,
    longitude: -5.4072
  },
  forecasts: [
    {
      date: '2026-06-20',
      summary: {
        max_temp_c: 4,
        min_temp_c: 1,
        max_wind_speed_kph: 35,
        total_precipitation_mm: 0,
        overall_hiking_score: 4,
        best_period: 'pm'
      },
      periods: [summitPeriod],
      periods_base: [basePeriod]
    }
  ],
  alerts: [],
  data_source: 'mountain-forecast.com',
  last_updated: new Date().toISOString()
}

// Forecast WITHOUT base data — summit only (backward-compatible path).
const forecastSummitOnly = {
  ...forecastWithBase,
  location: {
    id: 'beinn-eighe',
    name: 'Beinn Eighe',
    area: 'Torridon',
    elevation_m: 1010,
    latitude: 57.5961,
    longitude: -5.4072
  },
  forecasts: [
    {
      ...forecastWithBase.forecasts[0],
      periods_base: undefined
    }
  ]
}

describe('WeatherCard — base-vs-summit display (Feature 2)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderCard = () =>
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <WeatherCard locationId="beinn-eighe" />
        </QueryClientProvider>
      </BrowserRouter>
    )

  it('renders BOTH summit and base figures when periods_base is present', async () => {
    mockGetForecast.mockResolvedValue(forecastWithBase)
    renderCard()

    await waitFor(() => {
      expect(screen.getByText('Beinn Eighe')).toBeInTheDocument()
    })

    // Explicit, unambiguous altitude labels — base must never be confused with summit.
    expect(screen.getByText('Summit (1010m)')).toBeInTheDocument()
    expect(screen.getByText('Base (500m)')).toBeInTheDocument()

    // Both temperatures render (summit 2°C, base 9°C).
    expect(screen.getByText('2°C')).toBeInTheDocument()
    expect(screen.getByText('9°C')).toBeInTheDocument()

    // Both hiking scores render in the comparison block (summit 4/10, base 8/10).
    expect(screen.getByText('4/10')).toBeInTheDocument()
    expect(screen.getByText('8/10')).toBeInTheDocument()
  })

  it('renders summit-only without error when periods_base is undefined', async () => {
    mockGetForecast.mockResolvedValue(forecastSummitOnly)
    renderCard()

    await waitFor(() => {
      expect(screen.getByText('Beinn Eighe')).toBeInTheDocument()
    })

    // No base comparison block — its explicit labels must be absent.
    expect(screen.queryByText(/^Base \(/)).not.toBeInTheDocument()
    expect(screen.queryByText('Summit (1010m)')).not.toBeInTheDocument()

    // Summit area + elevation line still renders normally.
    expect(screen.getByText(/Torridon.*1010m/)).toBeInTheDocument()
  })
})
