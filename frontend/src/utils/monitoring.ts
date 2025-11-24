import { useState, useEffect } from 'react'

interface PerformanceMetrics {
  id: string
  timestamp: number
  url: string
  userAgent: string
  metrics: {
    // Navigation timing
    navigationStart: number
    domContentLoaded: number
    loadComplete: number
    firstPaint?: number
    firstContentfulPaint?: number
    largestContentfulPaint?: number
    
    // Core Web Vitals
    cumulativeLayoutShift?: number
    firstInputDelay?: number
    
    // Custom metrics
    timeToInteractive?: number
    apiResponseTimes: Array<{
      endpoint: string
      duration: number
      timestamp: number
      status: number
    }>
    
    // Memory usage
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
    
    // Network information
    connectionType?: string
    effectiveType?: string
    downlink?: number
    rtt?: number
  }
}

interface ErrorMetrics {
  id: string
  timestamp: number
  type: 'javascript' | 'network' | 'resource' | 'unhandledrejection'
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  url: string
  userAgent: string
}

interface UserMetrics {
  sessionId: string
  userId?: string
  timestamp: number
  events: Array<{
    type: 'page_view' | 'click' | 'search' | 'forecast_view' | 'export' | 'offline' | 'scroll'
    target?: string
    metadata?: Record<string, any>
    timestamp: number
  }>
}

class MonitoringService {
  private sessionId: string
  private performanceEntries: PerformanceMetrics[] = []
  private errorEntries: ErrorMetrics[] = []
  private userEvents: UserMetrics['events'] = []
  private apiResponseTimes: PerformanceMetrics['metrics']['apiResponseTimes'] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeMonitoring()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMonitoring() {
    // Performance monitoring
    this.collectNavigationTiming()
    this.collectWebVitals()
    this.setupResourceObserver()
    
    // Error monitoring
    this.setupErrorListeners()
    
    // User interaction tracking
    this.setupUserEventTracking()
    
    // Periodic data collection
    this.setupPeriodicCollection()
  }

