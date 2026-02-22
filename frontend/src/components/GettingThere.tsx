import { useQuery } from '@tanstack/react-query'
import { TruckIcon } from '@heroicons/react/24/outline'
import { integrationsApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import type { WalkHighlandsRoute } from '@/types'

interface GettingThereProps {
  locationId: string
}

function buildGoogleMapsUrl(lat: number, lon: number, homeAddress?: string): string {
  const base = 'https://www.google.com/maps/dir/?api=1'
  const destination = `${lat},${lon}`
  const origin = homeAddress ? `&origin=${encodeURIComponent(homeAddress)}` : ''
  return `${base}&destination=${destination}${origin}`
}

function buildAppleMapsUrl(lat: number, lon: number, homeAddress?: string): string {
  const destination = `daddr=${lat},${lon}`
  const origin = homeAddress ? `&saddr=${encodeURIComponent(homeAddress)}` : ''
  return `https://maps.apple.com/?${destination}${origin}`
}

function buildWazeUrl(lat: number, lon: number): string {
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
}

export function GettingThere({ locationId }: GettingThereProps) {
  const { preferences } = useAppStore()
  const homeAddress = preferences.homeAddress

  const { data: routes } = useQuery({
    queryKey: ['routes', locationId],
    queryFn: () => integrationsApi.getRoutes(locationId),
    enabled: !!locationId,
  })

  // Get first route's parking info
  const parking = routes?.[0]?.parking
  if (!parking) {
    return null
  }

  return (
    <section className="fade-in-up">
      <h2 className="section-title flex items-center gap-2 mb-3">
        <TruckIcon className="w-5 h-5 text-emerald-400" />
        Getting There
      </h2>
      <div className="card">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-100">{parking.name}</h3>
          {parking.postcode && (
            <p className="text-xs text-slate-400 mt-0.5 mono-nums">{parking.postcode}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <a
            href={buildGoogleMapsUrl(parking.latitude, parking.longitude, homeAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all text-center"
          >
            <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-xs font-medium text-slate-300">Google Maps</span>
          </a>

          <a
            href={buildAppleMapsUrl(parking.latitude, parking.longitude, homeAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all text-center"
          >
            <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-xs font-medium text-slate-300">Apple Maps</span>
          </a>

          <a
            href={buildWazeUrl(parking.latitude, parking.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all text-center"
          >
            <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-xs font-medium text-slate-300">Waze</span>
          </a>
        </div>

        {!homeAddress && (
          <p className="text-xs text-slate-500 mt-3 text-center">
            Set your home address in{' '}
            <a href="/settings" className="text-emerald-500 hover:text-emerald-400">
              Settings
            </a>{' '}
            for door-to-door directions
          </p>
        )}
      </div>
    </section>
  )
}
