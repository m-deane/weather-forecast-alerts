export * from './weather'

export interface User {
  id: string
  preferences: UserPreferences
  favoriteLocations: string[]
}

export type ThemeMode = 'dark' | 'light' | 'system'

export interface UserPreferences {
  units: {
    temperature: 'celsius' | 'fahrenheit'
    wind: 'kph' | 'mph'
    distance: 'km' | 'miles'
    elevation: 'meters' | 'feet'
  }
  theme: ThemeMode
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  notifications: {
    enabled: boolean
    severeWeather: boolean
    favoriteUpdates: boolean
  }
  homeAddress?: string
}