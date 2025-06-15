import { createBrowserRouter } from 'react-router-dom'
import { SimpleLayout } from './components/SimpleLayout'
import { SimpleHome } from './pages/SimpleHome'
import { LocationPage } from './pages/LocationPage'
import { SearchPage } from './pages/SearchPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { SettingsPage } from './pages/SettingsPage'

// Simple error component
const ErrorPage = () => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
    <p>Something went wrong. Please try again.</p>
    <a href="/" className="text-blue-600 underline">Go Home</a>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SimpleLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <SimpleHome />,
      },
      {
        path: 'location/:locationId',
        element: <LocationPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'favorites',
        element: <FavoritesPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])