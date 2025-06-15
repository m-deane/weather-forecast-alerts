import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('[MAIN-SIMPLE] Starting simple app...')

function SimpleApp() {
  console.log('[SIMPLE-APP] Rendering simple app component')
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2563eb' }}>🏔️ Scottish Mountain Weather</h1>
      <p>Simple React app is working!</p>
      <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', marginTop: '20px' }}>
        <p><strong>Status:</strong> React is rendering correctly</p>
        <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  console.log('[MAIN-SIMPLE] Root element found, rendering...')
  
  root.render(<SimpleApp />)
  console.log('[MAIN-SIMPLE] App rendered successfully!')
} catch (error) {
  console.error('[MAIN-SIMPLE] Failed to render app:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Error Loading App</h1>
      <p>Error: ${String(error)}</p>
    </div>
  `
}