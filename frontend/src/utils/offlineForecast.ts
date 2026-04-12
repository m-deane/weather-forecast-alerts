const CACHE_KEY_PREFIX = 'forecast_cache_'
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000 // 12 hours

interface CachedForecast {
  data: unknown
  timestamp: number
  locationId: string
}

export function cacheForecast(locationId: string, data: unknown): void {
  const entry: CachedForecast = {
    data,
    timestamp: Date.now(),
    locationId,
  }
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + locationId, JSON.stringify(entry))
  } catch {
    // localStorage full -- clear oldest entries
    clearOldestCaches()
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + locationId, JSON.stringify(entry))
    } catch {
      /* still full, give up */
    }
  }
}

export function getCachedForecast(locationId: string): { data: unknown; ageMs: number } | null {
  const raw = localStorage.getItem(CACHE_KEY_PREFIX + locationId)
  if (!raw) return null
  try {
    const entry: CachedForecast = JSON.parse(raw)
    const ageMs = Date.now() - entry.timestamp
    if (ageMs > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + locationId)
      return null
    }
    return { data: entry.data, ageMs }
  } catch {
    return null
  }
}

export function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function clearOldestCaches(): void {
  const entries: { key: string; timestamp: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || '')
        entries.push({ key, timestamp: entry.timestamp || 0 })
      } catch {
        /* skip */
      }
    }
  }
  entries.sort((a, b) => a.timestamp - b.timestamp)
  // Remove oldest half
  const removeCount = Math.ceil(entries.length / 2)
  for (let i = 0; i < removeCount; i++) {
    localStorage.removeItem(entries[i].key)
  }
}
