import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPreferences } from '@/types'

interface AppState {
  // User preferences
  preferences: UserPreferences
  setPreferences: (preferences: Partial<UserPreferences>) => void

  // Favorite locations
  favoriteLocationIds: string[]
  addFavorite: (locationId: string) => void
  removeFavorite: (locationId: string) => void
  isFavorite: (locationId: string) => boolean

  // Recent locations
  recentLocationIds: string[]
  addRecent: (locationId: string) => void

  // UI state
  isOffline: boolean
  setOffline: (offline: boolean) => void
}

const defaultPreferences: UserPreferences = {
  units: {
    temperature: 'celsius',
    wind: 'kph',
    distance: 'km',
    elevation: 'meters',
  },
  theme: 'dark',
  riskTolerance: 'moderate',
  notifications: {
    enabled: false,
    severeWeather: true,
    favoriteUpdates: true,
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Preferences
      preferences: defaultPreferences,
      setPreferences: preferences =>
        set(state => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      // Favorites
      favoriteLocationIds: [],
      addFavorite: locationId =>
        set(state => ({
          favoriteLocationIds: [...new Set([...state.favoriteLocationIds, locationId])],
        })),
      removeFavorite: locationId =>
        set(state => ({
          favoriteLocationIds: state.favoriteLocationIds.filter(id => id !== locationId),
        })),
      isFavorite: locationId => get().favoriteLocationIds.includes(locationId),

      // Recent locations
      recentLocationIds: [],
      addRecent: locationId =>
        set(state => ({
          recentLocationIds: [
            locationId,
            ...state.recentLocationIds.filter(id => id !== locationId),
          ].slice(0, 10), // Keep last 10
        })),

      // UI state
      isOffline: false,
      setOffline: offline => set({ isOffline: offline }),
    }),
    {
      name: 'mountain-weather-storage',
      partialize: state => ({
        preferences: state.preferences,
        favoriteLocationIds: state.favoriteLocationIds,
        recentLocationIds: state.recentLocationIds,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<AppState> | undefined
        if (!stored) return current
        return {
          ...current,
          favoriteLocationIds: stored.favoriteLocationIds ?? current.favoriteLocationIds,
          recentLocationIds: stored.recentLocationIds ?? current.recentLocationIds,
          preferences: {
            units: {
              ...current.preferences.units,
              ...(stored.preferences?.units ?? {}),
            },
            theme: stored.preferences?.theme ?? current.preferences.theme,
            riskTolerance: stored.preferences?.riskTolerance ?? current.preferences.riskTolerance,
            notifications: {
              ...current.preferences.notifications,
              ...(stored.preferences?.notifications ?? {}),
            },
            homeAddress: stored.preferences?.homeAddress ?? current.preferences.homeAddress,
          },
        }
      },
    }
  )
)