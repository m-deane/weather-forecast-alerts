export * from './weather'

export interface User {
  id: string
  preferences: UserPreferences
  favoriteLocations: string[]
}

export interface UserPreferences {
  units: {
    temperature: 'celsius' | 'fahrenheit'
    wind: 'kph' | 'mph'
    distance: 'km' | 'miles'
  }
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  notifications: {
    enabled: boolean
    severeWeather: boolean
    favoriteUpdates: boolean
  }
}