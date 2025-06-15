import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

console.log('[MINIMAL] Script loaded')

function MinimalApp() {
  console.log('[MINIMAL] MinimalApp component rendering')
  const [count, setCount] = useState(0)
  
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>React Minimal Test (No Router)</h1>
      <p>If you can see this, React is working!</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Count: {count}
      </button>
      <div style={{ marginTop: '20px' }}>
        <h2>Debug Info:</h2>
        <ul>
          <li>React Version: {React.version}</li>
          <li>Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
    </div>
  )
}

console.log('[MINIMAL] Creating root...')
const rootElement = document.getElementById('root')
if (rootElement) {
  console.log('[MINIMAL] Root element found:', rootElement)
  const root = ReactDOM.createRoot(rootElement)
  console.log('[MINIMAL] Rendering app...')
  root.render(<MinimalApp />)
  console.log('[MINIMAL] App rendered!')
} else {
  console.error('[MINIMAL] Root element not found!')
}