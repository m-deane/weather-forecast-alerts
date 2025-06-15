import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { weatherApi } from '@/api/client'
import { useAppStore } from '@/stores/useAppStore'
import { assessHikingConditions, getExperienceLevelColor, getExperienceLevelDescription } from '@/utils/hiking'
import { LoadingSkeleton } from './LoadingSkeleton'
import { cn } from '@/utils/cn'
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  MapIcon,
  BriefcaseIcon as BackpackIcon,
  ShieldExclamationIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import type { WeatherPeriod } from '@/types'

interface HikingSuitabilityDashboardProps {
  locationId: string
  selectedPeriod?: WeatherPeriod
  compact?: boolean
}

export function HikingSuitabilityDashboard({ 
  locationId, 
  selectedPeriod,
  compact = false 
}: HikingSuitabilityDashboardProps) {
  const { preferences } = useAppStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'gear' | 'safety'>('overview')

  const { data: forecast, isLoading } = useQuery({
    queryKey: ['weather', locationId],
    queryFn: () => weatherApi.getForecast(locationId),
  })

  if (isLoading) {
    return <LoadingSkeleton height={compact ? 200 : 400} />
  }

  if (!forecast) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>Unable to load hiking assessment</span>
        </div>
      </div>
    )
  }

  const location = forecast.location
  const period = selectedPeriod || forecast.forecasts[0]?.periods[0]
  
  if (!period) {
    return (
      <div className="card">
        <p className="text-gray-500">No weather data available for assessment</p>
      </div>
    )
  }

  const assessment = assessHikingConditions(period, location, preferences)

  if (compact) {
    return <CompactDashboard assessment={assessment} period={period} />
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckCircleIcon },
    { id: 'risks', label: 'Risk Assessment', icon: ExclamationTriangleIcon },
    { id: 'gear', label: 'Gear Guide', icon: BackpackIcon },
    { id: 'safety', label: 'Safety', icon: ShieldExclamationIcon },
  ] as const

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Hiking Suitability Assessment</h2>
            <p className="text-sm text-gray-500">{location.name} • Current conditions</p>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-3xl font-bold mb-1',
              assessment.level === 'excellent' && 'text-green-600',
              assessment.level === 'good' && 'text-blue-600',
              assessment.level === 'moderate' && 'text-yellow-600',
              assessment.level === 'poor' && 'text-orange-600',
              assessment.level === 'dangerous' && 'text-red-600'
            )}>
              {assessment.score}/10
            </div>
            <div className="text-sm font-medium capitalize">{assessment.level}</div>
          </div>
        </div>

        {/* Overall recommendation */}
        <div className={cn(
          'p-4 rounded-lg border-l-4',
          assessment.level === 'excellent' && 'bg-green-50 border-green-400 text-green-800',
          assessment.level === 'good' && 'bg-blue-50 border-blue-400 text-blue-800',
          assessment.level === 'moderate' && 'bg-yellow-50 border-yellow-400 text-yellow-800',
          assessment.level === 'poor' && 'bg-orange-50 border-orange-400 text-orange-800',
          assessment.level === 'dangerous' && 'bg-red-50 border-red-400 text-red-800'
        )}>
          <p className="font-medium">{assessment.recommendation}</p>
        </div>

        {/* Experience level requirement */}
        <div className="mt-4 flex items-center gap-3">
          <AcademicCapIcon className="w-5 h-5 text-gray-400" />
          <div>
            <span className="text-sm text-gray-600">Required experience: </span>
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full border',
              getExperienceLevelColor(assessment.experienceLevel)
            )}>
              {assessment.experienceLevel.replace('_', ' ')}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-8">
          {getExperienceLevelDescription(assessment.experienceLevel)}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="card p-0">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {activeTab === 'overview' && <OverviewTab assessment={assessment} period={period} />}
          {activeTab === 'risks' && <RiskAssessmentTab assessment={assessment} />}
          {activeTab === 'gear' && <GearGuideTab assessment={assessment} />}
          {activeTab === 'safety' && <SafetyTab assessment={assessment} />}
        </div>
      </div>
    </div>
  )
}

