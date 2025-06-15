import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('test-minimal.tsx loaded')

function TestApp() {
  console.log('TestApp component rendering')
  
  React.useEffect(() => {
    console.log('TestApp mounted')
  }, [])
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: 'blue' }}>React Test - Minimal</h1>
      <p>If you see this, React is working!</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{ padding: '10px', marginTop: '10px' }}
      >
        Click Me
      </button>
    </div>
  )
}

const rootElement = document.getElementById('root')
console.log('Root element:', rootElement)

if (rootElement) {
  console.log('Creating React root...')
  const root = ReactDOM.createRoot(rootElement)
  console.log('Rendering TestApp...')
  root.render(<TestApp />)
  console.log('Render complete')
} else {
  console.error('Root element not found!')
}