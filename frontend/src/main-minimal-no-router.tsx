import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('[MINIMAL] Script loaded')

function App() {
  const [count, setCount] = React.useState(0)
  
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
        React Minimal Test (No Router)
      </h1>
      
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '10px' }}>
          This test bypasses all routing, state management, and complex dependencies.
        </p>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Counter: {count}
        </p>
        <button 
          onClick={() => setCount(c => c + 1)}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Increment
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#dbeafe', 
        padding: '15px', 
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>If you can see this and the button works:</strong>
        <ul style={{ margin: '10px 0 0 20px' }}>
          <li>✅ React is loading correctly</li>
          <li>✅ Components are rendering</li>
          <li>✅ State management works</li>
          <li>✅ Event handlers work</li>
        </ul>
      </div>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  console.log('[MINIMAL] Rendering app...')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('[MINIMAL] App rendered!')
} else {
  console.error('[MINIMAL] No root element found!')
}