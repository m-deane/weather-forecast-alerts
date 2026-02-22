export interface Location {
  id: string
  name: string
  area: string
  elevation_m: number
  latitude: number
  longitude: number
  classification: 'munro' | 'corbett' | 'graham' | 'hill'
  difficulty: 'easy' | 'moderate' | 'challenging' | 'extreme'
  current_score?: number // Current hiking score (1-10), if available
}

export interface PhotographyOpportunity {
  type: 'sunrise' | 'sunset' | 'golden_hour' | 'cloud_inversion' | 'clear_sky'
  probability: number
  description: string
}

export interface WeatherPeriod {
  period_type: 'am' | 'pm' | 'night' | 'current'
  temperature_c: number
  feels_like_c: number
  wind_speed_kph: number
  wind_direction: string
  gust_speed_kph?: number
  precipitation_mm: number
  precipitation_type: 'none' | 'rain' | 'snow' | 'sleet'
  cloud_base_m?: number
  freezing_level_m?: number
  visibility_m?: number
  humidity_percent?: number
  weather_description: string
  hiking_score: number
  risk_level: 'low' | 'moderate' | 'high' | 'extreme'
}

export interface DailyForecast {
  date: string
  periods: WeatherPeriod[]
  summary: {
    max_temp_c: number
    min_temp_c: number
    total_precipitation_mm: number
    max_wind_speed_kph: number
    overall_hiking_score: number
    best_period: string
  }
}

export interface WeatherForecast {
  location: Location
  forecasts: DailyForecast[]
  last_updated: string
  data_source: string
  alerts?: WeatherAlert[]
}

export interface WeatherAlert {
  severity: 'warning' | 'watch' | 'advisory' | 'info'
  title?: string
  message?: string
  description?: string
  valid_from?: string
  valid_to?: string
}

export interface HikingSuitability {
  score: number // 1-10
  level: 'poor' | 'moderate' | 'good' | 'excellent'
  recommendation: string
  risk_factors: string[]
  gear_suggestions: string[]
}

export interface MountainPhoto {
  url: string
  thumbnail_url: string
  alt: string
  attribution?: string
  attribution_url?: string
  season?: string
  tags?: string[]
}

export interface WalkHighlandsRoute {
  name: string
  url: string
  distance_km: number
  ascent_m: number
  estimated_hours: number
  grade: number
  category: string
  parking?: {
    name: string
    latitude: number
    longitude: number
    postcode?: string
  }
}

export interface PhotographyViewpoint {
  name: string
  description: string
  optimal_light: string
  compass_bearing: number
  subjects: string[]
}

export interface PhotographyViewpointData {
  photography_notes: string
  key_viewpoints: PhotographyViewpoint[]
  best_seasons: string[]
  fotovue_guide_url?: string
  fotovue_guide_name?: string
}