  private collectNavigationTiming() {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing
      const navigation = performance.navigation

      const metrics: PerformanceMetrics = {
        id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metrics: {
          navigationStart: timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          apiResponseTimes: [],
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit,
          connectionType: (navigator as any).connection?.type,
          effectiveType: (navigator as any).connection?.effectiveType,
          downlink: (navigator as any).connection?.downlink,
          rtt: (navigator as any).connection?.rtt
        }
      }

      this.performanceEntries.push(metrics)
      this.storeMetrics('performance', metrics)
    }
  }

  private collectWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.updatePerformanceMetric('firstContentfulPaint', entry.startTime)
        }
      }
    }).observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.updatePerformanceMetric('largestContentfulPaint', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let cumulativeScore = 0
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeScore += (entry as any).value
        }
      }
      this.updatePerformanceMetric('cumulativeLayoutShift', cumulativeScore)
    }).observe({ entryTypes: ['layout-shift'] })

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.updatePerformanceMetric('firstInputDelay', (entry as any).processingStart - entry.startTime)
      }
    }).observe({ entryTypes: ['first-input'] })
  }

  private setupResourceObserver() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming
        
        // Track API response times
        if (resourceEntry.name.includes('/api/')) {
          const apiMetric = {
            endpoint: resourceEntry.name,
            duration: resourceEntry.responseEnd - resourceEntry.requestStart,
            timestamp: Date.now(),
            status: 200 // Would need to be captured from fetch interceptor
          }
          
          this.apiResponseTimes.push(apiMetric)
          this.updatePerformanceMetric('apiResponseTimes', this.apiResponseTimes)
        }
      }
    }).observe({ entryTypes: ['resource'] })
  }

  private setupErrorListeners() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      const errorMetric: ErrorMetrics = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'javascript',
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent
      }

      this.errorEntries.push(errorMetric)
      this.storeMetrics('errors', errorMetric)
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorMetric: ErrorMetrics = {
        id: `rejection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'unhandledrejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent
      }

      this.errorEntries.push(errorMetric)
      this.storeMetrics('errors', errorMetric)
    })
  }

  private setupUserEventTracking() {
    // Page view tracking
    this.trackEvent('page_view', window.location.pathname)

    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const className = target.className
      const id = target.id
      
      this.trackEvent('click', `${tagName}${id ? `#${id}` : ''}${className ? `.${className}` : ''}`)
    })

    // Scroll tracking (throttled)
    let scrollTimeout: number
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        )
        if (scrollPercent % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackEvent('scroll', `${scrollPercent}%`)
        }
      }, 250)
    })
  }

  private setupPeriodicCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMemoryMetrics()
      this.sendMetricsToServer()
    }, 30000)

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetricsToServer(true)
    })
  }

  private collectMemoryMetrics() {
    if ((performance as any).memory) {
      const memory = (performance as any).memory
      this.updatePerformanceMetric('usedJSHeapSize', memory.usedJSHeapSize)
      this.updatePerformanceMetric('totalJSHeapSize', memory.totalJSHeapSize)
      this.updatePerformanceMetric('jsHeapSizeLimit', memory.jsHeapSizeLimit)
    }
  }

  private updatePerformanceMetric(key: keyof PerformanceMetrics['metrics'], value: any) {
    // Update the latest performance entry
    if (this.performanceEntries.length > 0) {
      const latest = this.performanceEntries[this.performanceEntries.length - 1]
      ;(latest.metrics[key] as any) = value
      this.storeMetrics('performance', latest)
    }
  }

  public trackEvent(type: UserMetrics['events'][0]['type'], target?: string, metadata?: Record<string, any>) {
    const event = {
      type,
      target,
      metadata,
      timestamp: Date.now()
    }

    this.userEvents.push(event)
    
    // Keep only last 100 events
    if (this.userEvents.length > 100) {
      this.userEvents = this.userEvents.slice(-100)
    }

    this.storeMetrics('user_events', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events: this.userEvents
    })
  }

  public trackApiCall(endpoint: string, duration: number, status: number) {
    const apiMetric = {
      endpoint,
      duration,
      timestamp: Date.now(),
      status
    }

    this.apiResponseTimes.push(apiMetric)
    this.updatePerformanceMetric('apiResponseTimes', this.apiResponseTimes)
  }

  private storeMetrics(type: string, data: any) {
    try {
      const key = `metrics_${type}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push(data)
      
      // Keep only last 50 entries
      if (existing.length > 50) {
        existing.splice(0, existing.length - 50)
      }
      
      localStorage.setItem(key, JSON.stringify(existing))
    } catch (error) {
      console.error('Failed to store metrics:', error)
    }
  }

  private sendMetricsToServer(isBeforeUnload = false) {
    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      performance: this.performanceEntries,
      errors: this.errorEntries,
      userEvents: this.userEvents,
      url: window.location.href
    }

    // In production, this would send to your analytics/monitoring service
    if (import.meta.env.DEV) {
      console.log('📊 Metrics Payload:', payload)
    }

    // Use sendBeacon for reliable delivery on page unload
    if (isBeforeUnload && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon('/api/metrics', blob)
    } else {
      // Regular fetch for periodic updates
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(error => {
        console.error('Failed to send metrics:', error)
      })
    }
  }

  public getMetricsSummary() {
    const latest = this.performanceEntries[this.performanceEntries.length - 1]
    if (!latest) return null

    return {
      sessionId: this.sessionId,
      loadTime: latest.metrics.loadComplete,
      domContentLoaded: latest.metrics.domContentLoaded,
      firstContentfulPaint: latest.metrics.firstContentfulPaint,
      largestContentfulPaint: latest.metrics.largestContentfulPaint,
      cumulativeLayoutShift: latest.metrics.cumulativeLayoutShift,
      firstInputDelay: latest.metrics.firstInputDelay,
      memoryUsage: latest.metrics.usedJSHeapSize,
      errorCount: this.errorEntries.length,
      apiCallCount: this.apiResponseTimes.length,
      avgApiResponseTime: this.apiResponseTimes.length > 0 
        ? this.apiResponseTimes.reduce((sum, call) => sum + call.duration, 0) / this.apiResponseTimes.length 
        : 0
    }
  }
}

