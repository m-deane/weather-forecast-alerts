import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import {
  MagnifyingGlassIcon,
  HeartIcon,
  ClockIcon,
  MapPinIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  FolderOpenIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

type EmptyStateVariant =
  | 'no-results'
  | 'no-favorites'
  | 'no-recent'
  | 'no-locations'
  | 'no-alerts'
  | 'no-data'
  | 'offline'
  | 'error'
  | 'info'

interface EmptyStateProps {
  variant: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
  children?: ReactNode
}

const variantConfig: Record<EmptyStateVariant, {
  icon: typeof MagnifyingGlassIcon
  defaultTitle: string
  defaultDescription: string
  iconClassName: string
}> = {
  'no-results': {
    icon: MagnifyingGlassIcon,
    defaultTitle: 'No results found',
    defaultDescription: 'Try adjusting your search or filters to find what you\'re looking for.',
    iconClassName: 'text-slate-400'
  },
  'no-favorites': {
    icon: HeartIcon,
    defaultTitle: 'No favorites yet',
    defaultDescription: 'Save your favorite mountain locations for quick access.',
    iconClassName: 'text-red-400/70'
  },
  'no-recent': {
    icon: ClockIcon,
    defaultTitle: 'No recent activity',
    defaultDescription: 'Locations you view will appear here for easy access.',
    iconClassName: 'text-slate-400'
  },
  'no-locations': {
    icon: MapPinIcon,
    defaultTitle: 'No locations available',
    defaultDescription: 'Check back soon for mountain weather forecasts.',
    iconClassName: 'text-emerald-400/70'
  },
  'no-alerts': {
    icon: CloudIcon,
    defaultTitle: 'No active alerts',
    defaultDescription: 'All clear! No weather alerts for this location.',
    iconClassName: 'text-emerald-400'
  },
  'no-data': {
    icon: FolderOpenIcon,
    defaultTitle: 'No data available',
    defaultDescription: 'There\'s no data to display at the moment.',
    iconClassName: 'text-slate-400'
  },
  'offline': {
    icon: WifiIcon,
    defaultTitle: 'You\'re offline',
    defaultDescription: 'Connect to the internet to see the latest weather data.',
    iconClassName: 'text-amber-400'
  },
  'error': {
    icon: ExclamationTriangleIcon,
    defaultTitle: 'Something went wrong',
    defaultDescription: 'We couldn\'t load the data. Please try again.',
    iconClassName: 'text-red-400'
  },
  'info': {
    icon: InformationCircleIcon,
    defaultTitle: 'Information',
    defaultDescription: '',
    iconClassName: 'text-blue-400'
  }
}

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  children
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon
  const displayTitle = title || config.defaultTitle
  const displayDescription = description || config.defaultDescription

  const hasAction = actionLabel && (actionHref || onAction)

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6 fade-in-scale',
      className
    )}>
      {/* Icon */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
          <Icon className={cn('w-8 h-8', config.iconClassName)} />
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-full border border-slate-700/30 animate-pulse" style={{ transform: 'scale(1.2)' }} />
      </div>

      {/* Text content */}
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{displayTitle}</h3>
      {displayDescription && (
        <p className="text-sm text-slate-400 max-w-xs mb-4">{displayDescription}</p>
      )}

      {/* Custom content */}
      {children}

      {/* Action button */}
      {hasAction && (
        actionHref ? (
          <Link
            to={actionHref}
            className="btn btn-primary mt-2"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="btn btn-primary mt-2"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}

// Specialized empty states for common scenarios
export function NoSearchResults({ query, onReset }: { query?: string; onReset?: () => void }) {
  return (
    <EmptyState
      variant="no-results"
      title="No mountains found"
      description={query ? `No results for "${query}". Try a different search term.` : undefined}
      actionLabel={onReset ? "Clear search" : undefined}
      onAction={onReset}
    />
  )
}

export function NoFavorites() {
  return (
    <EmptyState
      variant="no-favorites"
      title="No favorites yet"
      description="Tap the heart icon on any location to add it to your favorites."
      actionLabel="Browse mountains"
      actionHref="/search"
    />
  )
}

export function NoRecentLocations() {
  return (
    <EmptyState
      variant="no-recent"
      title="No recent locations"
      description="Your recently viewed mountains will appear here."
      actionLabel="Explore mountains"
      actionHref="/search"
    />
  )
}

export function NoAlerts() {
  return (
    <EmptyState
      variant="no-alerts"
      title="All clear"
      description="No weather warnings or alerts are active for this location."
    >
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mt-2 px-3 py-1.5 bg-emerald-900/20 rounded-full border border-emerald-700/30">
        <CloudIcon className="w-4 h-4" />
        <span>Good conditions</span>
      </div>
    </EmptyState>
  )
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="offline"
      title="You're offline"
      description="Weather data requires an internet connection. Some cached data may still be available."
      actionLabel={onRetry ? "Retry" : undefined}
      onAction={onRetry}
    />
  )
}

export function DataLoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Failed to load data"
      description="We couldn't fetch the weather data. Please check your connection and try again."
      actionLabel="Try again"
      onAction={onRetry}
    />
  )
}
