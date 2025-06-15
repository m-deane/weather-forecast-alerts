import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Import the full app directly
import { App } from './App'
const AppComponent = App
console.log('[MAIN] Using full App with all features')

// Add global error handlers
window.addEventListener('error', (e) => {
  console.error('[GLOBAL ERROR]', e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[UNHANDLED PROMISE]', e.reason)
})

console.log('[MAIN] Starting render process...')

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('[MAIN] No root element found!')
  document.body.innerHTML = '<h1 style="color: red;">Error: No root element found in HTML</h1>'
} else if (!AppComponent) {
  document.body.innerHTML = '<h1 style="color: red;">Error: No App component could be loaded. Check console.</h1>'
} else {
  console.log('[MAIN] Root element found, creating React root...')
  
  try {
    const root = ReactDOM.createRoot(rootElement)
    console.log('[MAIN] React root created successfully')
    
    console.log('[MAIN] Rendering component...')
    root.render(
      <React.StrictMode>
        <AppComponent />
      </React.StrictMode>
    )
    
    console.log('[MAIN] Component rendered successfully!')
  } catch (error) {
    console.error('[MAIN] Error during render:', error)
    console.error('[MAIN] Stack:', error.stack)
    
    // Show error on page
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace;">
        <h1 style="color: red;">Render Failed</h1>
        <pre style="background: #fee; padding: 10px; overflow: auto;">
Error: ${error.message}

Stack:
${error.stack}

Check browser console (F12) for more details.
        </pre>
      </div>
    `
  }
}