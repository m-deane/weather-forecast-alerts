import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MobileNavigation } from '@/components/MobileNavigation'
import { useOfflineStatus } from '@/utils/offlineCache'
import { setupApiInterceptor } from '@/utils/monitoring'
import { useEffect } from 'react'

export function Layout() {
  const { isOnline } = useOfflineStatus()

  // Initialize monitoring
  useEffect(() => {
    setupApiInterceptor()
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium safe-top z-50">
            You're offline. Some features may be limited.
          </div>
        )}

        {/* Mobile Navigation */}
        <MobileNavigation />

        {/* Main content - adjust for desktop sidebar */}
        <main className="lg:ml-64">
          <ErrorBoundary fallback={
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Unable to load page content
                </h2>
                <p className="text-gray-600 mb-4">
                  There was an error loading this page. Please try refreshing.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          }>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  )
}