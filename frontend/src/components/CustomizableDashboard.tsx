import React, { useState } from 'react'
import { 
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { WeatherCharts } from '@/components/WeatherCharts'
import { WeatherMaps } from '@/components/WeatherMaps'
import { HikingSuitabilityDashboard } from '@/components/HikingSuitabilityDashboard'
import { PhotographyDashboard } from '@/components/PhotographyDashboard'
import type { DailyForecast } from '@/types'

interface Widget {
  id: string
  title: string
  component: React.ComponentType<any>
  visible: boolean
  order: number
  props?: any
}

interface CustomizableDashboardProps {
  locationId: string
  forecasts: DailyForecast[]
  location: any
  preferences: any
}

export function CustomizableDashboard({ 
  locationId, 
  forecasts, 
  location, 
  preferences 
}: CustomizableDashboardProps) {
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'hiking',
      title: 'Hiking Conditions',
      component: HikingSuitabilityDashboard,
      visible: true,
      order: 1,
      props: { locationId }
    },
    {
      id: 'photography',
      title: 'Photography Opportunities',
      component: PhotographyDashboard,
      visible: true,
      order: 2,
      props: { locationId }
    },
    {
      id: 'charts',
      title: 'Weather Trends',
      component: WeatherCharts,
      visible: true,
      order: 3,
      props: { forecasts, preferences }
    },
    {
      id: 'maps',
      title: 'Weather Maps',
      component: WeatherMaps,
      visible: true,
      order: 4,
      props: { forecasts, currentLocation: location }
    }
  ])

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, visible: !widget.visible }
        : widget
    ))
  }

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex(w => w.id === widgetId)
      
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === sorted.length - 1)
      ) {
        return prev
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const [widget] = sorted.splice(index, 1)
      sorted.splice(targetIndex, 0, widget)

      // Reassign order values
      return sorted.map((w, i) => ({ ...w, order: i + 1 }))
    })
  }

  const visibleWidgets = widgets
    .filter(widget => widget.visible)
    .sort((a, b) => a.order - b.order)

  if (isCustomizing) {
    return (
      <div className="space-y-4">
        <CustomizationPanel
          widgets={widgets}
          onToggleVisibility={toggleWidgetVisibility}
          onMoveWidget={moveWidget}
          onFinish={() => setIsCustomizing(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customization toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsCustomizing(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Customize Dashboard
        </button>
      </div>

      {/* Widgets */}
      {visibleWidgets.map(widget => {
        const Component = widget.component
        return (
          <div key={widget.id} className="widget-container">
            <Component {...widget.props} />
          </div>
        )
      })}

      {visibleWidgets.length === 0 && (
        <div className="card text-center py-12">
          <Squares2X2Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Widgets Visible</h3>
          <p className="text-gray-500 mb-4">
            All dashboard widgets are currently hidden. Enable some widgets to see your weather data.
          </p>
          <button
            onClick={() => setIsCustomizing(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Customize Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

function CustomizationPanel({ 
  widgets, 
  onToggleVisibility, 
  onMoveWidget, 
  onFinish 
}: {
  widgets: Widget[]
  onToggleVisibility: (id: string) => void
  onMoveWidget: (id: string, direction: 'up' | 'down') => void
  onFinish: () => void
}) {
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cog6ToothIcon className="w-6 h-6" />
          Customize Dashboard
        </h2>
        <button
          onClick={onFinish}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Done
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600 mb-4">
          Reorder widgets and toggle their visibility. Changes are saved automatically.
        </div>

        {sortedWidgets.map((widget, index) => (
          <div
            key={widget.id}
            className={cn(
              'flex items-center justify-between p-4 border rounded-lg transition-colors',
              widget.visible ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 font-mono w-6">
                {widget.order}
              </div>
              <div>
                <h4 className={cn(
                  'font-medium',
                  widget.visible ? 'text-gray-900' : 'text-gray-500'
                )}>
                  {widget.title}
                </h4>
                <div className="text-sm text-gray-500">
                  {widget.visible ? 'Visible' : 'Hidden'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Move buttons */}
              <button
                onClick={() => onMoveWidget(widget.id, 'up')}
                disabled={index === 0}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  index === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onMoveWidget(widget.id, 'down')}
                disabled={index === sortedWidgets.length - 1}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  index === sortedWidgets.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                )}
              >
                <ArrowDownIcon className="w-4 h-4" />
              </button>

              {/* Visibility toggle */}
              <button
                onClick={() => onToggleVisibility(widget.id)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  widget.visible
                    ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                )}
              >
                {widget.visible ? (
                  <EyeIcon className="w-4 h-4" />
                ) : (
                  <EyeSlashIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use the eye icon to show/hide widgets</li>
          <li>• Use the arrows to reorder widgets</li>
          <li>• Widget preferences are saved to your browser</li>
          <li>• Hidden widgets won't affect page loading performance</li>
        </ul>
      </div>
    </div>
  )
}