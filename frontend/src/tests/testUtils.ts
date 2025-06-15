import { render, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Test utilities and setup helpers

// Mock implementations for common hooks and APIs
export const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

export const mockNavigator = {
  onLine: true,
  userAgent: 'Mozilla/5.0 (Test Browser)',
  geolocation: mockGeolocation,
  share: vi.fn(),
  sendBeacon: vi.fn(),
  permissions: {
    query: vi.fn().mockResolvedValue({ state: 'granted' })
  }
}

export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

export const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn()
}

// Setup global mocks
export function setupGlobalMocks() {
  // Navigator mock
  Object.defineProperty(window, 'navigator', {
    value: mockNavigator,
    writable: true
  })

  // LocalStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  })

  // IndexedDB mock
  Object.defineProperty(window, 'indexedDB', {
    value: mockIndexedDB,
    writable: true
  })

  // Performance mock
  Object.defineProperty(window, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      timing: {
        navigationStart: Date.now() - 1000,
        domContentLoadedEventEnd: Date.now() - 500,
        loadEventEnd: Date.now()
      },
      memory: {
        usedJSHeapSize: 1024 * 1024,
        totalJSHeapSize: 2 * 1024 * 1024,
        jsHeapSizeLimit: 10 * 1024 * 1024
      }
    },
    writable: true
  })

  // IntersectionObserver mock
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: []
  }))

  // ResizeObserver mock
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // PerformanceObserver mock
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn()
  }))

  // matchMedia mock
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true
  })
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & {
    initialEntries?: string[]
    queryClient?: QueryClient
  } = {}
) {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    ...renderOptions
  } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock weather data generators
export function createMockWeatherPeriod(overrides = {}) {
  return {
    period_type: 'am',
    temperature_c: 15,
    feels_like_c: 13,
    wind_speed_kph: 20,
    wind_direction: 'SW',
    precipitation_mm: 0,
    weather_description: 'Partly cloudy',
    visibility_m: 15000,
    cloud_base_m: 1200,
    humidity_percent: 65,
    hiking_score: 7,
    risk_level: 'moderate',
    ...overrides
  }
}

export function createMockDailyForecast(overrides = {}) {
  return {
    date: '2025-06-14',
    summary: {
      max_temp_c: 18,
      min_temp_c: 8,
      max_wind_speed_kph: 25,
      total_precipitation_mm: 2,
      overall_hiking_score: 7,
      dominant_conditions: 'Mixed conditions'
    },
    periods: [
      createMockWeatherPeriod({ period_type: 'am' }),
      createMockWeatherPeriod({ period_type: 'pm', temperature_c: 18 }),
      createMockWeatherPeriod({ period_type: 'night', temperature_c: 10 })
    ],
    ...overrides
  }
}

export function createMockLocation(overrides = {}) {
  return {
    id: 'test-location',
    name: 'Test Mountain',
    area: 'Test Area',
    latitude: 56.8,
    longitude: -5.0,
    elevation_m: 1000,
    classification: 'munro',
    ...overrides
  }
}

export function createMockForecast(overrides = {}) {
  return {
    location: createMockLocation(),
    forecasts: [
      createMockDailyForecast(),
      createMockDailyForecast({ date: '2025-06-15' }),
      createMockDailyForecast({ date: '2025-06-16' })
    ],
    last_updated: new Date().toISOString(),
    data_source: 'test-source',
    alerts: [],
    ...overrides
  }
}

// Test data factories
export class TestDataFactory {
  static weatherPeriod(type: 'good' | 'bad' | 'extreme' = 'good') {
    const baseData = createMockWeatherPeriod()
    
    switch (type) {
      case 'good':
        return createMockWeatherPeriod({
          temperature_c: 18,
          wind_speed_kph: 15,
          precipitation_mm: 0,
          visibility_m: 20000,
          hiking_score: 9,
          risk_level: 'low'
        })
      
      case 'bad':
        return createMockWeatherPeriod({
          temperature_c: -5,
          wind_speed_kph: 45,
          precipitation_mm: 10,
          visibility_m: 2000,
          hiking_score: 3,
          risk_level: 'high'
        })
      
      case 'extreme':
        return createMockWeatherPeriod({
          temperature_c: -20,
          wind_speed_kph: 80,
          precipitation_mm: 25,
          visibility_m: 200,
          hiking_score: 1,
          risk_level: 'extreme'
        })
      
      default:
        return baseData
    }
  }

