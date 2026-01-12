import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  HeartIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  MapPinIcon as LocationIconSolid,
  HeartIcon as HeartIconSolid,
  Cog6ToothIcon as SettingsIconSolid
} from '@heroicons/react/24/solid'
import { cn } from '@/utils/cn'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

interface NavigationItem {
  id: string
  label: string
  path: string
  icon: React.ComponentType<any>
  activeIcon: React.ComponentType<any>
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: HomeIcon,
    activeIcon: HomeIconSolid
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: MagnifyingGlassIcon,
    activeIcon: SearchIconSolid
  },
  {
    id: 'locations',
    label: 'Locations',
    path: '/locations',
    icon: MapPinIcon,
    activeIcon: LocationIconSolid
  },
  {
    id: 'favorites',
    label: 'Favorites',
    path: '/favorites',
    icon: HeartIcon,
    activeIcon: HeartIconSolid
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Cog6ToothIcon,
    activeIcon: SettingsIconSolid
  }
]

export function MobileNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Update active index based on current path
  useEffect(() => {
    const currentIndex = navigationItems.findIndex(item =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    )
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [location.pathname])

  // Swipe navigation between tabs
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeLeft: () => {
      const nextIndex = Math.min(activeIndex + 1, navigationItems.length - 1)
      if (nextIndex !== activeIndex) {
        navigate(navigationItems[nextIndex].path)
      }
    },
    onSwipeRight: () => {
      const prevIndex = Math.max(activeIndex - 1, 0)
      if (prevIndex !== activeIndex) {
        navigate(navigationItems[prevIndex].path)
      }
    },
    threshold: 100
  })

  const handleNavigation = (item: NavigationItem, index: number) => {
    navigate(item.path)
    setActiveIndex(index)
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Mobile Bottom Navigation - Dark Theme */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 safe-bottom z-40 lg:hidden">
        <div
          ref={swipeRef}
          className="flex items-center justify-around px-2 py-1"
        >
          {navigationItems.map((item, index) => {
            const isActive = activeIndex === index
            const Icon = isActive ? item.activeIcon : item.icon

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item, index)}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 transition-all duration-200',
                  isActive
                    ? 'text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                aria-label={item.label}
              >
                <Icon className={cn(
                  "w-6 h-6 mb-1 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  'text-xs font-medium truncate',
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-emerald-500 rounded-t-full" style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Swipe indicator */}
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-slate-600 rounded-full opacity-50" />
      </nav>

      {/* Desktop Sidebar Navigation - Dark Theme */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-slate-900 lg:border-r lg:border-slate-700/50 lg:z-30">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo / Brand */}
          <div className="flex items-center h-16 px-6 border-b border-slate-700/50 header-gradient">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z"/>
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white">
                Highland Weather
              </h1>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigationItems.map((item, index) => {
              const isActive = activeIndex === index
              const Icon = isActive ? item.activeIcon : item.icon

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item, index)}
                  className={cn(
                    'w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border-l-2 border-emerald-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-500">
              Scottish Mountain Weather
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Stay safe on the hills
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header with Menu Button - Dark Theme */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 safe-top z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg header-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-100 truncate">
              Highland Weather
            </h1>
          </div>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay - Dark Theme */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-72 bg-slate-900 shadow-2xl border-l border-slate-700/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 header-gradient">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <nav className="px-3 py-6 space-y-1">
              {navigationItems.map((item, index) => {
                const isActive = activeIndex === index
                const Icon = isActive ? item.activeIcon : item.icon

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item, index)}
                    className={cn(
                      'w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Quick Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
              <div className="card-glass p-3">
                <div className="text-xs text-slate-400 mb-1">Current Conditions</div>
                <div className="text-sm text-slate-200">Check weather before heading out</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content spacer for mobile */}
      <div className="lg:hidden h-16" /> {/* Top spacer */}
    </>
  )
}

// Hook for navigation state
export function useNavigationState() {
  const location = useLocation()

  const currentItem = navigationItems.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )

  return {
    currentItem,
    navigationItems
  }
}
