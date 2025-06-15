import React from 'react'

export function TestApp() {
  console.log('[TEST-APP] Rendering test app')
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test App is Working!</h1>
      <p>If you see this, React is working.</p>
      <button onClick={() => alert('Click works!')}>Test Click</button>
    </div>
  )
}