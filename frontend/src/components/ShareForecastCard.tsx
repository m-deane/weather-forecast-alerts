import { useState } from 'react'
import { ShareIcon, LinkIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import type { Location, DailyForecast } from '@/types'

interface ShareForecastCardProps {
  location: Location
  forecast: DailyForecast
}

function buildShareText(location: Location, forecast: DailyForecast): { title: string; text: string } {
  const date = new Date(forecast.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const score = forecast.summary.overall_hiking_score.toFixed(1)
  const wind = Math.round(forecast.summary.max_wind_speed_kph)
  const rain = forecast.summary.total_precipitation_mm.toFixed(1)

  // Derive a short condition label from dominant conditions or fallback
  const condition =
    typeof forecast.summary === 'object' && 'dominant_conditions' in forecast.summary
      ? String((forecast.summary as { dominant_conditions?: string }).dominant_conditions ?? 'mixed conditions')
      : 'mixed conditions'

  return {
    title: `${location.name} forecast — ${date}`,
    text: `Score ${score}/10 — ${condition}. Wind: ${wind}kph, Rain: ${rain}mm`,
  }
}

export function ShareForecastCard({ location, forecast }: ShareForecastCardProps) {
  const [status, setStatus] = useState<'idle' | 'shared' | 'copied' | 'link-copied'>('idle')

  async function handleShare() {
    const { title, text } = buildShareText(location, forecast)
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        setStatus('shared')
      } catch {
        // User cancelled or share failed — fall through silently
        return
      }
    } else {
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`)
        setStatus('copied')
      } catch {
        // Clipboard write failed
        return
      }
    }

    setTimeout(() => setStatus('idle'), 2000)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('link-copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      // Clipboard write failed
    }
  }

  const isActive = status === 'shared' || status === 'copied'
  const isLinkCopied = status === 'link-copied'
  const label = status === 'shared' ? 'Shared!' : status === 'copied' ? 'Copied!' : 'Share forecast'

  const btnBase = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900'
  const btnInactive = 'bg-white/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600/80 hover:bg-slate-100 dark:hover:bg-slate-700/60'
  const btnActive = 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500/60 dark:border-emerald-600/60 text-emerald-600 dark:text-emerald-400'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className={cn(btnBase, isActive ? btnActive : btnInactive)}
        aria-label={`Share ${location.name} forecast`}
      >
        {isActive ? (
          <CheckIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ShareIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className={cn(btnBase, isLinkCopied ? btnActive : btnInactive)}
        aria-label="Copy link to clipboard"
      >
        {isLinkCopied ? (
          <CheckIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        ) : (
          <LinkIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        )}
        <span>{isLinkCopied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  )
}
