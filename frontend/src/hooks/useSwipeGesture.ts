import { useEffect, useRef, useState } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventScroll?: boolean
}

interface TouchPosition {
  x: number
  y: number
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false
  } = options

  const elementRef = useRef<HTMLElement>(null)
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null)
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)

  const minSwipeDistance = threshold

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
    setIsSwiping(true)

    if (preventScroll) {
      e.preventDefault()
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!touchStart) return

    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })

    if (preventScroll) {
      e.preventDefault()
    }
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false)
      return
    }

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const absDistanceX = Math.abs(distanceX)
    const absDistanceY = Math.abs(distanceY)

    // Determine if swipe is primarily horizontal or vertical
    const isHorizontal = absDistanceX > absDistanceY

    if (isHorizontal && absDistanceX > minSwipeDistance) {
      if (distanceX > 0) {
        onSwipeLeft?.()
      } else {
        onSwipeRight?.()
      }
    } else if (!isHorizontal && absDistanceY > minSwipeDistance) {
      if (distanceY > 0) {
        onSwipeUp?.()
      } else {
        onSwipeDown?.()
      }
    }

    setIsSwiping(false)
    setTouchStart(null)
    setTouchEnd(null)
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart, { passive: !preventScroll })
    element.addEventListener('touchmove', onTouchMove, { passive: !preventScroll })
    element.addEventListener('touchend', onTouchEnd)

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [touchStart, touchEnd, preventScroll])

  return {
    elementRef,
    isSwiping,
    touchStart,
    touchEnd
  }
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const elementRef = useRef<HTMLElement>(null)
  const startY = useRef<number>(0)
  const maxPullDistance = 80
  const triggerDistance = 60

  const onTouchStart = (e: TouchEvent) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!isPulling || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0) {
      e.preventDefault()
      const distance = Math.min(diff, maxPullDistance)
      setPullDistance(distance)
    }
  }

  const onTouchEnd = async () => {
    if (!isPulling || isRefreshing) return

    setIsPulling(false)

    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart, { passive: false })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd)

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [isPulling, isRefreshing, pullDistance])

  return {
    elementRef,
    isPulling,
    isRefreshing,
    pullDistance,
    triggerDistance,
    maxPullDistance
  }
}

// Hook for touch-optimized drag and drop
export function useTouchDrag() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 })
  const elementRef = useRef<HTMLElement>(null)

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    setStartPosition({ x: touch.clientX, y: touch.clientY })
    setIsDragging(true)
    e.preventDefault()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    setDragOffset({
      x: touch.clientX - startPosition.x,
      y: touch.clientY - startPosition.y
    })
    e.preventDefault()
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart, { passive: false })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd)

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging, startPosition])

  return {
    elementRef,
    isDragging,
    dragOffset,
    startPosition
  }
}