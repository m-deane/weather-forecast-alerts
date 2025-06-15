import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LocationPage } from './pages/LocationPage'
import { SearchPage } from './pages/SearchPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient()

export function App() {
  console.log('[APP] App component rendering')
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="location/:locationId" element={<LocationPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    )
  } catch (error) {
    console.error('[APP] Error rendering:', error)
    return <div style={{ color: 'red', padding: '20px' }}>App Error: {String(error)}</div>
  }
}