import { useState } from 'react'
import {
  FlagIcon,
  TrashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@/utils/cn'
import { useWalkHistoryStore } from '@/stores/useWalkHistoryStore'
import type { Location } from '@/types'

interface WalkHistoryLogProps {
  location: Location
  currentScore?: number
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'bg-emerald-900/40 text-emerald-400 border-emerald-700/50'
  if (score >= 6) return 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50'
  if (score >= 4) return 'bg-orange-900/40 text-orange-400 border-orange-700/50'
  return 'bg-red-900/40 text-red-400 border-red-700/50'
}

function getScoreLabel(score: number): string {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Challenging'
  return 'Dangerous'
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function WalkHistoryLog({ location, currentScore }: WalkHistoryLogProps) {
  const { entries, addEntry, removeEntry } = useWalkHistoryStore()
  const [formOpen, setFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  // All entries for this location, newest first
  const locationEntries = entries
    .filter((e) => e.locationId === location.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const recentEntries = locationEntries.slice(0, 5)
  const totalCount = locationEntries.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addEntry({
      locationId: location.id,
      locationName: location.name,
      area: location.area,
      date,
      score: currentScore ?? 0,
      notes: notes.trim() || undefined,
    })
    setFormOpen(false)
    setNotes('')
    setDate(todayISO())
    // Open history so user can see what they just logged
    setHistoryOpen(true)
  }

  return (
    <section className="fade-in-up">
      <h2 className="section-title flex items-center gap-2 mb-3">
        <FlagIconSolid className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        Walk History
      </h2>

      <div className="card space-y-4">
        {/* Summary line */}
        {totalCount > 0 && (
          <p className="text-sm text-slate-400">
            You&apos;ve hiked{' '}
            <span className="text-emerald-400 font-medium">{location.name}</span>{' '}
            <span className="font-medium text-slate-200">{totalCount}</span>{' '}
            {totalCount === 1 ? 'time' : 'times'}
          </p>
        )}

        {/* Mark as Completed button */}
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/30 border border-emerald-700/50 text-emerald-300 text-sm font-medium hover:bg-emerald-800/50 hover:border-emerald-600/60 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            <FlagIcon className="w-4 h-4" aria-hidden="true" />
            Mark as Completed
          </button>
        ) : (
          /* Inline log form */
          <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-100">Log this walk</h3>

            {/* Date picker */}
            <div>
              <label htmlFor="walk-date" className="block text-xs text-slate-400 mb-1">
                Date
              </label>
              <input
                id="walk-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600/60 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mono-nums"
              />
            </div>

            {/* Hiking score preview */}
            {currentScore !== undefined && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Conditions score:</span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full border text-xs font-medium',
                  getScoreColor(currentScore)
                )}>
                  {currentScore.toFixed(1)} — {getScoreLabel(currentScore)}
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="walk-notes" className="block text-xs text-slate-400 mb-1">
                Notes <span className="text-slate-600">(optional)</span>
              </label>
              <textarea
                id="walk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How were conditions? Any issues? Route taken..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600/60 text-slate-100 text-sm placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {notes.length > 400 && (
                <p className="text-xs text-slate-500 mt-0.5 text-right">{notes.length}/500</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
              >
                Save Walk
              </button>
              <button
                type="button"
                onClick={() => { setFormOpen(false); setNotes(''); setDate(todayISO()) }}
                className="px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Past walks for this location */}
        {recentEntries.length > 0 && (
          <div>
            <button
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              aria-expanded={historyOpen}
            >
              <ChevronDownIcon
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  historyOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
              {historyOpen ? 'Hide' : 'Show'} past walks ({recentEntries.length})
            </button>

            {historyOpen && (
              <ul className="mt-3 space-y-2 fade-in" role="list">
                {recentEntries.map((entry) => (
                  <li
                    key={`${entry.locationId}-${entry.date}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200 mono-nums">
                          {formatDate(entry.date)}
                        </span>
                        {entry.score > 0 && (
                          <span className={cn(
                            'px-2 py-0.5 rounded-full border text-xs font-medium',
                            getScoreColor(entry.score)
                          )}>
                            {entry.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.notes}</p>
                      )}
                    </div>

                    <button
                      onClick={() => removeEntry(entry.locationId, entry.date)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                      aria-label={`Remove walk entry for ${formatDate(entry.date)}`}
                    >
                      <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
