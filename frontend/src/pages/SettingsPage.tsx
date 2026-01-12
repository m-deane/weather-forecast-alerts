import { useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/utils/cn'
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  InformationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ enabled, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        enabled ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// Segmented Control Component
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Settings Section Card
interface SettingsSectionProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-4 sm:px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6 space-y-4">
        {children}
      </div>
    </div>
  )
}

// Setting Row Component
interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  )
}

// Risk Tolerance Descriptions
const riskToleranceDescriptions = {
  conservative: 'Prioritizes safety. Warns about conditions that experienced hikers might handle. Best for beginners or those hiking alone.',
  moderate: 'Balanced approach. Suitable for experienced hikers comfortable with variable Scottish weather.',
  aggressive: 'For very experienced mountaineers. Minimal warnings, only for truly dangerous conditions.',
}

export function SettingsPage() {
  const { preferences, setPreferences } = useAppStore()
  const [cacheSize] = useState('2.4 MB') // Placeholder
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Unit preference handlers
  const handleTemperatureChange = (value: 'celsius' | 'fahrenheit') => {
    setPreferences({
      units: { ...preferences.units, temperature: value }
    })
  }

  const handleWindChange = (value: 'kph' | 'mph') => {
    setPreferences({
      units: { ...preferences.units, wind: value }
    })
  }

  const handleDistanceChange = (value: 'km' | 'miles') => {
    setPreferences({
      units: { ...preferences.units, distance: value }
    })
  }

  // Notification handlers
  const handleNotificationsEnabledChange = (enabled: boolean) => {
    setPreferences({
      notifications: { ...preferences.notifications, enabled }
    })
  }

  const handleSevereWeatherChange = (enabled: boolean) => {
    setPreferences({
      notifications: { ...preferences.notifications, severeWeather: enabled }
    })
  }

  const handleFavoriteUpdatesChange = (enabled: boolean) => {
    setPreferences({
      notifications: { ...preferences.notifications, favoriteUpdates: enabled }
    })
  }

  // Risk tolerance handler
  const handleRiskToleranceChange = (value: 'conservative' | 'moderate' | 'aggressive') => {
    setPreferences({ riskTolerance: value })
  }

  // Cache clear handler
  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      // Clear localStorage except for the app store
      const appStoreData = localStorage.getItem('mountain-weather-storage')
      localStorage.clear()
      if (appStoreData) {
        localStorage.setItem('mountain-weather-storage', appStoreData)
      }

      // Clear caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Simulate a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setIsClearingCache(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Customize your weather app experience</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Unit Preferences Section */}
        <SettingsSection
          icon={Cog6ToothIcon}
          title="Unit Preferences"
          description="Choose your preferred measurement units"
        >
          <SettingRow label="Temperature">
            <SegmentedControl
              options={[
                { value: 'celsius', label: 'C' },
                { value: 'fahrenheit', label: 'F' },
              ]}
              value={preferences.units.temperature}
              onChange={handleTemperatureChange}
            />
          </SettingRow>

          <SettingRow label="Wind Speed">
            <SegmentedControl
              options={[
                { value: 'kph', label: 'kph' },
                { value: 'mph', label: 'mph' },
              ]}
              value={preferences.units.wind}
              onChange={handleWindChange}
            />
          </SettingRow>

          <SettingRow label="Distance">
            <SegmentedControl
              options={[
                { value: 'km', label: 'km' },
                { value: 'miles', label: 'mi' },
              ]}
              value={preferences.units.distance}
              onChange={handleDistanceChange}
            />
          </SettingRow>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          icon={BellIcon}
          title="Notifications"
          description="Manage how you receive weather alerts"
        >
          <SettingRow
            label="Enable Notifications"
            description="Master toggle for all notifications"
          >
            <ToggleSwitch
              enabled={preferences.notifications.enabled}
              onChange={handleNotificationsEnabledChange}
            />
          </SettingRow>

          <SettingRow
            label="Severe Weather Alerts"
            description="Get notified about dangerous conditions"
          >
            <ToggleSwitch
              enabled={preferences.notifications.severeWeather}
              onChange={handleSevereWeatherChange}
              disabled={!preferences.notifications.enabled}
            />
          </SettingRow>

          <SettingRow
            label="Favorite Location Updates"
            description="Daily forecasts for your favorite mountains"
          >
            <ToggleSwitch
              enabled={preferences.notifications.favoriteUpdates}
              onChange={handleFavoriteUpdatesChange}
              disabled={!preferences.notifications.enabled}
            />
          </SettingRow>
        </SettingsSection>

        {/* Risk Tolerance Section */}
        <SettingsSection
          icon={ShieldCheckIcon}
          title="Risk Tolerance"
          description="Adjust how conditions are assessed for hiking"
        >
          <div className="space-y-3">
            {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
              <label
                key={level}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  preferences.riskTolerance === level
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <input
                  type="radio"
                  name="riskTolerance"
                  value={level}
                  checked={preferences.riskTolerance === level}
                  onChange={() => handleRiskToleranceChange(level)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">{level}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {riskToleranceDescriptions[level]}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </SettingsSection>

        {/* Data & Storage Section */}
        <SettingsSection
          icon={CircleStackIcon}
          title="Data & Storage"
          description="Manage cached data and app storage"
        >
          <SettingRow
            label="Cache Size"
            description="Weather data stored for offline access"
          >
            <span className="text-sm font-medium text-gray-600">{cacheSize}</span>
          </SettingRow>

          <div className="pt-2">
            <button
              onClick={handleClearCache}
              disabled={isClearingCache}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'border border-red-200 text-red-600 hover:bg-red-50',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                isClearingCache && 'opacity-50 cursor-not-allowed'
              )}
            >
              <TrashIcon className="h-4 w-4" />
              {isClearingCache ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </SettingsSection>

        {/* About Section */}
        <SettingsSection
          icon={InformationCircleIcon}
          title="About"
          description="App information and credits"
        >
          <div className="space-y-3">
            <SettingRow label="Version">
              <span className="text-sm font-medium text-gray-600">0.1.0</span>
            </SettingRow>

            <SettingRow label="Data Sources">
              <span className="text-sm text-gray-600">mountain-forecast.com</span>
            </SettingRow>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                Scottish Mountain Weather provides weather forecasts and hiking suitability
                scores to help you make informed decisions. Always exercise caution and
                check multiple sources before heading into the mountains.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-xs text-gray-400">
                Weather data is refreshed every 4-6 hours. Forecasts are provided for
                informational purposes only.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20" />
      </div>
    </div>
  )
}
