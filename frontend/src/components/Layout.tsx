import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MobileNavigation } from '@/components/MobileNavigation'
import { DataStalenessWarning } from '@/components/DataStalenessWarning'
import { useOfflineStatus } from '@/utils/offlineCache'
import { setupApiInterceptor } from '@/utils/monitoring'
import { useAppStore } from '@/stores/useAppStore'
import { useEffect } from 'react'

export function Layout() {
  const { isOnline } = useOfflineStatus()
  const theme = useAppStore((state) => state.preferences.theme)

  // Apply theme class on <html> element
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mq.matches)
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches)
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  // Initialize monitoring
  useEffect(() => {
    setupApiInterceptor()
  }, [])

  // Scroll to top on forward navigation; preserve scroll on browser back/forward (POP)
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
    }
  }, [pathname, navigationType])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-200">
        {/* Skip to main content link for keyboard navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Subtle gradient overlay */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 pointer-events-none" />

        {/* Content wrapper */}
        <div className="relative">
          {/* Offline banner */}
          {!isOnline && (
            <div className="bg-warning-600 text-white px-4 py-2 text-center text-sm font-medium safe-top z-50">
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
                You're offline. Some features may be limited.
              </span>
            </div>
          )}

          {/* Data staleness warning - shows when weather data is old */}
          <DataStalenessWarning />

          {/* Mobile Navigation */}
          <MobileNavigation />

          {/* Main content - adjust for desktop sidebar */}
          <main id="main-content" className="lg:ml-64 pb-20 lg:pb-0" tabIndex={-1}>
            <ErrorBoundary fallback={
              <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-100 mb-2">
                    Unable to load page content
                  </h2>
                  <p className="text-slate-400 mb-6">
                    There was an error loading this page. Please try refreshing.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary"
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
      </div>
    </ErrorBoundary>
  )
}
