import React, { useState, useMemo } from 'react'
import {
  MapPinIcon,
  ArrowRightIcon,
  CloudIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import type { DailyForecast, WeatherPeriod } from '@/types'

interface WeatherMapsProps {
  forecasts: DailyForecast[]
  currentLocation: {
    name: string
    latitude: number
    longitude: number
    area: string
  }
}

interface WindData {
  speed: number
  direction: string
  directionDegrees: number
}

interface PrecipitationLevel {
  level: 'none' | 'light' | 'moderate' | 'heavy'
  amount: number
  color: string
}

export function WeatherMaps({ forecasts, currentLocation }: WeatherMapsProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState(0)
  const [mapType, setMapType] = useState<'wind' | 'precipitation' | 'visibility'>('wind')

  const currentForecast = forecasts[selectedDay]
  const currentPeriod = currentForecast?.periods[selectedPeriod]

  // Convert wind direction to degrees for arrow rotation
  const getWindDirectionDegrees = (direction: string): number => {
    const directions: Record<string, number> = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    }
    return directions[direction.toUpperCase()] || 0
  }

  // Get precipitation level and color
  const getPrecipitationLevel = (amount: number): PrecipitationLevel => {
    if (amount === 0) return { level: 'none', amount, color: '#f3f4f6' }
    if (amount <= 2) return { level: 'light', amount, color: '#dbeafe' }
    if (amount <= 10) return { level: 'moderate', amount, color: '#3b82f6' }
    return { level: 'heavy', amount, color: '#1e40af' }
  }

  // Get visibility color
  const getVisibilityColor = (visibility: number): string => {
    if (visibility >= 20000) return '#10b981' // Green - excellent
    if (visibility >= 10000) return '#f59e0b' // Yellow - good
    if (visibility >= 5000) return '#f97316'  // Orange - moderate
    return '#ef4444' // Red - poor
  }

  const mapData = useMemo(() => {
    if (!currentPeriod) return null

    return {
      wind: {
        speed: currentPeriod.wind_speed_kph,
        direction: currentPeriod.wind_direction,
        directionDegrees: getWindDirectionDegrees(currentPeriod.wind_direction)
      },
      precipitation: getPrecipitationLevel(currentPeriod.precipitation_mm),
      visibility: {
        distance: currentPeriod.visibility_m || 10000,
        color: getVisibilityColor(currentPeriod.visibility_m || 10000)
      }
    }
  }, [currentPeriod])

  const mapTypes = [
    { id: 'wind', title: 'Wind Patterns', icon: ArrowRightIcon },
    { id: 'precipitation', title: 'Precipitation', icon: CloudIcon },
    { id: 'visibility', title: 'Visibility', icon: EyeIcon }
  ] as const

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPinIcon className="w-6 h-6" />
            Weather Maps
          </h2>
          <div className="text-sm text-gray-500">
            {currentLocation.area} • {currentLocation.name}
          </div>
        </div>

        {/* Map type selector */}
        <div className="flex gap-2 mb-4">
          {mapTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setMapType(type.id as any)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  mapType === type.id
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{type.title}</span>
              </button>
            )
          })}
        </div>

        {/* Time selectors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Day:</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
            >
              {forecasts.map((forecast, index) => (
                <option key={forecast.date} value={index}>
                  {index === 0 ? 'Today' : new Date(forecast.date).toLocaleDateString('en-GB', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
            >
              {currentForecast?.periods.map((period, index) => (
                <option key={index} value={index}>
                  {period.period_type.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map display */}
        <div className="relative">
          {mapType === 'wind' && mapData && (
            <WindMap windData={mapData.wind} location={currentLocation} />
          )}
          {mapType === 'precipitation' && mapData && (
            <PrecipitationMap precipData={mapData.precipitation} location={currentLocation} />
          )}
          {mapType === 'visibility' && mapData && (
            <VisibilityMap visibilityData={mapData.visibility} location={currentLocation} />
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          {mapType === 'wind' && <WindLegend />}
          {mapType === 'precipitation' && <PrecipitationLegend />}
          {mapType === 'visibility' && <VisibilityLegend />}
        </div>
      </div>
    </div>
  )
}

function WindMap({ windData, location }: { windData: WindData; location: any }) {
  // Create a grid of wind arrows to simulate wind pattern
  const gridSize = 8
  const arrows = []

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i / (gridSize - 1)) * 100
      const y = (j / (gridSize - 1)) * 100
      
      // Add some variation to wind direction based on position
      const variation = (Math.sin(i * 0.5) + Math.cos(j * 0.3)) * 15
      const rotation = windData.directionDegrees + variation

      arrows.push(
        <div
          key={`${i}-${j}`}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <ArrowRightIcon 
            className={cn(
              'w-4 h-4 transition-all',
              windData.speed < 15 ? 'text-green-500' :
              windData.speed < 30 ? 'text-yellow-500' :
              windData.speed < 50 ? 'text-orange-500' : 'text-red-500'
            )} 
          />
        </div>
      )
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 h-64 overflow-hidden">
      {/* Topographic-style background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" viewBox="0 0 400 300">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Wind arrows */}
      {arrows}

      {/* Location marker */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="bg-red-500 rounded-full w-3 h-3 border-2 border-white shadow-lg"></div>
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow">
          {location.name}
        </div>
      </div>

      {/* Wind info */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow">
        <div className="text-sm font-medium">Wind</div>
        <div className="text-lg font-bold">{windData.speed} km/h</div>
        <div className="text-sm text-gray-600">{windData.direction}</div>
      </div>
    </div>
  )
}

