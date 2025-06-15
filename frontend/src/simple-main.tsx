import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleWeatherApp from './SimpleApp'

console.log('[SIMPLE] Starting simple app...')

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <SimpleWeatherApp />
  </React.StrictMode>
)

console.log('[SIMPLE] App rendered!')