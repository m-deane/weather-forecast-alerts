import { useState, useEffect } from 'react'

export function SimpleHome() {
  console.log('[SIMPLE-HOME] Component rendering...')
  
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load locations
    fetch('/api/v1/locations')
      .then(res => res.json())
      .then(data => {
        setLocations(data.locations || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleLocationSelect = async (locationId) => {
    setSelectedLocation(locationId)
    setWeatherData(null)
    
    try {
      const response = await fetch(`/api/v1/weather/${locationId}`)
      const data = await response.json()
      setWeatherData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Loading Scottish mountains...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">🏔️ Scottish Mountain Weather</h1>
        <p className="text-blue-100">
          Get accurate weather forecasts and hiking conditions for Scotland's most beautiful peaks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
          <div className="text-sm text-gray-500">Locations</div>
        </div>
        <div className="bg-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">6</div>
          <div className="text-sm text-gray-500">Day Forecast</div>
        </div>
        <div className="bg-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">3</div>
          <div className="text-sm text-gray-500">Daily Periods</div>
        </div>
        <div className="bg-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">10</div>
          <div className="text-sm text-gray-500">Risk Scale</div>
        </div>
      </div>

      {/* Mountain Locations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Mountain Locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                selectedLocation === location.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleLocationSelect(location.id)}
            >
              <h3 className="font-bold text-lg mb-1">{location.name}</h3>
              <p className="text-gray-600 mb-2">{location.area}</p>
              <div className="flex gap-2 text-sm">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {location.elevation_m}m
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {location.classification}
                </span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {location.difficulty || 'moderate'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Details */}
      {weatherData && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Weather Forecast for {weatherData.location.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weatherData.forecasts.slice(0, 6).map((day, index) => {
              const isToday = index === 0
              const isTomorrow = index === 1
              const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 
                new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })
              
              const riskColor = 
                day.summary.overall_hiking_score >= 8 ? 'text-green-600' :
                day.summary.overall_hiking_score >= 6 ? 'text-yellow-600' :
                day.summary.overall_hiking_score >= 4 ? 'text-orange-600' : 'text-red-600'

              return (
                <div key={day.date} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-bold mb-3">{dayName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Temperature:</span>
                      <span className="font-medium">
                        {day.summary.min_temp_c}°C - {day.summary.max_temp_c}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wind:</span>
                      <span className="font-medium">{day.summary.max_wind_speed_kph} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rain:</span>
                      <span className="font-medium">{day.summary.total_precipitation_mm}mm</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span>Hiking Score:</span>
                        <span className={`font-bold text-lg ${riskColor}`}>
                          {day.summary.overall_hiking_score}/10
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {day.summary.dominant_conditions}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on any mountain location above to see its 6-day weather forecast</li>
          <li>• Hiking scores range from 1 (dangerous) to 10 (perfect conditions)</li>
          <li>• Green scores (8-10) are ideal for hiking</li>
          <li>• Yellow scores (6-7) need some caution</li>
          <li>• Red scores (1-5) require experience or should be avoided</li>
        </ul>
      </div>
    </div>
  )
}