// Singleton instance
export const monitoring = new MonitoringService()

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState(monitoring.getMetricsSummary())

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitoring.getMetricsSummary())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    metrics,
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackApiCall: monitoring.trackApiCall.bind(monitoring)
  }
}

// API interceptor for automatic response time tracking
export function setupApiInterceptor() {
  // Intercept fetch requests
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const startTime = performance.now()
    const url = args[0] as string

    try {
      const response = await originalFetch(...args)
      const duration = performance.now() - startTime
      
      monitoring.trackApiCall(url, duration, response.status)
      
      return response
    } catch (error) {
      const duration = performance.now() - startTime
      monitoring.trackApiCall(url, duration, 0)
      throw error
    }
  }
}

// Health check utilities
export class HealthCheck {
  static async runHealthChecks(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy'
    checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warn'
      duration: number
      message?: string
    }>
  }> {
    const checks = []
    let healthyCount = 0

    // API health check
    const apiCheck = await this.checkApiHealth()
    checks.push(apiCheck)
    if (apiCheck.status === 'pass') healthyCount++

    // Local storage check
    const storageCheck = this.checkLocalStorage()
    checks.push(storageCheck)
    if (storageCheck.status === 'pass') healthyCount++

    // Network connectivity check
    const networkCheck = this.checkNetworkConnectivity()
    checks.push(networkCheck)
    if (networkCheck.status === 'pass') healthyCount++

    // Performance check
    const performanceCheck = this.checkPerformance()
    checks.push(performanceCheck)
    if (performanceCheck.status === 'pass') healthyCount++

    const overall = healthyCount === checks.length ? 'healthy' : 
                   healthyCount >= checks.length / 2 ? 'degraded' : 'unhealthy'

    return { overall, checks }
  }

  private static async checkApiHealth() {
    const startTime = performance.now()
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      })
      const duration = performance.now() - startTime
      
      if (response.ok) {
        return {
          name: 'API Health',
          status: 'pass' as const,
          duration,
          message: `API responding in ${duration.toFixed(0)}ms`
        }
      } else {
        return {
          name: 'API Health',
          status: 'fail' as const,
          duration,
          message: `API returned ${response.status}`
        }
      }
    } catch (error) {
      return {
        name: 'API Health',
        status: 'fail' as const,
        duration: performance.now() - startTime,
        message: 'API unreachable'
      }
    }
  }

  private static checkLocalStorage() {
    const startTime = performance.now()
    try {
      const testKey = '__health_check__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      
      return {
        name: 'Local Storage',
        status: 'pass' as const,
        duration: performance.now() - startTime,
        message: 'Local storage working'
      }
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'fail' as const,
        duration: performance.now() - startTime,
        message: 'Local storage unavailable'
      }
    }
  }

  private static checkNetworkConnectivity() {
    const connection = (navigator as any).connection
    const isOnline = navigator.onLine
    
    return {
      name: 'Network Connectivity',
      status: isOnline ? 'pass' as const : 'fail' as const,
      duration: 0,
      message: isOnline 
        ? `Online (${connection?.effectiveType || 'unknown'} connection)`
        : 'Offline'
    }
  }

  private static checkPerformance() {
    const metrics = monitoring.getMetricsSummary()
    if (!metrics) {
      return {
        name: 'Performance',
        status: 'warn' as const,
        duration: 0,
        message: 'No performance data available'
      }
    }

    const isGoodPerformance = 
      (metrics.loadTime || 0) < 3000 && 
      (metrics.firstContentfulPaint || 0) < 1500 &&
      (metrics.cumulativeLayoutShift || 0) < 0.1

    return {
      name: 'Performance',
      status: isGoodPerformance ? 'pass' as const : 'warn' as const,
      duration: 0,
      message: isGoodPerformance 
        ? 'Performance within acceptable ranges'
        : 'Performance may be degraded'
    }
  }
}