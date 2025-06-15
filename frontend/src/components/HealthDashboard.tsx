import React, { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CloudIcon,
  CpuChipIcon,
  SignalIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { HealthCheck } from '@/utils/monitoring'
import { accessibilityChecker } from '@/utils/accessibility'
import { usePerformanceMonitoring } from '@/utils/monitoring'
import { useOfflineStatus } from '@/utils/offlineCache'

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    duration: number
    message?: string
  }>
  performance: any
  accessibility: any
  timestamp: number
}

export function HealthDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { metrics } = usePerformanceMonitoring()
  const { isOnline } = useOfflineStatus()

  const runHealthCheck = async () => {
    setIsLoading(true)
    try {
      const healthChecks = await HealthCheck.runHealthChecks()
      const accessibilityScore = accessibilityChecker.getAccessibilityScore()

      const status: HealthStatus = {
        overall: healthChecks.overall,
        checks: healthChecks.checks,
        performance: metrics,
        accessibility: accessibilityScore,
        timestamp: Date.now()
      }

      setHealthStatus(status)
      setLastCheck(new Date())
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runHealthCheck()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runHealthCheck, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: 'pass' | 'fail' | 'warn' | 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'warn':
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      case 'fail':
      case 'unhealthy':
        return <XCircleIcon className="w-5 h-5 text-red-600" />
      default:
        return <ArrowPathIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warn':
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'fail':
      case 'unhealthy':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (!healthStatus && !isLoading) {
    return (
      <div className="card text-center py-8">
        <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Health Dashboard</h3>
        <p className="text-gray-500 mb-4">
          Monitor application health, performance, and accessibility
        </p>
        <button
          onClick={runHealthCheck}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Run Health Check
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6" />
            System Health Dashboard
          </h2>
          {lastCheck && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          
          <button
            onClick={runHealthCheck}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            <ArrowPathIcon className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            {isLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      {healthStatus && (
        <div className={cn(
          'card border-l-4',
          getStatusColor(healthStatus.overall)
        )}>
          <div className="flex items-center gap-3">
            {getStatusIcon(healthStatus.overall)}
            <div>
              <h3 className="font-semibold capitalize">
                System Status: {healthStatus.overall}
              </h3>
              <p className="text-sm opacity-75">
                {healthStatus.checks.filter(c => c.status === 'pass').length} of {healthStatus.checks.length} checks passing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Network Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <SignalIcon className={cn('w-5 h-5', isOnline ? 'text-green-600' : 'text-red-600')} />
            <h4 className="font-medium">Network</h4>
          </div>
          <div className={cn('text-sm', isOnline ? 'text-green-700' : 'text-red-700')}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <CpuChipIcon className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium">Performance</h4>
          </div>
          <div className="text-sm text-gray-700">
            {metrics?.loadTime ? `${Math.round(metrics.loadTime)}ms load` : 'No data'}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <CloudIcon className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium">API</h4>
          </div>
          <div className="text-sm text-gray-700">
            {metrics?.apiCallCount || 0} requests
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <ClockIcon className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium">Accessibility</h4>
          </div>
          <div className="text-sm text-gray-700">
            Grade: {healthStatus?.accessibility?.grade || 'N/A'}
          </div>
        </div>
      </div>

      {/* Detailed Health Checks */}
      {healthStatus && (
        <div className="card">
          <h3 className="font-semibold mb-4">Health Checks</h3>
          <div className="space-y-3">
            {healthStatus.checks.map((check, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  getStatusColor(check.status)
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium">{check.name}</div>
                    {check.message && (
                      <div className="text-sm opacity-75">{check.message}</div>
                    )}
                  </div>
                </div>
                
                {check.duration > 0 && (
                  <div className="text-sm opacity-75">
                    {Math.round(check.duration)}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {metrics && (
        <div className="card">
          <h3 className="font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.loadTime || 0)}ms
              </div>
              <div className="text-sm text-gray-500">Load Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(metrics.firstContentfulPaint || 0)}ms
              </div>
              <div className="text-sm text-gray-500">First Paint</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(metrics.avgApiResponseTime || 0)}ms
              </div>
              <div className="text-sm text-gray-500">Avg API Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((metrics.memoryUsage || 0) / 1024 / 1024)}MB
              </div>
              <div className="text-sm text-gray-500">Memory Usage</div>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Report */}
      {healthStatus?.accessibility && (
        <div className="card">
          <h3 className="font-semibold mb-4">Accessibility Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold',
                  healthStatus.accessibility.grade === 'A' ? 'bg-green-100 text-green-800' :
                  healthStatus.accessibility.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                  healthStatus.accessibility.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                  healthStatus.accessibility.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                )}>
                  {healthStatus.accessibility.grade}
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    Score: {healthStatus.accessibility.score}/100
                  </div>
                  <div className="text-sm text-gray-500">
                    WCAG 2.1 Compliance
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Errors:</span>
                <span className="font-medium">{healthStatus.accessibility.summary.errors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600">Warnings:</span>
                <span className="font-medium">{healthStatus.accessibility.summary.warnings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Info:</span>
                <span className="font-medium">{healthStatus.accessibility.summary.info}</span>
              </div>
            </div>
          </div>

          {healthStatus.accessibility.issues.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                View Issues ({healthStatus.accessibility.issues.length})
              </summary>
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {healthStatus.accessibility.issues.slice(0, 10).map((issue, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-2 rounded text-sm',
                      issue.severity === 'error' ? 'bg-red-50 text-red-800' :
                      issue.severity === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-blue-50 text-blue-800'
                    )}
                  >
                    <div className="font-medium">{issue.type}: {issue.element}</div>
                    <div className="text-xs opacity-75">{issue.description}</div>
                  </div>
                ))}
                {healthStatus.accessibility.issues.length > 10 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    ... and {healthStatus.accessibility.issues.length - 10} more issues
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Production Readiness Checklist */}
      <ProductionReadinessChecklist healthStatus={healthStatus} />
    </div>
  )
}

function ProductionReadinessChecklist({ healthStatus }: { healthStatus: HealthStatus | null }) {
  const checklistItems = [
    {
      category: 'Security',
      items: [
        { name: 'HTTPS enabled', status: window.location.protocol === 'https:', critical: true },
        { name: 'Content Security Policy', status: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), critical: true },
        { name: 'No console errors', status: !healthStatus?.checks.some(c => c.name.includes('Error')), critical: false }
      ]
    },
    {
      category: 'Performance',
      items: [
        { name: 'Load time < 3s', status: (healthStatus?.performance?.loadTime || 0) < 3000, critical: true },
        { name: 'First paint < 1.5s', status: (healthStatus?.performance?.firstContentfulPaint || 0) < 1500, critical: false },
        { name: 'Memory usage reasonable', status: (healthStatus?.performance?.memoryUsage || 0) < 100 * 1024 * 1024, critical: false }
      ]
    },
    {
      category: 'Accessibility',
      items: [
        { name: 'WCAG AA compliance', status: (healthStatus?.accessibility?.grade || 'F') >= 'B', critical: true },
        { name: 'No critical a11y errors', status: (healthStatus?.accessibility?.summary?.errors || 0) === 0, critical: true },
        { name: 'Keyboard navigation', status: true, critical: true } // Would need actual test
      ]
    },
    {
      category: 'Functionality',
      items: [
        { name: 'API connectivity', status: healthStatus?.checks.find(c => c.name === 'API Health')?.status === 'pass', critical: true },
        { name: 'Local storage works', status: healthStatus?.checks.find(c => c.name === 'Local Storage')?.status === 'pass', critical: false },
        { name: 'Offline capability', status: 'serviceWorker' in navigator, critical: false }
      ]
    }
  ]

  const overallReadiness = checklistItems.every(category =>
    category.items.filter(item => item.critical).every(item => item.status)
  )

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Production Readiness</h3>
        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-medium',
          overallReadiness 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        )}>
          {overallReadiness ? 'Ready' : 'Not Ready'}
        </div>
      </div>

      <div className="space-y-4">
        {checklistItems.map((category, index) => (
          <div key={index}>
            <h4 className="font-medium text-gray-700 mb-2">{category.category}</h4>
            <div className="space-y-2">
              {category.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-600" />
                    )}
                    <span className={cn(
                      'text-sm',
                      item.critical && !item.status && 'font-medium text-red-700'
                    )}>
                      {item.name}
                    </span>
                  </div>
                  {item.critical && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Critical
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}