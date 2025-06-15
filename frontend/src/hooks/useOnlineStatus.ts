import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const setOffline = useAppStore(state => state.setOffline)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])

  return isOnline
}