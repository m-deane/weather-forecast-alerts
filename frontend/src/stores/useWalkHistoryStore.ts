import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WalkEntry {
  locationId: string
  locationName: string
  area: string
  date: string // ISO date string
  score: number // hiking score on that day
  notes?: string // optional free text
}

interface WalkHistoryStore {
  entries: WalkEntry[]
  addEntry: (entry: WalkEntry) => void
  removeEntry: (locationId: string, date: string) => void
}

const MAX_ENTRIES = 50

export const useWalkHistoryStore = create<WalkHistoryStore>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => {
          // Remove any existing entry for the same location+date to avoid duplicates
          const filtered = state.entries.filter(
            (e) => !(e.locationId === entry.locationId && e.date === entry.date)
          )
          const next = [entry, ...filtered]
          // Cap at MAX_ENTRIES — oldest are at the end after prepend
          return { entries: next.slice(0, MAX_ENTRIES) }
        }),

      removeEntry: (locationId, date) =>
        set((state) => ({
          entries: state.entries.filter(
            (e) => !(e.locationId === locationId && e.date === date)
          ),
        })),
    }),
    {
      name: 'mountain-walk-history',
    }
  )
)
