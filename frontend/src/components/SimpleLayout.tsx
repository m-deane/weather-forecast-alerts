import { Outlet } from 'react-router-dom'

export function SimpleLayout() {
  console.log('[SIMPLE-LAYOUT] Component rendering...')
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Weather App</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}