import { useState } from 'react'
import { ShareIcon } from '@heroicons/react/24/outline'
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
  const [status, setStatus] = useState<'idle' | 'shared' | 'copied'>('idle')

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

  const isActive = status !== 'idle'
  const label = status === 'shared' ? 'Shared!' : status === 'copied' ? 'Copied!' : 'Share forecast'

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        'border focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        isActive
          ? 'bg-emerald-900/40 border-emerald-600/60 text-emerald-400'
          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-slate-100 hover:border-slate-600/80 hover:bg-slate-700/60'
      )}
      aria-label={`Share ${location.name} forecast`}
    >
      {isActive ? (
        <CheckIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      ) : (
        <ShareIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  )
}
