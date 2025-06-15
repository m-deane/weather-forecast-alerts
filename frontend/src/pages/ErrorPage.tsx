import { useRouteError, Link } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function ErrorPage() {
  const error = useRouteError() as Error

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <Link
          to="/"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  )
}