function PrecipitationMap({ precipData, location }: { precipData: PrecipitationLevel; location: any }) {
  return (
    <div 
      className="relative rounded-lg p-6 h-64 overflow-hidden transition-colors"
      style={{ backgroundColor: precipData.color }}
    >
      {/* Precipitation pattern overlay */}
      {precipData.level !== 'none' && (
        <div className="absolute inset-0">
          <svg width="100%" height="100%" viewBox="0 0 400 300">
            {precipData.level === 'light' && (
              <>
                {[...Array(20)].map((_, i) => (
                  <circle
                    key={i}
                    cx={Math.random() * 400}
                    cy={Math.random() * 300}
                    r="2"
                    fill="white"
                    opacity="0.6"
                    className="animate-pulse"
                  />
                ))}
              </>
            )}
            {precipData.level === 'moderate' && (
              <>
                {[...Array(40)].map((_, i) => (
                  <line
                    key={i}
                    x1={Math.random() * 400}
                    y1={Math.random() * 300}
                    x2={Math.random() * 400}
                    y2={Math.random() * 300}
                    stroke="white"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                ))}
              </>
            )}
            {precipData.level === 'heavy' && (
              <>
                {[...Array(60)].map((_, i) => (
                  <line
                    key={i}
                    x1={Math.random() * 400}
                    y1={Math.random() * 300}
                    x2={Math.random() * 400 + 5}
                    y2={Math.random() * 300 + 8}
                    stroke="white"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                ))}
              </>
            )}
          </svg>
        </div>
      )}

      {/* Location marker */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="bg-red-500 rounded-full w-3 h-3 border-2 border-white shadow-lg"></div>
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow">
          {location.name}
        </div>
      </div>

      {/* Precipitation info */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow">
        <div className="text-sm font-medium">Precipitation</div>
        <div className="text-lg font-bold">{precipData.amount}mm</div>
        <div className="text-sm text-gray-600 capitalize">{precipData.level}</div>
      </div>
    </div>
  )
}

function VisibilityMap({ visibilityData, location }: { visibilityData: { distance: number; color: string }; location: any }) {
  const visibilityKm = Math.round(visibilityData.distance / 1000)
  
  return (
    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 h-64 overflow-hidden">
      {/* Visibility circles showing range */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {[1, 2, 3, 4].map(radius => (
          <div
            key={radius}
            className="absolute border-2 border-dashed opacity-30 rounded-full"
            style={{
              width: `${radius * 40}px`,
              height: `${radius * 40}px`,
              borderColor: visibilityData.color,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>

      {/* Visibility gradient overlay */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          background: `radial-gradient(circle at center, transparent 20%, ${visibilityData.color}20 60%, ${visibilityData.color}40 100%)`
        }}
      />

      {/* Location marker */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="bg-red-500 rounded-full w-3 h-3 border-2 border-white shadow-lg"></div>
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow">
          {location.name}
        </div>
      </div>

      {/* Visibility info */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow">
        <div className="text-sm font-medium">Visibility</div>
        <div className="text-lg font-bold">{visibilityKm}km</div>
        <div className="text-sm text-gray-600">
          {visibilityKm >= 20 ? 'Excellent' :
           visibilityKm >= 10 ? 'Good' :
           visibilityKm >= 5 ? 'Moderate' : 'Poor'}
        </div>
      </div>
    </div>
  )
}

function WindLegend() {
  return (
    <div>
      <h4 className="font-medium text-sm mb-2">Wind Speed (km/h)</h4>
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <ArrowRightIcon className="w-3 h-3 text-green-500" />
          <span>0-15 (Light)</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRightIcon className="w-3 h-3 text-yellow-500" />
          <span>15-30 (Moderate)</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRightIcon className="w-3 h-3 text-orange-500" />
          <span>30-50 (Strong)</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRightIcon className="w-3 h-3 text-red-500" />
          <span>50+ (Severe)</span>
        </div>
      </div>
    </div>
  )
}

function PrecipitationLegend() {
  return (
    <div>
      <h4 className="font-medium text-sm mb-2">Precipitation Levels</h4>
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span>None (0mm)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 rounded"></div>
          <span>Light (0-2mm)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400 rounded"></div>
          <span>Moderate (2-10mm)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-700 rounded"></div>
          <span>Heavy (10mm+)</span>
        </div>
      </div>
    </div>
  )
}

function VisibilityLegend() {
  return (
    <div>
      <h4 className="font-medium text-sm mb-2">Visibility Range</h4>
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Excellent (20km+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Good (10-20km)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Moderate (5-10km)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Poor (&lt;5km)</span>
        </div>
      </div>
    </div>
  )
}