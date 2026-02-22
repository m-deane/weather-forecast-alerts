import axios from 'axios'
import type { WeatherForecast, Location, MountainPhoto, WalkHighlandsRoute, PhotographyViewpointData } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

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
  error => Promise.reject(error)
)

// Weather API endpoints
export const weatherApi = {
  getForecast: async (locationId: string): Promise<WeatherForecast> => {
    const { data } = await apiClient.get(`/weather/${locationId}`)
    return data
  },

  compareLocations: async (locationIds: string[]): Promise<WeatherForecast[]> => {
    const { data } = await apiClient.get('/weather/compare', {
      params: { location_ids: locationIds.join(',') },
    })
    return data.comparisons || data
  },
}

// Scrape trigger API
export const scrapeApi = {
  trigger: () => fetch(`${API_BASE_URL}/scrape/trigger`, { method: 'POST' }).then(r => r.json()),
  getStatus: () => fetch(`${API_BASE_URL}/scrape/status`).then(r => r.json()),
}

// Location API endpoints
export const locationApi = {
  search: async (query: string): Promise<Location[]> => {
    const { data } = await apiClient.get('/locations', {
      params: { search: query },
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

// Integrations API endpoints (photos, routes, photography viewpoints)
export const integrationsApi = {
  getPhotos: async (locationId: string): Promise<MountainPhoto[]> => {
    const { data } = await apiClient.get(`/locations/${locationId}/photos`)
    return data.photos || []
  },

  getRoutes: async (locationId: string): Promise<WalkHighlandsRoute[]> => {
    const { data } = await apiClient.get(`/locations/${locationId}/routes`)
    return data.routes || []
  },

  getPhotographyViewpoints: async (locationId: string): Promise<PhotographyViewpointData> => {
    const { data } = await apiClient.get(`/locations/${locationId}/photography`)
    return data
  },
}