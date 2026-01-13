import { useRouteError, Link, useNavigate } from 'react-router-dom'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface RouteError {
  status?: number
  statusText?: string
  message?: string
  data?: string
}

export function ErrorPage() {
  const error = useRouteError() as RouteError
  const navigate = useNavigate()

  // Determine error type and message
  const is404 = error?.status === 404
  const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                         error?.message?.toLowerCase().includes('fetch')

  const getErrorContent = () => {
    if (is404) {
      return {
        title: 'Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist or has been moved.',
        icon: (
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-500">404</span>
          </div>
        )
      }
    }

    if (isNetworkError) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection.',
        icon: (
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
        )
      }
    }

    return {
      title: 'Something went wrong',
      message: error?.message || error?.data || 'An unexpected error occurred while loading this page.',
      icon: (
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-danger-900/30 flex items-center justify-center">
          <ExclamationTriangleIcon className="w-10 h-10 text-danger-400" />
        </div>
      )
    }
  }

  const content = getErrorContent()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-900">
      <div className="text-center max-w-md fade-in-scale">
        <div className="shake" style={{ animationIterationCount: 1 }}>
          {content.icon}
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-3 fade-in-up" style={{ animationDelay: '0.2s' }}>
          {content.title}
        </h1>

        <p className="text-slate-400 mb-8 fade-in-up" style={{ animationDelay: '0.3s' }}>
          {content.message}
        </p>

        {/* Recovery options */}
        <div className="space-y-3 stagger-children">
          {/* Primary action - Try again */}
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary w-full flex items-center justify-center gap-2 ripple hover-scale"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Try Again
          </button>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1 flex items-center justify-center gap-2 hover-scale"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Go Back
            </button>

            <Link
              to="/"
              className="btn btn-secondary flex-1 flex items-center justify-center gap-2 hover-scale"
            >
              <HomeIcon className="w-4 h-4" />
              Home
            </Link>
          </div>

          {/* Search option for 404 */}
          {is404 && (
            <Link
              to="/search"
              className="btn btn-ghost w-full flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search for a mountain
            </Link>
          )}
        </div>

        {/* Technical details for developers */}
        {error?.status && (
          <p className="mt-8 text-xs text-slate-600">
            Error {error.status}{error.statusText && `: ${error.statusText}`}
          </p>
        )}
      </div>
    </div>
  )
}