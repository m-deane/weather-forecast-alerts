import { useState, useEffect, useCallback } from 'react'

interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

interface GeolocationError {
  code: number
  message: string
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
  onSuccess?: (position: GeolocationPosition) => void
  onError?: (error: GeolocationError) => void
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false,
    onSuccess,
    onError
  } = options

  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<GeolocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('geolocation' in navigator)
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = {
          code: 0,
          message: 'Geolocation is not supported by this browser'
        }
        reject(error)
        return
      }

      setIsLoading(true)
      setError(null)

      const success = (pos: GeolocationPosition) => {
        const position: GeolocationPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude || undefined,
          altitudeAccuracy: pos.coords.altitudeAccuracy || undefined,
          heading: pos.coords.heading || undefined,
          speed: pos.coords.speed || undefined,
          timestamp: pos.timestamp
        }

        setPosition(position)
        setIsLoading(false)
        onSuccess?.(position)
        resolve(position)
      }

      const error = (err: GeolocationPositionError) => {
        const geolocationError: GeolocationError = {
          code: err.code,
          message: getErrorMessage(err.code)
        }

        setError(geolocationError)
        setIsLoading(false)
        onError?.(geolocationError)
        reject(geolocationError)
      }

      navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy,
        timeout,
        maximumAge
      })
    })
  }, [enableHighAccuracy, timeout, maximumAge, onSuccess, onError])

  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) return

    setIsLoading(true)
    setError(null)

    const success = (pos: GeolocationPosition) => {
      const position: GeolocationPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude || undefined,
        altitudeAccuracy: pos.coords.altitudeAccuracy || undefined,
        heading: pos.coords.heading || undefined,
        speed: pos.coords.speed || undefined,
        timestamp: pos.timestamp
      }

      setPosition(position)
      setIsLoading(false)
      onSuccess?.(position)
    }

    const error = (err: GeolocationPositionError) => {
      const geolocationError: GeolocationError = {
        code: err.code,
        message: getErrorMessage(err.code)
      }

      setError(geolocationError)
      setIsLoading(false)
      onError?.(geolocationError)
    }

    const watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy,
      timeout,
      maximumAge
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enableHighAccuracy, timeout, maximumAge, onSuccess, onError])

  useEffect(() => {
    if (watch && isSupported) {
      return watchPosition()
    }
  }, [watch, isSupported, watchPosition])

  return {
    position,
    error,
    isLoading,
    isSupported,
    getCurrentPosition,
    watchPosition
  }
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access denied by user'
    case 2:
      return 'Location information unavailable'
    case 3:
      return 'Location request timed out'
    default:
      return 'An unknown error occurred while retrieving location'
  }
}

// Hook for finding nearest locations
export function useNearestLocations(
  userPosition: GeolocationPosition | null,
  locations: Array<{ id: string; latitude: number; longitude: number; name: string; distance?: number }>
) {
  const [nearestLocations, setNearestLocations] = useState<typeof locations>([])

  useEffect(() => {
    if (!userPosition || !locations.length) {
      setNearestLocations([])
      return
    }

    const locationsWithDistance = locations.map(location => ({
      ...location,
      distance: calculateDistance(
        userPosition.latitude,
        userPosition.longitude,
        location.latitude,
        location.longitude
      )
    }))

    const sorted = locationsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    setNearestLocations(sorted)
  }, [userPosition, locations])

  return nearestLocations
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Hook for location permission management
export function useLocationPermission() {
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setPermission(null)
      return
    }

    setIsChecking(true)
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      setPermission(result.state)

      // Listen for permission changes
      result.onchange = () => {
        setPermission(result.state)
      }
    } catch (error) {
      console.error('Error checking location permission:', error)
      setPermission(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  const requestPermission = useCallback(async (): Promise<PermissionState | null> => {
    if (!navigator.geolocation) return null

    try {
      // Trigger permission request by calling getCurrentPosition
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (error) => {
            if (error.code === 1) {
              // Permission denied
              setPermission('denied')
            }
            reject(error)
          },
          { timeout: 1000, maximumAge: 0 }
        )
      })

      // Check permission again after request
      await checkPermission()
      return permission
    } catch (error) {
      console.error('Error requesting location permission:', error)
      return null
    }
  }, [checkPermission, permission])

  return {
    permission,
    isChecking,
    checkPermission,
    requestPermission
  }
}