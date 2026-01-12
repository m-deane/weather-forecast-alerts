import { create } from 'zustand'

interface DataStalenessState {
  // Last updated timestamp from weather API
  lastUpdated: string | null
  setLastUpdated: (timestamp: string | null) => void

  // Dismiss state - resets on navigation
  isDismissed: boolean
  dismiss: () => void
  resetDismiss: () => void
}

export const useDataStalenessStore = create<DataStalenessState>()((set) => ({
  lastUpdated: null,
  setLastUpdated: (timestamp) => set({ lastUpdated: timestamp }),

  isDismissed: false,
  dismiss: () => set({ isDismissed: true }),
  resetDismiss: () => set({ isDismissed: false }),
}))
