import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAppStore } from '@/stores/useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const { result } = renderHook(() => useAppStore())
    act(() => {
      useAppStore.setState({
        favoriteLocationIds: [],
        recentLocationIds: [],
        isOffline: false,
        preferences: {
          units: { temperature: 'celsius', wind: 'kph', distance: 'km' },
          riskTolerance: 'moderate',
          notifications: { enabled: false, severeWeather: true, favoriteUpdates: true },
        },
      })
    })
  })

  describe('Favorites', () => {
    it('should start with empty favorites', () => {
      const { result } = renderHook(() => useAppStore())
      expect(result.current.favoriteLocationIds).toEqual([])
    })

    it('should add a favorite', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addFavorite('ben-nevis')
      })
      expect(result.current.favoriteLocationIds).toContain('ben-nevis')
    })

    it('should not duplicate favorites', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addFavorite('ben-nevis')
        result.current.addFavorite('ben-nevis')
      })
      expect(result.current.favoriteLocationIds.filter(id => id === 'ben-nevis')).toHaveLength(1)
    })

    it('should remove a favorite', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addFavorite('ben-nevis')
        result.current.addFavorite('ben-macdui')
        result.current.removeFavorite('ben-nevis')
      })
      expect(result.current.favoriteLocationIds).not.toContain('ben-nevis')
      expect(result.current.favoriteLocationIds).toContain('ben-macdui')
    })

    it('should check if location is favorite', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addFavorite('ben-nevis')
      })
      expect(result.current.isFavorite('ben-nevis')).toBe(true)
      expect(result.current.isFavorite('ben-macdui')).toBe(false)
    })
  })

  describe('Recent Locations', () => {
    it('should start with empty recents', () => {
      const { result } = renderHook(() => useAppStore())
      expect(result.current.recentLocationIds).toEqual([])
    })

    it('should add recent location at the front', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addRecent('loc-1')
        result.current.addRecent('loc-2')
      })
      expect(result.current.recentLocationIds[0]).toBe('loc-2')
      expect(result.current.recentLocationIds[1]).toBe('loc-1')
    })

    it('should move duplicate to front instead of adding twice', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.addRecent('loc-1')
        result.current.addRecent('loc-2')
        result.current.addRecent('loc-1')
      })
      expect(result.current.recentLocationIds).toEqual(['loc-1', 'loc-2'])
    })

    it('should limit to 10 recent locations', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addRecent(`loc-${i}`)
        }
      })
      expect(result.current.recentLocationIds).toHaveLength(10)
      // Most recent should be first
      expect(result.current.recentLocationIds[0]).toBe('loc-14')
    })
  })

  describe('Preferences', () => {
    it('should have default preferences', () => {
      const { result } = renderHook(() => useAppStore())
      expect(result.current.preferences.units.temperature).toBe('celsius')
      expect(result.current.preferences.riskTolerance).toBe('moderate')
    })

    it('should update preferences partially', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.setPreferences({ riskTolerance: 'conservative' })
      })
      expect(result.current.preferences.riskTolerance).toBe('conservative')
      // Other preferences should be preserved
      expect(result.current.preferences.units.temperature).toBe('celsius')
    })
  })

  describe('Offline State', () => {
    it('should start online', () => {
      const { result } = renderHook(() => useAppStore())
      expect(result.current.isOffline).toBe(false)
    })

    it('should toggle offline state', () => {
      const { result } = renderHook(() => useAppStore())
      act(() => {
        result.current.setOffline(true)
      })
      expect(result.current.isOffline).toBe(true)
      act(() => {
        result.current.setOffline(false)
      })
      expect(result.current.isOffline).toBe(false)
    })
  })
})
