import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { integrationsApi } from '@/api/client'
import type { MountainPhoto } from '@/types'
import { cn } from '@/utils/cn'

interface MountainPhotoGalleryProps {
  locationId: string
}

const seasonColors: Record<string, string> = {
  summer: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/50',
  winter: 'bg-sky-900/40 text-sky-400 border-sky-700/50',
  autumn: 'bg-amber-900/40 text-amber-400 border-amber-700/50',
  spring: 'bg-violet-900/40 text-violet-400 border-violet-700/50',
}

export function MountainPhotoGallery({ locationId }: MountainPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<MountainPhoto | null>(null)

  const { data: photos } = useQuery({
    queryKey: ['photos', locationId],
    queryFn: () => integrationsApi.getPhotos(locationId),
    enabled: !!locationId,
  })

  if (!photos || photos.length === 0) {
    return null
  }

  return (
    <>
      <section className="fade-in-up">
        <h2 className="section-title flex items-center gap-2 mb-3">
          <PhotoIcon className="w-5 h-5 text-emerald-400" />
          Mountain Photos
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedPhoto(photo)}
              className="flex-shrink-0 group relative rounded-xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <img
                src={photo.thumbnail_url}
                alt={photo.alt}
                className="w-48 h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2">
                <div className="flex items-center gap-1.5">
                  {photo.season && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded border',
                      seasonColors[photo.season] || 'bg-slate-700 text-slate-300 border-slate-600'
                    )}>
                      {photo.season}
                    </span>
                  )}
                  {photo.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Expanded photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
              aria-label="Close photo"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.alt}
              className="w-full max-h-[70vh] object-contain bg-slate-950"
            />
            <div className="p-4 space-y-2">
              <p className="text-sm text-slate-300">{selectedPhoto.alt}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedPhoto.season && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded border',
                    seasonColors[selectedPhoto.season] || 'bg-slate-700 text-slate-300 border-slate-600'
                  )}>
                    {selectedPhoto.season}
                  </span>
                )}
                {selectedPhoto.tags?.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
              {selectedPhoto.attribution && (
                <p className="text-xs text-slate-500">
                  Photo:{' '}
                  {selectedPhoto.attribution_url ? (
                    <a
                      href={selectedPhoto.attribution_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:text-emerald-400 underline"
                    >
                      {selectedPhoto.attribution}
                    </a>
                  ) : (
                    selectedPhoto.attribution
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
