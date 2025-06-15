import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Simple working app without complex dependencies
function App() {
  const [status, setStatus] = React.useState('Loading...')
  
  React.useEffect(() => {
    // Test API connection
    fetch('/api/v1/health')
      .then(() => setStatus('✅ API Connected!'))
      .catch(() => setStatus('❌ API Error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">
        🏔️ Scottish Mountain Weather
      </h1>
      <p className="mb-4">React Status: {status}</p>
      <a 
        href="/demo.html" 
        className="text-blue-600 underline hover:text-blue-800"
      >
        View Full Demo →
      </a>
    </div>
  )
}

// Mount the app
const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />)
  console.log('✅ React app mounted successfully!')
} else {
  console.error('❌ Root element not found!')
}