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
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40 lg:hidden">
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
                  'flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 transition-colors duration-200',
                  isActive 
                    ? 'text-primary-600' 
                    : 'text-gray-500 hover:text-gray-700'
                )}
                aria-label={item.label}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className={cn(
                  'text-xs font-medium truncate',
                  isActive ? 'text-primary-600' : 'text-gray-500'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Swipe indicator */}
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full opacity-50" />
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              Scottish Mountain Weather
            </h1>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item, index) => {
              const isActive = activeIndex === index
              const Icon = isActive ? item.activeIcon : item.icon
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item, index)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Header with Menu Button */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 safe-top z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            Scottish Mountain Weather
          </h1>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="px-4 py-6 space-y-2">
              {navigationItems.map((item, index) => {
                const isActive = activeIndex === index
                const Icon = isActive ? item.activeIcon : item.icon
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item, index)}
                    className={cn(
                      'w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Content spacer for mobile */}
      <div className="lg:hidden h-16" /> {/* Top spacer */}
      <div className="lg:hidden h-20" /> {/* Bottom spacer */}
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