import { cn } from '@/utils/cn'

interface LoadingSkeletonProps {
  count?: number
  height?: number | string
  width?: number | string
  className?: string
  variant?: 'default' | 'text' | 'circular' | 'card' | 'weather-card'
}

export function LoadingSkeleton({
  count = 1,
  height = 20,
  width,
  className,
  variant = 'default'
}: LoadingSkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full'
      case 'text':
        return 'rounded'
      case 'card':
        return 'rounded-xl'
      case 'weather-card':
        return 'rounded-xl'
      default:
        return 'rounded'
    }
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'skeleton shimmer skeleton-wave',
            getVariantClasses(),
            className
          )}
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

// Weather card loading skeleton
export function WeatherCardSkeleton() {
  return (
    <div className="card p-4 space-y-3 fade-in" aria-busy="true" aria-label="Loading weather data">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="skeleton shimmer skeleton-wave h-6 w-32 rounded" />
          <div className="skeleton shimmer skeleton-wave h-4 w-24 rounded" />
        </div>
        <div className="skeleton shimmer skeleton-wave h-10 w-16 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 stagger-children">
        <div className="skeleton shimmer skeleton-wave h-12 rounded" />
        <div className="skeleton shimmer skeleton-wave h-12 rounded" />
        <div className="skeleton shimmer skeleton-wave h-12 rounded" />
      </div>
    </div>
  )
}

// Location card loading skeleton
export function LocationCardSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4" aria-busy="true" aria-label="Loading location">
      <div className="skeleton shimmer h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton shimmer h-5 w-3/4 rounded" />
        <div className="skeleton shimmer h-4 w-1/2 rounded" />
      </div>
      <div className="skeleton shimmer h-6 w-12 rounded-full" />
    </div>
  )
}

// Forecast day loading skeleton
export function ForecastDaySkeleton() {
  return (
    <div className="card p-3 space-y-2" aria-busy="true" aria-label="Loading forecast">
      <div className="flex justify-between items-center">
        <div className="skeleton shimmer h-5 w-16 rounded" />
        <div className="skeleton shimmer h-5 w-12 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton shimmer h-8 w-20 rounded" />
        <div className="skeleton shimmer h-8 w-16 rounded" />
      </div>
    </div>
  )
}

// Full page loading state
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen p-4 space-y-6 fade-in" aria-busy="true" aria-label="Loading page">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 fade-in-down">
        <div className="skeleton shimmer skeleton-wave h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton shimmer skeleton-wave h-6 w-48 rounded" />
          <div className="skeleton shimmer skeleton-wave h-4 w-32 rounded" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="skeleton shimmer skeleton-wave h-48 rounded-xl fade-in-up" style={{ animationDelay: '0.1s' }} />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {Array.from({ length: 6 }).map((_, i) => (
          <WeatherCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// Inline loading spinner
export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <svg
      className={cn('animate-spin text-emerald-500', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Loading overlay for components
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 fade-in-scale">
        <LoadingSpinner size="lg" />
        <span className="text-slate-300 text-sm font-medium pulse">{message}</span>
      </div>
    </div>
  )
}
