import React, { ReactNode } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { usePullToRefresh } from '@/hooks/useSwipeGesture'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void> | void
  className?: string
  disabled?: boolean
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const {
    elementRef,
    isPulling,
    isRefreshing,
    pullDistance,
    triggerDistance,
    maxPullDistance: _maxPullDistance
  } = usePullToRefresh(onRefresh)

  const pullProgress = Math.min(pullDistance / triggerDistance, 1)
  const canTrigger = pullDistance >= triggerDistance
  const showIndicator = isPulling || isRefreshing

  return (
    <div 
      ref={elementRef}
      className={cn('relative', className)}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10',
          showIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          transform: `translateY(${isPulling ? -60 + pullDistance * 0.5 : -60}px)`,
          height: '60px'
        }}
      >
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-200',
          canTrigger
            ? 'bg-emerald-500 text-white glow-breathe'
            : 'bg-slate-700 text-slate-300 border border-slate-600'
        )}>
          <ArrowPathIcon 
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              isRefreshing && 'animate-spin',
              canTrigger && !isRefreshing && 'rotate-180'
            )} 
          />
          <span className="text-sm font-medium">
            {isRefreshing ? 'Refreshing...' : 
             canTrigger ? 'Release to refresh' : 
             'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Progress indicator */}
      {isPulling && (
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 origin-left transition-transform duration-100 z-10 progress-bar-animate"
          style={{
            transform: `scaleX(${pullProgress})`,
            opacity: pullProgress
          }}
        />
      )}

      {/* Content */}
      <div className={cn(
        'transition-all duration-200',
        disabled && 'pointer-events-none opacity-50'
      )}>
        {children}
      </div>
    </div>
  )
}

// Hook for integrating pull-to-refresh with data fetching
export function useRefreshableData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchFunction()
      setData(result)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchFunction])

  // Initial load
  React.useEffect(() => {
    refresh()
  }, dependencies)

  return {
    data,
    isLoading,
    error,
    refresh,
    lastRefresh
  }
}