function CompactDashboard({ assessment, period }: { assessment: any; period: WeatherPeriod }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Hiking Assessment</h3>
        <div className={cn(
          'text-2xl font-bold',
          assessment.level === 'excellent' && 'text-green-600',
          assessment.level === 'good' && 'text-blue-600',
          assessment.level === 'moderate' && 'text-yellow-600',
          assessment.level === 'poor' && 'text-orange-600',
          assessment.level === 'dangerous' && 'text-red-600'
        )}>
          {assessment.score}/10
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{assessment.recommendation}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Experience:</span>
          <div className={cn(
            'px-2 py-1 rounded text-xs font-medium mt-1',
            getExperienceLevelColor(assessment.experienceLevel)
          )}>
            {assessment.experienceLevel.replace('_', ' ')}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Risk factors:</span>
          <div className="mt-1">
            {assessment.riskFactors.length} identified
          </div>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ assessment, period }: { assessment: any; period: WeatherPeriod }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{assessment.score}</div>
          <div className="text-sm text-gray-600">Hiking Score</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{assessment.riskFactors.length}</div>
          <div className="text-sm text-gray-600">Risk Factors</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{assessment.gearRecommendations.length}</div>
          <div className="text-sm text-gray-600">Gear Items</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Key Weather Factors</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Wind Speed:</span>
            <span className="font-medium">{period.wind_speed_kph} kph</span>
          </div>
          <div className="flex justify-between">
            <span>Temperature:</span>
            <span className="font-medium">{period.temperature_c}°C</span>
          </div>
          <div className="flex justify-between">
            <span>Precipitation:</span>
            <span className="font-medium">{period.precipitation_mm}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Risk Level:</span>
            <span className={cn(
              'px-2 py-1 text-xs rounded font-medium',
              period.risk_level === 'low' && 'bg-green-100 text-green-800',
              period.risk_level === 'moderate' && 'bg-yellow-100 text-yellow-800',
              period.risk_level === 'high' && 'bg-orange-100 text-orange-800',
              period.risk_level === 'extreme' && 'bg-red-100 text-red-800'
            )}>
              {period.risk_level}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function RiskAssessmentTab({ assessment }: { assessment: any }) {
  return (
    <div className="space-y-4">
      {assessment.riskFactors.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-green-600 font-medium">No significant risks identified</p>
          <p className="text-sm text-gray-600">Current conditions are favorable for hiking</p>
        </div>
      ) : (
        assessment.riskFactors.map((risk: any, index: number) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border-l-4',
              risk.severity === 'extreme' && 'bg-red-50 border-red-400',
              risk.severity === 'high' && 'bg-orange-50 border-orange-400',
              risk.severity === 'moderate' && 'bg-yellow-50 border-yellow-400',
              risk.severity === 'low' && 'bg-blue-50 border-blue-400'
            )}
          >
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                risk.severity === 'extreme' && 'text-red-600',
                risk.severity === 'high' && 'text-orange-600',
                risk.severity === 'moderate' && 'text-yellow-600',
                risk.severity === 'low' && 'text-blue-600'
              )} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium capitalize">{risk.type} Risk</h4>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    risk.severity === 'extreme' && 'bg-red-100 text-red-800',
                    risk.severity === 'high' && 'bg-orange-100 text-orange-800',
                    risk.severity === 'moderate' && 'bg-yellow-100 text-yellow-800',
                    risk.severity === 'low' && 'bg-blue-100 text-blue-800'
                  )}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-sm mb-2">{risk.description}</p>
                <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                  <strong>Mitigation:</strong> {risk.mitigation}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function GearGuideTab({ assessment }: { assessment: any }) {
  return (
    <div className="space-y-4">
      {assessment.gearRecommendations.map((gear: any, index: number) => (
        <div key={index} className="card bg-gray-50">
          <div className="flex items-start gap-3 mb-3">
            <BackpackIcon className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium capitalize">{gear.category}</h4>
                {gear.essential && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    Essential
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{gear.reasoning}</p>
            </div>
          </div>
          
          <div className="ml-8">
            <ul className="space-y-1">
              {gear.items.map((item: string, itemIndex: number) => (
                <li key={itemIndex} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {assessment.gearRecommendations.length === 0 && (
        <div className="text-center py-8">
          <BackpackIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No specific gear recommendations for current conditions</p>
          <p className="text-sm text-gray-500">Standard hiking equipment should be sufficient</p>
        </div>
      )}
    </div>
  )
}

function SafetyTab({ assessment }: { assessment: any }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {assessment.safetyGuidance.map((guidance: string, index: number) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">{guidance}</p>
          </div>
        ))}
      </div>

      {/* Emergency contacts */}
      <div className="card bg-red-50 border-red-200">
        <h4 className="font-medium text-red-800 mb-2">Emergency Contacts</h4>
        <div className="space-y-2 text-sm text-red-700">
          <div className="flex justify-between">
            <span>Mountain Rescue:</span>
            <span className="font-medium">999 (UK Emergency)</span>
          </div>
          <div className="flex justify-between">
            <span>Police Scotland:</span>
            <span className="font-medium">101 (Non-emergency)</span>
          </div>
          <div className="flex justify-between">
            <span>Coastguard:</span>
            <span className="font-medium">999 (Coastal areas)</span>
          </div>
        </div>
      </div>
    </div>
  )
}