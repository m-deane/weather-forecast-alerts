import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { VideoCameraIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'

interface Webcam {
  name: string
  url: string
  source: string
  description?: string
}

interface MountainWebcamsProps {
  locationId: string
  className?: string
}

export function MountainWebcams({ locationId, className }: MountainWebcamsProps) {
  const { data: webcams, isLoading } = useQuery({
    queryKey: ['webcams', locationId],
    queryFn: async (): Promise<Webcam[]> => {
      try {
        const { data } = await apiClient.get(`/webcams/${locationId}`)
        return data?.webcams ?? data ?? []
      } catch {
        // If the endpoint doesn't exist or returns an error, return empty array
        return []
      }
    },
    retry: false, // Don't retry if webcam endpoint not available
    staleTime: 10 * 60 * 1000, // Webcam data valid for 10 minutes
  })

  // Don't render anything if loading, no data, or empty list
  if (isLoading || !webcams || webcams.length === 0) {
    return null
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Mountain webcams">
      <h3 className="section-title flex items-center gap-2 mb-3">
        <VideoCameraIcon className="w-5 h-5 text-emerald-500" aria-hidden="true" />
        Webcams
      </h3>
      <div className="space-y-2">
        {webcams.map((webcam, index) => (
          <a
            key={index}
            href={webcam.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
              'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40',
              'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600/50',
              'group'
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <VideoCameraIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {webcam.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {webcam.source}
                {webcam.description && ` \u2014 ${webcam.description}`}
              </p>
            </div>
            <ArrowTopRightOnSquareIcon
              className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors flex-shrink-0"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </section>
  )
}
