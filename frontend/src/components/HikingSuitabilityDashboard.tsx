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
      <div className="card border-danger-700/50 bg-danger-900/20 fade-in">
        <div className="flex items-center gap-2 text-danger-400">
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
      <div className="card fade-in">
        <p className="text-slate-500">No weather data available for assessment</p>
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
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Hiking Suitability Assessment</h2>
            <p className="text-sm text-slate-500">{location.name} • Current conditions</p>
          </div>
          <div className="text-center">
            {/* Score gauge */}
            <div className="score-gauge mx-auto mb-2" style={{ '--score-value': `${assessment.score * 10}%` } as React.CSSProperties}>
              <div className={cn(
                'score-gauge-fill',
                assessment.level === 'excellent' && 'bg-emerald-500',
                assessment.level === 'good' && 'bg-emerald-400',
                assessment.level === 'moderate' && 'bg-amber-400',
                assessment.level === 'poor' && 'bg-orange-500',
                assessment.level === 'dangerous' && 'bg-red-500'
              )} />
              <div className="score-gauge-marker" />
            </div>
            <div className={cn(
              'text-3xl font-bold mb-1 mono-nums',
              assessment.level === 'excellent' && 'text-emerald-400',
              assessment.level === 'good' && 'text-emerald-300',
              assessment.level === 'moderate' && 'text-amber-400',
              assessment.level === 'poor' && 'text-orange-400',
              assessment.level === 'dangerous' && 'text-red-400'
            )}>
              {assessment.score}/10
            </div>
            <div className="text-sm font-medium capitalize text-slate-300">{assessment.level}</div>
          </div>
        </div>

        {/* Overall recommendation */}
        <div className={cn(
          'p-4 rounded-xl border-l-4 transition-all duration-200',
          assessment.level === 'excellent' && 'bg-emerald-900/20 border-emerald-400 text-emerald-300',
          assessment.level === 'good' && 'bg-emerald-900/15 border-emerald-500 text-emerald-200',
          assessment.level === 'moderate' && 'bg-amber-900/20 border-amber-400 text-amber-300',
          assessment.level === 'poor' && 'bg-orange-900/20 border-orange-400 text-orange-300',
          assessment.level === 'dangerous' && 'bg-red-900/20 border-red-400 text-red-300'
        )}>
          <p className="font-medium">{assessment.recommendation}</p>
        </div>

        {/* Experience level requirement */}
        <div className="mt-4 flex items-center gap-3">
          <AcademicCapIcon className="w-5 h-5 text-slate-500" />
          <div>
            <span className="text-sm text-slate-400">Required experience: </span>
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full border',
              getExperienceLevelColor(assessment.experienceLevel)
            )}>
              {assessment.experienceLevel.replace('_', ' ')}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1 ml-8">
          {getExperienceLevelDescription(assessment.experienceLevel)}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-slate-700/50">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CompactDashboard({ assessment, period: _period }: { assessment: any; period: WeatherPeriod }) {
  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-100">Hiking Assessment</h3>
        <div className={cn(
          'text-2xl font-bold mono-nums',
          assessment.level === 'excellent' && 'text-emerald-400',
          assessment.level === 'good' && 'text-emerald-300',
          assessment.level === 'moderate' && 'text-amber-400',
          assessment.level === 'poor' && 'text-orange-400',
          assessment.level === 'dangerous' && 'text-red-400'
        )}>
          {assessment.score}/10
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-3">{assessment.recommendation}</p>

      <div className="grid grid-cols-2 gap-2 text-xs data-grid">
        <div className="data-cell">
          <span className="data-cell-label">Experience:</span>
          <div className={cn(
            'px-2 py-1 rounded text-xs font-medium mt-1',
            getExperienceLevelColor(assessment.experienceLevel)
          )}>
            {assessment.experienceLevel.replace('_', ' ')}
          </div>
        </div>
        <div className="data-cell">
          <span className="data-cell-label">Risk factors:</span>
          <div className="data-cell-value mt-1 mono-nums">
            {assessment.riskFactors.length} identified
          </div>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ assessment, period }: { assessment: any; period: WeatherPeriod }) {
  return (
    <div className="space-y-4 stagger-children">
      <div className="data-grid">
        <div className="data-cell text-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <div className="text-2xl font-bold text-emerald-400 mono-nums">{assessment.score}</div>
          <div className="text-sm text-slate-400">Hiking Score</div>
        </div>
        <div className="data-cell text-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <div className="text-2xl font-bold text-orange-400 mono-nums">{assessment.riskFactors.length}</div>
          <div className="text-sm text-slate-400">Risk Factors</div>
        </div>
        <div className="data-cell text-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <div className="text-2xl font-bold text-blue-400 mono-nums">{assessment.gearRecommendations.length}</div>
          <div className="text-sm text-slate-400">Gear Items</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2 text-slate-200">Key Weather Factors</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between items-center p-2 bg-slate-700/20 rounded-lg">
            <span className="text-slate-400">Wind Speed:</span>
            <span className="font-medium text-slate-200 mono-nums">{period.wind_speed_kph} kph</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-700/20 rounded-lg">
            <span className="text-slate-400">Temperature:</span>
            <span className="font-medium text-slate-200 mono-nums">{period.temperature_c}°C</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-700/20 rounded-lg">
            <span className="text-slate-400">Precipitation:</span>
            <span className="font-medium text-slate-200 mono-nums">{period.precipitation_mm}mm</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-700/20 rounded-lg">
            <span className="text-slate-400">Risk Level:</span>
            <span className={cn(
              'px-2 py-1 text-xs rounded-full font-medium border',
              period.risk_level === 'low' && 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50',
              period.risk_level === 'moderate' && 'bg-amber-900/30 text-amber-400 border-amber-700/50',
              period.risk_level === 'high' && 'bg-orange-900/30 text-orange-400 border-orange-700/50',
              period.risk_level === 'extreme' && 'bg-red-900/30 text-red-400 border-red-700/50'
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
    <div className="space-y-4 stagger-children">
      {assessment.riskFactors.length === 0 ? (
        <div className="text-center py-8 fade-in-scale">
          <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-400 font-medium">No significant risks identified</p>
          <p className="text-sm text-slate-400">Current conditions are favorable for hiking</p>
        </div>
      ) : (
        assessment.riskFactors.map((risk: any, index: number) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-xl border-l-4 transition-all duration-200',
              risk.severity === 'extreme' && 'bg-red-900/20 border-red-400',
              risk.severity === 'high' && 'bg-orange-900/20 border-orange-400',
              risk.severity === 'moderate' && 'bg-amber-900/20 border-amber-400',
              risk.severity === 'low' && 'bg-blue-900/20 border-blue-400'
            )}
          >
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                risk.severity === 'extreme' && 'text-red-400',
                risk.severity === 'high' && 'text-orange-400',
                risk.severity === 'moderate' && 'text-amber-400',
                risk.severity === 'low' && 'text-blue-400'
              )} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium capitalize text-slate-200">{risk.type} Risk</h4>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full border',
                    risk.severity === 'extreme' && 'bg-red-900/30 text-red-400 border-red-700/50',
                    risk.severity === 'high' && 'bg-orange-900/30 text-orange-400 border-orange-700/50',
                    risk.severity === 'moderate' && 'bg-amber-900/30 text-amber-400 border-amber-700/50',
                    risk.severity === 'low' && 'bg-blue-900/30 text-blue-400 border-blue-700/50'
                  )}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-sm mb-2 text-slate-300">{risk.description}</p>
                <div className="text-xs bg-slate-700/50 p-2 rounded-lg text-slate-400">
                  <strong className="text-slate-300">Mitigation:</strong> {risk.mitigation}
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
    <div className="space-y-4 stagger-children">
      {assessment.gearRecommendations.map((gear: any, index: number) => (
        <div key={index} className="card bg-slate-700/30 border-slate-600/30">
          <div className="flex items-start gap-3 mb-3">
            <BackpackIcon className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium capitalize text-slate-200">{gear.category}</h4>
                {gear.essential && (
                  <span className="bg-red-900/30 text-red-400 text-xs px-2 py-1 rounded-full border border-red-700/50">
                    Essential
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-2">{gear.reasoning}</p>
            </div>
          </div>

          <div className="ml-8">
            <ul className="space-y-1">
              {gear.items.map((item: string, itemIndex: number) => (
                <li key={itemIndex} className="flex items-center gap-2 text-sm text-slate-300">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {assessment.gearRecommendations.length === 0 && (
        <div className="text-center py-8 fade-in-scale">
          <BackpackIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">No specific gear recommendations for current conditions</p>
          <p className="text-sm text-slate-500">Standard hiking equipment should be sufficient</p>
        </div>
      )}
    </div>
  )
}

function SafetyTab({ assessment }: { assessment: any }) {
  return (
    <div className="space-y-4 stagger-children">
      <div className="space-y-3">
        {assessment.safetyGuidance.map((guidance: string, index: number) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-xl border border-blue-700/30">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-200">{guidance}</p>
          </div>
        ))}
      </div>

      {/* Emergency contacts */}
      <div className="card bg-red-900/20 border-red-700/50">
        <h4 className="font-medium text-red-400 mb-3">Emergency Contacts</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-red-900/20 rounded-lg">
            <span className="text-red-300">Mountain Rescue:</span>
            <span className="font-medium text-red-200 mono-nums">999 (UK Emergency)</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-red-900/20 rounded-lg">
            <span className="text-red-300">Police Scotland:</span>
            <span className="font-medium text-red-200 mono-nums">101 (Non-emergency)</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-red-900/20 rounded-lg">
            <span className="text-red-300">Coastguard:</span>
            <span className="font-medium text-red-200 mono-nums">999 (Coastal areas)</span>
          </div>
        </div>
      </div>
    </div>
  )
}