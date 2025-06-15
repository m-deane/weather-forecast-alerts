import React, { useState } from 'react'
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { useGeolocation, useNearestLocations, useLocationPermission } from '@/hooks/useGeolocation'

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
  className?: string
}

export function LocationDetection({ 
  locations, 
  onLocationSelect, 
  className 
}: LocationDetectionProps) {
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
      return 'text-red-600'
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
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
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
        {/* Error state */}
        {(error || permission === 'denied' || !isSupported) && (
          <div className="text-center py-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h4 className="font-medium text-red-800 mb-2">
              {!isSupported ? 'Not Supported' : 
               permission === 'denied' ? 'Access Denied' : 
               'Location Error'}
            </h4>
            <p className="text-sm text-red-600 mb-4">
              {!isSupported ? 'Your browser doesn\'t support location services.' :
               permission === 'denied' ? 'Location access has been denied. Please enable it in your browser settings.' :
               error?.message}
            </p>
            
            {permission === 'denied' && (
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-2">To enable location access:</p>
                <ol className="text-left space-y-1">
                  <li>1. Click the location icon in your address bar</li>
                  <li>2. Select "Allow" for location access</li>
                  <li>3. Refresh this page</li>
                </ol>
              </div>
            )}

            {canRequestLocation && (
              <button
                onClick={handleLocationRequest}
                className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Try Again
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