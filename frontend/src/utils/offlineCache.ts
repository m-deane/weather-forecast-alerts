import { useState, useEffect } from 'react'
import type { DailyForecast } from '@/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface OfflineCacheConfig {
  maxAge: number // milliseconds
  maxEntries: number
}

class OfflineCache {
  private readonly dbName = 'weather-app-cache'
  private readonly dbVersion = 1
  private db: IDBDatabase | null = null
  private readonly config: OfflineCacheConfig

  constructor(config: OfflineCacheConfig = { maxAge: 2 * 60 * 60 * 1000, maxEntries: 50 }) {
    this.config = config
    this.initDB()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Forecast cache store
        if (!db.objectStoreNames.contains('forecasts')) {
          const forecastStore = db.createObjectStore('forecasts', { keyPath: 'id' })
          forecastStore.createIndex('locationId', 'locationId', { unique: false })
          forecastStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Location cache store
        if (!db.objectStoreNames.contains('locations')) {
          const locationStore = db.createObjectStore('locations', { keyPath: 'id' })
          locationStore.createIndex('area', 'area', { unique: false })
        }

        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private async waitForDB(): Promise<IDBDatabase> {
    while (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return this.db
  }

  // Generic cache methods
  async set<T>(storeName: string, key: string, data: T): Promise<void> {
    const db = await this.waitForDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.config.maxAge
    }

    return new Promise((resolve, reject) => {
      const request = store.put({ id: key, ...cacheEntry })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.waitForDB()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }

        // Check if entry has expired
        if (Date.now() > result.expiry) {
          this.delete(storeName, key)
          resolve(null)
          return
        }

        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.waitForDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Forecast-specific methods
  async cacheForecast(locationId: string, forecast: any): Promise<void> {
    const key = `forecast-${locationId}`
    await this.set('forecasts', key, forecast)
  }

  async getCachedForecast(locationId: string): Promise<any | null> {
    const key = `forecast-${locationId}`
    return await this.get('forecasts', key)
  }

  // Location-specific methods
  async cacheLocations(locations: any[]): Promise<void> {
    const db = await this.waitForDB()
    const transaction = db.transaction(['locations'], 'readwrite')
    const store = transaction.objectStore('locations')

    for (const location of locations) {
      const cacheEntry = {
        id: location.id,
        data: location,
        timestamp: Date.now(),
        expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours for locations
      }
      store.put(cacheEntry)
    }
  }

  async getCachedLocations(): Promise<any[] | null> {
    const db = await this.waitForDB()
    const transaction = db.transaction(['locations'], 'readonly')
    const store = transaction.objectStore('locations')

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const results = request.result
        if (!results || results.length === 0) {
          resolve(null)
          return
        }

        // Filter out expired entries
        const validEntries = results.filter(entry => Date.now() <= entry.expiry)
        if (validEntries.length === 0) {
          resolve(null)
          return
        }

        resolve(validEntries.map(entry => entry.data))
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Preferences methods
  async savePreferences(preferences: any): Promise<void> {
    await this.set('preferences', 'user-preferences', preferences)
  }

  async getPreferences(): Promise<any | null> {
    return await this.get('preferences', 'user-preferences')
  }

  // Offline queue methods
  async addToOfflineQueue(action: any): Promise<void> {
    const db = await this.waitForDB()
    const transaction = db.transaction(['offlineQueue'], 'readwrite')
    const store = transaction.objectStore('offlineQueue')

    const queueItem = {
      ...action,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getOfflineQueue(): Promise<any[]> {
    const db = await this.waitForDB()
    const transaction = db.transaction(['offlineQueue'], 'readonly')
    const store = transaction.objectStore('offlineQueue')

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async clearOfflineQueue(): Promise<void> {
    const db = await this.waitForDB()
    const transaction = db.transaction(['offlineQueue'], 'readwrite')
    const store = transaction.objectStore('offlineQueue')

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Cache management
  async cleanup(): Promise<void> {
    const db = await this.waitForDB()
    const stores = ['forecasts', 'locations', 'preferences']

    for (const storeName of stores) {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      // Get all entries and remove expired ones
      const request = store.getAll()
      request.onsuccess = () => {
        const entries = request.result
        entries.forEach(entry => {
          if (Date.now() > entry.expiry) {
            store.delete(entry.id)
          }
        })
      }
    }
  }

  async getCacheStats(): Promise<{
    forecastCount: number
    locationCount: number
    queueCount: number
    totalSize: number
  }> {
    const db = await this.waitForDB()
    
    const stats = {
      forecastCount: 0,
      locationCount: 0,
      queueCount: 0,
      totalSize: 0
    }

    // Count forecasts
    const forecastTx = db.transaction(['forecasts'], 'readonly')
    const forecastStore = forecastTx.objectStore('forecasts')
    const forecastCount = await new Promise<number>((resolve) => {
      const request = forecastStore.count()
      request.onsuccess = () => resolve(request.result)
    })
    stats.forecastCount = forecastCount

    // Count locations
    const locationTx = db.transaction(['locations'], 'readonly')
    const locationStore = locationTx.objectStore('locations')
    const locationCount = await new Promise<number>((resolve) => {
      const request = locationStore.count()
      request.onsuccess = () => resolve(request.result)
    })
    stats.locationCount = locationCount

    // Count queue items
    const queueTx = db.transaction(['offlineQueue'], 'readonly')
    const queueStore = queueTx.objectStore('offlineQueue')
    const queueCount = await new Promise<number>((resolve) => {
      const request = queueStore.count()
      request.onsuccess = () => resolve(request.result)
    })
    stats.queueCount = queueCount

    // Estimate total size (rough calculation)
    stats.totalSize = (forecastCount * 50 + locationCount * 5 + queueCount * 10) * 1024

    return stats
  }
}

// Singleton instance
export const offlineCache = new OfflineCache()

// Network status utilities
export class NetworkStatus {
  private static listeners: Set<(isOnline: boolean) => void> = new Set()
  private static isOnline = navigator.onLine

  static {
    window.addEventListener('online', () => {
      NetworkStatus.isOnline = true
      NetworkStatus.notifyListeners()
    })

    window.addEventListener('offline', () => {
      NetworkStatus.isOnline = false
      NetworkStatus.notifyListeners()
    })
  }

  static getStatus(): boolean {
    return NetworkStatus.isOnline
  }

  static addListener(callback: (isOnline: boolean) => void): () => void {
    NetworkStatus.listeners.add(callback)
    return () => NetworkStatus.listeners.delete(callback)
  }

  private static notifyListeners(): void {
    NetworkStatus.listeners.forEach(callback => callback(NetworkStatus.isOnline))
  }
}

// Background sync utility
export class BackgroundSync {
  static async processOfflineQueue(): Promise<void> {
    if (!NetworkStatus.getStatus()) return

    const queue = await offlineCache.getOfflineQueue()
    
    for (const item of queue) {
      try {
        // Process queued actions (favorites, settings changes, etc.)
        await this.processQueueItem(item)
      } catch (error) {
        console.error('Failed to process queue item:', error)
        // Could implement retry logic here
      }
    }

    await offlineCache.clearOfflineQueue()
  }

  private static async processQueueItem(item: any): Promise<void> {
    switch (item.type) {
      case 'ADD_FAVORITE':
        // Implementation would depend on your API
        console.log('Processing add favorite:', item.data)
        break
      case 'REMOVE_FAVORITE':
        console.log('Processing remove favorite:', item.data)
        break
      case 'UPDATE_PREFERENCES':
        console.log('Processing preferences update:', item.data)
        break
      default:
        console.warn('Unknown queue item type:', item.type)
    }
  }
}

// React hook for offline functionality
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(NetworkStatus.getStatus())

  useEffect(() => {
    return NetworkStatus.addListener(setIsOnline)
  }, [])

  return { isOnline }
}