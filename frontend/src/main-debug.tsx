import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('===== MAIN.TSX DEBUG START =====')
console.log('1. Script loaded')

// Simple test component
function TestApp() {
  console.log('3. TestApp component rendering')
  
  React.useEffect(() => {
    console.log('4. TestApp mounted')
  }, [])
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#e0e0e0', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e40af', fontSize: '2rem', marginBottom: '1rem' }}>
        React is Working! 🎉
      </h1>
      <p style={{ marginBottom: '1rem' }}>
        This is a temporary test component to verify React rendering.
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Debug Info:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ React loaded</li>
          <li>✅ Component rendered</li>
          <li>✅ Styles applied</li>
          <li>📍 Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
      <button 
        onClick={() => {
          console.log('Button clicked!')
          alert('Button works!')
        }}
        style={{ 
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  )
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  console.log('2a. DOM not ready, waiting...')
  document.addEventListener('DOMContentLoaded', mountApp)
} else {
  console.log('2b. DOM ready, mounting immediately')
  mountApp()
}

function mountApp() {
  console.log('===== MOUNTING APP =====')
  const rootElement = document.getElementById('root')
  console.log('Root element:', rootElement)
  console.log('Root element HTML:', rootElement?.outerHTML)
  
  if (!rootElement) {
    console.error('❌ Root element not found!')
    document.body.innerHTML = '<h1 style="color: red; padding: 20px;">Error: Root element with id="root" not found!</h1>'
    return
  }
  
  try {
    console.log('Creating React root...')
    const root = ReactDOM.createRoot(rootElement)
    
    console.log('Rendering app...')
    root.render(
      <React.StrictMode>
        <TestApp />
      </React.StrictMode>
    )
    
    console.log('✅ App rendered successfully!')
    console.log('===== MAIN.TSX DEBUG END =====')
  } catch (error) {
    console.error('❌ Error rendering app:', error)
    rootElement.innerHTML = `<h1 style="color: red;">Error rendering React: ${error.message}</h1>`
  }
}