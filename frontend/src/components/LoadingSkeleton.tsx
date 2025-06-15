import { cn } from '@/utils/cn'

interface LoadingSkeletonProps {
  count?: number
  height?: number | string
  className?: string
}

export function LoadingSkeleton({ count = 1, height = 20, className }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('skeleton', className)}
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      ))}
    </>
  )
}