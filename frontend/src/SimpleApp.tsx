import React from 'react'
import { useState, useEffect } from 'react'
import './index.css'

function SimpleWeatherApp() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch locations from our API
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">🏔️ Scottish Mountain Weather</h1>
        <p className="text-blue-100">Accurate forecasts for safe adventures</p>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Mountain Locations</h2>
          
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading locations...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              Error: {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location: any) => (
                <div key={location.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-semibold text-lg">{location.name}</h3>
                  <p className="text-gray-600">{location.area}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                      {location.elevation_m}m
                    </span>
                    <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {location.classification}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {locations.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-8">No locations found</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default SimpleWeatherApp