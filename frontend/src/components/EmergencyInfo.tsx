import { useState } from 'react'
import {
  PhoneIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import emergencyData from '@/data/emergency_info.json'

interface EmergencyInfoProps {
  area: string
  locationName: string
}

interface AreaEmergencyInfo {
  mrt: string
  phone: string
  hospital: string
}

type EmergencyInfoData = Record<string, AreaEmergencyInfo>

const data = emergencyData as EmergencyInfoData

export function EmergencyInfo({ area, locationName }: EmergencyInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle')

  // Try exact match first, then a case-insensitive partial match
  const info: AreaEmergencyInfo | undefined =
    data[area] ??
    Object.entries(data).find(([key]) =>
      area.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(area.toLowerCase())
    )?.[1]

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const message = `My location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} — ${locationName}`

        if (navigator.share) {
          navigator
            .share({ title: 'My Location', text: message })
            .then(() => setShareStatus('shared'))
            .catch(() => {
              // User cancelled or share failed — fall back to clipboard
              copyToClipboard(message)
            })
        } else {
          copyToClipboard(message)
        }
      },
      () => {
        // Geolocation denied or unavailable — share the mountain coords as a fallback note
        const message = `Location: ${locationName} (GPS unavailable — share map link manually)`
        copyToClipboard(message)
      }
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setShareStatus('copied')
        setTimeout(() => setShareStatus('idle'), 3000)
      })
      .catch(() => {
        // Clipboard write failed silently
      })
  }

  return (
    <section className="fade-in-up">
      {/* Collapsed trigger */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-slate-800/60 border-l-4 border-l-red-600/70 border-t-slate-700/50 border-r-slate-700/50 border-b-slate-700/50',
          'hover:bg-slate-800 hover:border-l-red-500',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
        )}
        aria-expanded={isExpanded}
        aria-label="Toggle emergency information"
      >
        {/* Red cross icon */}
        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-700/30 border border-red-600/40">
          <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M7 1a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 0 1-2 0V8H2a1 1 0 0 1 0-2h5V1z" />
          </svg>
        </span>

        <span className="flex-1 text-left text-sm font-medium text-slate-200">
          Emergency Info
          {info && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {info.mrt}
            </span>
          )}
        </span>

        <ChevronDownIcon
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="mt-2 rounded-xl border border-l-4 border-l-red-600/70 border-t-slate-700/40 border-r-slate-700/40 border-b-slate-700/40 bg-slate-800/50 overflow-hidden fade-in-down">
          {/* "Always call 999" notice */}
          <div className="px-4 py-3 bg-red-900/20 border-b border-red-800/30">
            <p className="text-sm font-semibold text-red-300 flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              Always call 999 in an emergency
            </p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Request Police Scotland — they coordinate mountain rescue in Scotland
            </p>
          </div>

          <div className="px-4 py-4 space-y-3">
            {info ? (
              <>
                {/* MRT */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-700/50">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Mountain Rescue Team</p>
                    <p className="text-sm font-medium text-slate-100">{info.mrt}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-700/50">
                    <PhoneIcon className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Emergency Number</p>
                    <a
                      href={`tel:${info.phone.split(' ')[0]}`}
                      className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors mono-nums"
                    >
                      {info.phone}
                    </a>
                  </div>
                </div>

                {/* Hospital */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-700/50">
                    <BuildingOffice2Icon className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Nearest A&E</p>
                    <p className="text-sm font-medium text-slate-100">{info.hospital}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Emergency info not available for this area. Call 999 and request Mountain Rescue.
              </p>
            )}

            {/* Share location button */}
            <div className="pt-1 border-t border-slate-700/50">
              <button
                onClick={handleShareLocation}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  shareStatus === 'idle'
                    ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500/70'
                    : 'bg-emerald-800/40 text-emerald-300 border border-emerald-700/50'
                )}
              >
                <ShareIcon className="w-4 h-4" aria-hidden="true" />
                {shareStatus === 'copied'
                  ? 'Location copied to clipboard'
                  : shareStatus === 'shared'
                  ? 'Location shared'
                  : `Share My Location — ${locationName}`}
              </button>
              <p className="text-xs text-slate-600 text-center mt-1.5">
                Gets your GPS coordinates to share with rescue services
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
