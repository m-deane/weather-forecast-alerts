import axios from 'axios'
import type { WeatherForecast, Location } from '@/types'

const API_BASE_URL = '/api/v1' // Temporarily hardcoded

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
apiClient.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Weather API endpoints
export const weatherApi = {
  getForecast: async (locationId: string): Promise<WeatherForecast> => {
    const { data } = await apiClient.get(`/weather/${locationId}`)
    return data
  },

  compareLocations: async (locationIds: string[]): Promise<WeatherForecast[]> => {
    const { data } = await apiClient.get('/weather/compare', {
      params: { locations: locationIds.join(',') },
    })
    return data
  },
}

// Location API endpoints
export const locationApi = {
  search: async (query: string): Promise<Location[]> => {
    const { data } = await apiClient.get('/locations', {
      params: { q: query },
    })
    return data.locations || data
  },

  getById: async (id: string): Promise<Location> => {
    const { data } = await apiClient.get(`/locations/${id}`)
    return data
  },

  getAreas: async (): Promise<{ id: string; name: string; locationCount: number }[]> => {
    const { data } = await apiClient.get('/areas')
    return data
  },

  getNearby: async (lat: number, lon: number, radius = 50): Promise<Location[]> => {
    const { data } = await apiClient.get('/locations/nearby', {
      params: { lat, lon, radius },
    })
    return data
  },
}