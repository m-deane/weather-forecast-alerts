import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ExclamationTriangleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useDataStalenessStore } from '@/stores/useDataStalenessStore'
import { scrapeApi } from '@/api/client'
import { cn } from '@/utils/cn'

type StalenessLevel = 'fresh' | 'stale' | 'very-stale'

interface StalenessInfo {
  level: StalenessLevel
  hoursOld: number
  formattedTime: string
}

function calculateStaleness(lastUpdated: string | null): StalenessInfo | null {
  if (!lastUpdated) return null

  const lastUpdatedDate = new Date(lastUpdated)
  if (isNaN(lastUpdatedDate.getTime())) return null

  const now = new Date()
  const diffMs = now.getTime() - lastUpdatedDate.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  let level: StalenessLevel = 'fresh'
  if (diffHours >= 8) {
    level = 'very-stale'
  } else if (diffHours >= 4) {
    level = 'stale'
  }

  const formattedTime = lastUpdatedDate.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    level,
    hoursOld: Math.round(diffHours * 10) / 10,
    formattedTime,
  }
}

function formatLastScraped(isoString: string | null): string | null {
  if (!isoString) return null
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  const diffHours = Math.round(diffMins / 60)
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
}

export function DataStalenessWarning() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const { lastUpdated, isDismissed, dismiss, resetDismiss } = useDataStalenessStore()
  const [scrapeState, setScrapeState] = useState<'idle' | 'running' | 'error'>('idle')
  const [lastScraped, setLastScraped] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset dismiss state when route changes
  useEffect(() => {
    resetDismiss()
  }, [location.pathname, resetDismiss])

  // Fetch initial scrape status on mount
  useEffect(() => {
    scrapeApi.getStatus().then((status) => {
      if (status.state === 'running') setScrapeState('running')
      if (status.last_run) setLastScraped(status.last_run)
    }).catch(() => { /* ignore fetch errors */ })
  }, [])

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const status = await scrapeApi.getStatus()
        if (status.last_run) setLastScraped(status.last_run)
        if (status.state === 'idle') {
          stopPolling()
          setScrapeState(status.last_error ? 'error' : 'idle')
          // Scrape finished - invalidate caches to fetch fresh data
          queryClient.invalidateQueries({ queryKey: ['weather'] })
          queryClient.invalidateQueries({ queryKey: ['locations'] })
        }
      } catch {
        stopPolling()
        setScrapeState('error')
      }
    }, 5000)
  }, [stopPolling, queryClient])

  const handleRefresh = async () => {
    if (scrapeState === 'running') return
    setScrapeState('running')
    try {
      const result = await scrapeApi.trigger()
      if (result.status === 'already_running' || result.status === 'started') {
        startPolling()
      } else {
        setScrapeState('idle')
      }
    } catch {
      setScrapeState('error')
      // Fallback: still invalidate queries
      queryClient.invalidateQueries({ queryKey: ['weather'] })
    }
  }

  const stalenessInfo = useMemo(() => calculateStaleness(lastUpdated), [lastUpdated])
  const lastScrapedDisplay = useMemo(() => formatLastScraped(lastScraped), [lastScraped])

  // Don't show if no data, fresh data, or dismissed
  if (!stalenessInfo || stalenessInfo.level === 'fresh' || isDismissed) {
    return null
  }

  const isVeryStale = stalenessInfo.level === 'very-stale'
  const isRefreshing = scrapeState === 'running'

  const bannerStyles = cn(
    'px-4 py-3 text-sm font-medium safe-top z-40 transition-colors',
    isVeryStale
      ? 'bg-red-600 text-white'
      : 'bg-yellow-500 text-white'
  )

  const iconStyles = cn(
    'w-5 h-5 flex-shrink-0',
    isVeryStale ? 'text-red-100' : 'text-yellow-100'
  )

  const buttonStyles = cn(
    'p-1 rounded-full transition-colors flex-shrink-0',
    isVeryStale
      ? 'hover:bg-red-500 text-red-100 hover:text-white'
      : 'hover:bg-yellow-400 text-yellow-100 hover:text-white'
  )

  const refreshButtonStyles = cn(
    'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0',
    isRefreshing ? 'opacity-70 cursor-wait' : '',
    isVeryStale
      ? 'bg-red-700 hover:bg-red-800 text-white'
      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
  )

  // Format hours for display
  const hoursDisplay = stalenessInfo.hoursOld >= 24
    ? `${Math.round(stalenessInfo.hoursOld / 24)} day${Math.round(stalenessInfo.hoursOld / 24) !== 1 ? 's' : ''}`
    : `${Math.round(stalenessInfo.hoursOld)} hour${Math.round(stalenessInfo.hoursOld) !== 1 ? 's' : ''}`

  return (
    <div className={bannerStyles} role="alert">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ExclamationTriangleIcon className={iconStyles} />
          <div className="flex-1 min-w-0">
            {isRefreshing ? (
              <span>Refreshing weather data...</span>
            ) : isVeryStale ? (
              <span>
                <strong>Warning:</strong> Weather data is {hoursDisplay} old and may be inaccurate.
                {' '}Last updated: {stalenessInfo.formattedTime}
                {lastScrapedDisplay && (
                  <span className="ml-2 opacity-80">| Last scraped: {lastScrapedDisplay}</span>
                )}
              </span>
            ) : (
              <span>
                Weather data is {hoursDisplay} old.
                {' '}Last updated: {stalenessInfo.formattedTime}
                {lastScrapedDisplay && (
                  <span className="ml-2 opacity-80">| Last scraped: {lastScrapedDisplay}</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className={refreshButtonStyles}
            aria-label={isRefreshing ? 'Refreshing weather data' : 'Refresh weather data'}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={dismiss}
            className={buttonStyles}
            aria-label="Dismiss warning"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
