import React, { useState } from 'react'
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { useGeolocation, useNearestLocations, useLocationPermission } from '@/hooks/useGeolocation'

const SCOTTISH_CITIES = [
  { name: 'Inverness', latitude: 57.4778, longitude: -4.2247 },
  { name: 'Fort William', latitude: 56.8198, longitude: -5.1052 },
  { name: 'Aviemore', latitude: 57.1953, longitude: -3.8283 },
  { name: 'Glasgow', latitude: 55.8642, longitude: -4.2518 },
  { name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
]

interface LocationDetectionProps {
  locations: Array<{
    id: string
    name: string
    latitude: number
    longitude: number
    area: string
    elevation_m: number
  }>
  onLocationSelect: (location: any) => void
  onLocationDetected?: (coords: { latitude: number; longitude: number }) => void
  className?: string
}

export function LocationDetection({
  locations,
  onLocationSelect,
  onLocationDetected,
  className
}: LocationDetectionProps) {
  const [selectedCity, setSelectedCity] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const { permission, requestPermission } = useLocationPermission()
  
  const {
    position,
    error,
    isLoading,
    isSupported,
    getCurrentPosition
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5 minutes
  })

  const nearestLocations = useNearestLocations(position, locations)

  const handleLocationRequest = async () => {
    if (permission === 'denied') {
      setIsExpanded(true)
      return
    }

    if (permission === 'prompt') {
      await requestPermission()
    }

    try {
      await getCurrentPosition()
      setIsExpanded(true)
    } catch (err) {
      setIsExpanded(true)
    }
  }

  const getStatusMessage = () => {
    if (!isSupported) {
      return 'Location services not supported'
    }
    if (permission === 'denied') {
      return 'Location access denied'
    }
    if (error) {
      return error.message
    }
    if (isLoading) {
      return 'Finding your location...'
    }
    if (position) {
      return `Found ${nearestLocations.length} nearby locations`
    }
    return 'Find locations near you'
  }

  const getStatusColor = () => {
    if (!isSupported || permission === 'denied' || error) {
      return 'text-amber-400'
    }
    if (isLoading) {
      return 'text-blue-600'
    }
    if (position) {
      return 'text-green-600'
    }
    return 'text-gray-600'
  }

  const canRequestLocation = isSupported && permission !== 'denied' && !isLoading

  if (!isExpanded) {
    return (
      <button
        onClick={handleLocationRequest}
        disabled={!canRequestLocation}
        className={cn(
          'w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg transition-colors',
          canRequestLocation 
            ? 'hover:bg-gray-50 hover:border-gray-300' 
            : 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="flex-shrink-0">
          {isLoading ? (
            <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
          ) : error || permission === 'denied' ? (
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
          ) : (
            <MapPinIcon className="w-5 h-5 text-gray-600" />
          )}
        </div>
        
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {position ? 'Nearby Locations' : 'Use My Location'}
          </div>
          <div className={cn('text-sm', getStatusColor())}>
            {getStatusMessage()}
          </div>
        </div>

        {position && nearestLocations.length > 0 && (
          <div className="text-sm text-gray-500">
            {nearestLocations.length} found
          </div>
        )}
      </button>
    )
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <MapPinIcon className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">Location Services</h3>
            <p className={cn('text-sm', getStatusColor())}>
              {getStatusMessage()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(false)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Error state - amber warning with city picker fallback */}
        {(error || permission === 'denied' || !isSupported) && (
          <div className="py-4">
            <div className="bg-slate-800 border border-amber-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-400 mb-1">
                    {!isSupported ? 'Location Not Supported' :
                     permission === 'denied' ? 'Location Access Denied' :
                     'Location Unavailable'}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {!isSupported ? 'Your browser doesn\'t support location services.' :
                     permission === 'denied' ? 'You can enable location in browser settings, or select a nearby city below.' :
                     error?.message || 'Unable to determine your location.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select a nearby city instead
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  const city = SCOTTISH_CITIES.find(c => c.name === e.target.value)
                  setSelectedCity(e.target.value)
                  if (city && onLocationDetected) {
                    onLocationDetected({ latitude: city.latitude, longitude: city.longitude })
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                aria-label="Select a nearby Scottish city"
              >
                <option value="">Choose a city...</option>
                {SCOTTISH_CITIES.map(city => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>

            {canRequestLocation && (
              <button
                onClick={handleLocationRequest}
                className="mt-4 w-full bg-slate-700 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                Try Location Again
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-6">
            <ArrowPathIcon className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-spin" />
            <h4 className="font-medium text-blue-800 mb-2">Finding Your Location</h4>
            <p className="text-sm text-blue-600">
              This may take a few moments...
            </p>
          </div>
        )}

        {/* Success state with nearby locations */}
        {position && nearestLocations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 font-medium">
                Location found ({position.accuracy.toFixed(0)}m accuracy)
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 mb-3">
                Nearest Locations ({nearestLocations.slice(0, 5).length})
              </h4>
              
              {nearestLocations.slice(0, 5).map((location, index) => (
                <button
                  key={location.id}
                  onClick={() => onLocationSelect(location)}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{location.name}</div>
                    <div className="text-sm text-gray-500">
                      {location.area} • {location.elevation_m}m
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {location.distance ? `${location.distance.toFixed(1)}km` : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      #{index + 1} closest
                    </div>
                  </div>
                </button>
              ))}

              {nearestLocations.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-500">
                    +{nearestLocations.length - 5} more locations within range
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success state with no nearby locations */}
        {position && nearestLocations.length === 0 && (
          <div className="text-center py-6">
            <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-600 mb-2">No Nearby Locations</h4>
            <p className="text-sm text-gray-500">
              No mountain locations found within a reasonable distance of your current position.
            </p>
          </div>
        )}

        {/* Permission prompt */}
        {permission === 'prompt' && !isLoading && !position && (
          <div className="text-center py-6">
            <MapPinIcon className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h4 className="font-medium text-blue-800 mb-2">Location Access Required</h4>
            <p className="text-sm text-blue-600 mb-4">
              Allow location access to find mountain weather stations near you.
            </p>
            <button
              onClick={handleLocationRequest}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Allow Location Access
            </button>
          </div>
        )}
      </div>
    </div>
  )
}