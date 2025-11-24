import React, { Component, ErrorInfo, ReactNode } from 'react'
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    this.logError(error, errorInfo)

    // Call optional onError callback
    this.props.onError?.(error, errorInfo)
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group('🐛 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.log('Error Report:', errorReport)
      console.groupEnd()
    }

    // Send to error tracking service (would be configured in production)
    this.sendErrorReport(errorReport)
  }

  private sendErrorReport = async (errorReport: any) => {
    try {
      // In production, this would send to your error tracking service
      // For now, we'll store it locally for development
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]')
      existingErrors.push(errorReport)
      
      // Keep only the last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50)
      }
      
      localStorage.setItem('error_reports', JSON.stringify(existingErrors))
    } catch (err) {
      console.error('Failed to log error report:', err)
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private copyErrorDetails = () => {
    const errorDetails = {
      id: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard')
      })
      .catch(() => {
        console.error('Failed to copy error details')
      })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const canRetry = this.retryCount < this.maxRetries
      const isDevelopment = import.meta.env.DEV

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600">
                We apologize for the inconvenience. The application encountered an unexpected error.
              </p>
            </div>

            {/* Error ID for support */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <div className="text-xs text-gray-500 mb-1">Error ID:</div>
              <div className="font-mono text-sm text-gray-700">
                {this.state.errorId}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <HomeIcon className="w-5 h-5" />
                Go to Home
              </button>
            </div>

            {/* Developer information */}
            {isDevelopment && this.state.error && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={this.copyErrorDetails}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  <BugAntIcon className="w-4 h-4" />
                  Copy Error Details
                </button>
                
                <details className="mt-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    Show Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-800 font-medium mb-2">
                      {this.state.error.message}
                    </div>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {/* Support information */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-2">
                If this problem persists, please contact support with the error ID above.
              </p>
              <p className="text-xs text-gray-400">
                Scottish Mountain Weather v1.0.0
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    const errorReport = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      type: 'manual'
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Manual Error Report:', errorReport)
    }

    // Store locally for now
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]')
      existingErrors.push(errorReport)
      localStorage.setItem('error_reports', JSON.stringify(existingErrors))
    } catch (err) {
      console.error('Failed to log manual error report:', err)
    }
  }, [])

  return { reportError }
}