import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/utils/cn'
import {
  requestNotificationPermission,
  isNotificationsSupported,
  getNotificationPermission,
} from '@/utils/notifications'
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  InformationCircleIcon,
  TrashIcon,
  MapPinIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import type { ThemeMode } from '@/types'

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
  label: string
}

function ToggleSwitch({ enabled, onChange, disabled = false, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={cn(
        'toggle',
        enabled ? 'toggle-enabled' : 'toggle-disabled',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

// Segmented Control Component
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div className="tab-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'tab-button-emerald',
            value === option.value && 'tab-button-active'
          )}
          aria-pressed={value === option.value}
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
    <div className="card overflow-hidden">
      <div className="px-4 py-4 sm:px-6 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
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
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
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
  const [cacheSize, setCacheSize] = useState('Calculating...')
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(getNotificationPermission())

  // Refresh notification permission state on mount (handles external browser changes)
  useEffect(() => {
    setNotificationPermission(getNotificationPermission())
  }, [])

  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const granted = await requestNotificationPermission()
        setNotificationPermission(getNotificationPermission())
        if (!granted) {
          // Permission denied or unsupported -- don't enable the toggle
          return
        }
      }
      setPreferences({
        notifications: { ...preferences.notifications, enabled },
      })
    },
    [preferences.notifications, setPreferences]
  )

  // Calculate actual localStorage size
  useEffect(() => {
    try {
      let totalBytes = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          totalBytes += key.length + (localStorage.getItem(key)?.length ?? 0)
        }
      }
      // Each char is 2 bytes in UTF-16
      const totalKB = (totalBytes * 2) / 1024
      setCacheSize(totalKB >= 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${Math.round(totalKB)} KB`)
    } catch {
      setCacheSize('Unknown')
    }
  }, [isClearingCache])

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

  const handleElevationChange = (value: 'meters' | 'feet') => {
    setPreferences({
      units: { ...preferences.units, elevation: value }
    })
  }

  // Theme handler
  const handleThemeChange = (value: ThemeMode) => {
    setPreferences({ theme: value })
  }

  // Notification handlers
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700/50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Customize your weather app experience</p>
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
              ariaLabel="Temperature unit"
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
              ariaLabel="Wind speed unit"
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
              ariaLabel="Distance unit"
            />
          </SettingRow>

          <SettingRow label="Elevation">
            <SegmentedControl
              options={[
                { value: 'meters', label: 'm' },
                { value: 'feet', label: 'ft' },
              ]}
              value={preferences.units.elevation ?? 'meters'}
              onChange={handleElevationChange}
              ariaLabel="Elevation unit"
            />
          </SettingRow>
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection
          icon={SunIcon}
          title="Appearance"
          description="Choose your preferred color theme"
        >
          <SettingRow label="Theme">
            <SegmentedControl
              options={[
                { value: 'light' as ThemeMode, label: 'Light' },
                { value: 'dark' as ThemeMode, label: 'Dark' },
                { value: 'system' as ThemeMode, label: 'System' },
              ]}
              value={preferences.theme ?? 'dark'}
              onChange={handleThemeChange}
              ariaLabel="Theme preference"
            />
          </SettingRow>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          icon={BellIcon}
          title="Notifications"
          description="Manage how you receive weather alerts"
        >
          {notificationPermission === 'unsupported' ? (
            <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3">
              <p className="text-sm text-amber-300">
                Your browser does not support notifications. Try using Chrome, Firefox, or Edge on desktop.
              </p>
            </div>
          ) : (
            <>
              <SettingRow
                label="Enable Notifications"
                description={
                  notificationPermission === 'denied'
                    ? 'Notifications are blocked in your browser settings. Please allow them in your browser to enable this feature.'
                    : 'Master toggle for all notifications'
                }
              >
                <ToggleSwitch
                  enabled={preferences.notifications.enabled}
                  onChange={handleNotificationToggle}
                  disabled={notificationPermission === 'denied'}
                  label="Enable notifications"
                />
              </SettingRow>

              {notificationPermission === 'denied' && (
                <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3">
                  <p className="text-sm text-amber-300">
                    Notifications are blocked. To re-enable, click the lock icon in your browser address bar and allow notifications for this site.
                  </p>
                </div>
              )}

              {notificationPermission === 'granted' && preferences.notifications.enabled && (
                <p className="text-xs text-emerald-400">Notifications are active</p>
              )}

              <SettingRow
                label="Severe Weather Alerts"
                description="Get notified about dangerous conditions"
              >
                <ToggleSwitch
                  enabled={preferences.notifications.severeWeather}
                  onChange={handleSevereWeatherChange}
                  disabled={!preferences.notifications.enabled}
                  label="Severe weather alerts"
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
                  label="Favorite location updates"
                />
              </SettingRow>
            </>
          )}
        </SettingsSection>

        {/* Risk Tolerance Section */}
        <SettingsSection
          icon={ShieldCheckIcon}
          title="Risk Tolerance"
          description="Adjust how conditions are assessed for hiking"
        >
          <fieldset className="space-y-3 stagger-children">
            <legend className="sr-only">Risk tolerance level</legend>
            {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
              <label
                key={level}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                  preferences.riskTolerance === level
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <input
                  type="radio"
                  name="riskTolerance"
                  value={level}
                  checked={preferences.riskTolerance === level}
                  onChange={() => handleRiskToleranceChange(level)}
                  className="radio mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium capitalize',
                    preferences.riskTolerance === level ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                  )}>{level}</p>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    {riskToleranceDescriptions[level]}
                  </p>
                </div>
              </label>
            ))}
          </fieldset>
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
            <span className="text-sm font-medium text-slate-400">{cacheSize}</span>
          </SettingRow>

          <div className="pt-2">
            <button
              onClick={handleClearCache}
              disabled={isClearingCache}
              className={cn(
                'btn btn-outline-danger inline-flex items-center gap-2',
                isClearingCache && 'btn-loading'
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
              <span className="text-sm font-medium text-slate-400">0.1.0</span>
            </SettingRow>

            <SettingRow label="Data Sources">
              <span className="text-sm text-slate-400">mountain-forecast.com</span>
            </SettingRow>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Scottish Mountain Weather provides weather forecasts and hiking suitability
                scores to help you make informed decisions. Always exercise caution and
                check multiple sources before heading into the mountains.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-400">
                Weather data is refreshed every 4-6 hours. Forecasts are provided for
                informational purposes only.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Navigation Section */}
        <SettingsSection
          icon={MapPinIcon}
          title="Navigation"
          description="Set your home location for driving directions"
        >
          <SettingRow
            label="Home Address"
            description="Used as starting point for navigation links on location pages"
          >
            <input
              type="text"
              value={preferences.homeAddress || ''}
              onChange={(e) => setPreferences({ homeAddress: e.target.value || undefined })}
              placeholder="e.g. Glasgow, UK"
              className="w-48 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              aria-label="Home address for navigation"
            />
          </SettingRow>
        </SettingsSection>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20" />
      </div>
    </div>
  )
}
