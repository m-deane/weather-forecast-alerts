import React, { useState } from 'react'
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { exportWeatherData, generateExportOptions, type ExportOptions } from '@/utils/export'
import type { DailyForecast } from '@/types'

interface ExportWeatherDataProps {
  forecasts: DailyForecast[]
  location: any
}

export function ExportWeatherData({ forecasts, location }: ExportWeatherDataProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ExportOptions>(generateExportOptions())
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      exportWeatherData(forecasts, location, options)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setOptions(prev => ({ ...prev, ...updates }))
  }

  const updateIncludedData = (key: keyof ExportOptions['includedData'], value: boolean) => {
    setOptions(prev => ({
      ...prev,
      includedData: {
        ...prev.includedData,
        [key]: value
      }
    }))
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Export Data
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowDownTrayIcon className="w-6 h-6" />
            Export Weather Data
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'csv', label: 'CSV', icon: TableCellsIcon, desc: 'Spreadsheet' },
                { value: 'json', label: 'JSON', icon: DocumentTextIcon, desc: 'Data format' },
                { value: 'pdf', label: 'PDF', icon: DocumentIcon, desc: 'Print ready' },
              ].map(format => {
                const Icon = format.icon
                return (
                  <button
                    key={format.value}
                    onClick={() => updateOptions({ format: format.value as any })}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors',
                      options.format === format.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-xs text-center">
                      <div className="font-medium">{format.label}</div>
                      <div className="text-gray-500">{format.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-sm font-medium mb-3">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={options.dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => updateOptions({
                    dateRange: {
                      ...options.dateRange,
                      start: new Date(e.target.value)
                    }
                  })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={options.dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => updateOptions({
                    dateRange: {
                      ...options.dateRange,
                      end: new Date(e.target.value)
                    }
                  })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Data selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Include Data</label>
            <div className="space-y-2">
              {[
                { key: 'temperature', label: 'Temperature & Feels Like' },
                { key: 'precipitation', label: 'Precipitation' },
                { key: 'wind', label: 'Wind Speed & Direction' },
                { key: 'visibility', label: 'Visibility' },
                { key: 'hikingScores', label: 'Hiking Scores & Risk Levels' },
                { key: 'photography', label: 'Photography Conditions' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={options.includedData[item.key as keyof ExportOptions['includedData']]}
                    onChange={(e) => updateIncludedData(
                      item.key as keyof ExportOptions['includedData'], 
                      e.target.checked
                    )}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Export Preview</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Location: {location.name} ({location.area})</div>
              <div>
                Date Range: {options.dateRange.start.toLocaleDateString()} - {options.dateRange.end.toLocaleDateString()}
              </div>
              <div>
                Data Fields: {Object.values(options.includedData).filter(Boolean).length} selected
              </div>
              <div>Format: {options.format.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || Object.values(options.includedData).every(v => !v)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              isExporting || Object.values(options.includedData).every(v => !v)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            )}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  )
}