  static location(type: 'low' | 'medium' | 'high' = 'medium') {
    const baseLocation = createMockLocation()
    
    switch (type) {
      case 'low':
        return createMockLocation({
          name: 'Low Hill',
          elevation_m: 400,
          classification: 'hill'
        })
      
      case 'medium':
        return createMockLocation({
          name: 'Medium Mountain',
          elevation_m: 800,
          classification: 'corbett'
        })
      
      case 'high':
        return createMockLocation({
          name: 'High Peak',
          elevation_m: 1500,
          classification: 'munro'
        })
      
      default:
        return baseLocation
    }
  }
}

// Custom matchers
export const customMatchers = {
  toBeAccessible: (received: HTMLElement) => {
    // Basic accessibility checks
    const hasAriaLabel = received.getAttribute('aria-label')
    const hasRole = received.getAttribute('role')
    const isButton = received.tagName === 'BUTTON'
    const isLink = received.tagName === 'A'
    const isInput = received.tagName === 'INPUT'

    if (isInput && !received.getAttribute('aria-label') && !received.getAttribute('id')) {
      return {
        message: () => 'Input element should have aria-label or associated label',
        pass: false
      }
    }

    if ((isButton || isLink) && !hasAriaLabel && !received.textContent?.trim()) {
      return {
        message: () => 'Interactive element should have accessible text or aria-label',
        pass: false
      }
    }

    return {
      message: () => 'Element appears to be accessible',
      pass: true
    }
  },

  toHaveValidContrast: (received: HTMLElement) => {
    const computedStyle = window.getComputedStyle(received)
    const color = computedStyle.color
    const backgroundColor = computedStyle.backgroundColor

    // This would need actual color contrast calculation
    // For now, just check if colors are defined
    const hasColors = color && backgroundColor && color !== backgroundColor

    return {
      message: () => hasColors 
        ? 'Element has defined colors' 
        : 'Element should have sufficient color contrast',
      pass: hasColors
    }
  }
}

// Error testing utilities
export function simulateError(component: any, errorType: 'render' | 'async' | 'network' = 'render') {
  switch (errorType) {
    case 'render':
      // Trigger render error
      vi.spyOn(console, 'error').mockImplementation(() => {})
      return () => {
        throw new Error('Test render error')
      }
    
    case 'async':
      // Trigger async error
      return () => {
        return Promise.reject(new Error('Test async error'))
      }
    
    case 'network':
      // Trigger network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      return () => {
        return fetch('/api/test')
      }
    
    default:
      return () => {}
  }
}

// Performance testing utilities
export function measureRenderTime(renderFn: () => void): number {
  const startTime = performance.now()
  renderFn()
  return performance.now() - startTime
}

export function createPerformanceTest(name: string, threshold: number = 100) {
  return {
    name,
    threshold,
    run: (renderFn: () => void) => {
      const renderTime = measureRenderTime(renderFn)
      return {
        passed: renderTime < threshold,
        renderTime,
        threshold,
        message: `${name} rendered in ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      }
    }
  }
}

// Accessibility testing utilities
export function runBasicA11yTests(element: HTMLElement) {
  const issues: string[] = []

  // Check for alt text on images
  const images = element.querySelectorAll('img')
  images.forEach(img => {
    if (!img.getAttribute('alt')) {
      issues.push(`Image missing alt text: ${img.src}`)
    }
  })

  // Check for form labels
  const inputs = element.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    element.querySelector(`label[for="${input.id}"]`)
    if (!hasLabel) {
      issues.push(`Form element missing label: ${input.tagName}`)
    }
  })

  // Check for button text
  const buttons = element.querySelectorAll('button')
  buttons.forEach(button => {
    const hasText = button.textContent?.trim() || 
                   button.getAttribute('aria-label')
    if (!hasText) {
      issues.push('Button missing accessible text')
    }
  })

  return issues
}

// Test environment setup
export function setupTestEnvironment() {
  setupGlobalMocks()
  
  // Extend expect with custom matchers
  expect.extend(customMatchers)
  
  // Setup console spy to catch errors in tests
  const originalError = console.error
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation((message) => {
      if (message.includes('Warning: ReactDOM.render is no longer supported')) {
        return
      }
      originalError(message)
    })
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
}

// Export everything
export * from '@testing-library/react'
export { vi } from 'vitest'