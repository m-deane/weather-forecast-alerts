import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CameraIcon,
  CloudIcon,
  EyeIcon,
  ClockIcon,
  LightBulbIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { weatherApi } from '@/api/client'
import { cn } from '@/utils/cn'
import {
  assessPhotographyConditions,
  formatTimeRange,
  getOpportunityColor,
  getOpportunityIcon,
  type PhotographyConditions,
  type PhotographyOpportunity
} from '@/utils/photography'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PhotographyViewpoints } from '@/components/PhotographyViewpoints'

interface PhotographyDashboardProps {
  locationId: string
}

export function PhotographyDashboard({ locationId }: PhotographyDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [expandedSection, setExpandedSection] = useState<string>('overview')

  // Get weather forecast for photography assessment
  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['weather', locationId],
    queryFn: () => weatherApi.getForecast(locationId),
    enabled: !!locationId,
  })

  if (isLoading) {
    return (
      <div className="card">
        <LoadingSkeleton height={200} />
      </div>
    )
  }

  if (error || !forecast) {
    return (
      <div className="card">
        <div className="text-center py-8 text-slate-400">
          <CameraIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Unable to load photography conditions</p>
        </div>
      </div>
    )
  }

  // Get current day's forecast
  const currentDay = forecast.forecasts.find(f => 
    new Date(f.date).toDateString() === selectedDate.toDateString()
  ) || forecast.forecasts[0]

  const currentPeriod = currentDay.periods[0] // Use first period as representative
  
  // Assess photography conditions
  const photographyConditions = assessPhotographyConditions(
    currentPeriod,
    forecast.location,
    selectedDate
  )

  const sections = [
    { id: 'overview', title: 'Overview', icon: CameraIcon },
    { id: 'opportunities', title: 'Opportunities', icon: LightBulbIcon },
    { id: 'timing', title: 'Best Times', icon: ClockIcon },
    { id: 'conditions', title: 'Atmospheric', icon: CloudIcon },
    { id: 'viewpoints', title: 'Viewpoints', icon: MapPinIcon },
  ]

  return (
    <div className="space-y-4">
      {/* Header with date selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CameraIcon className="w-6 h-6" />
            Photography Conditions
          </h2>
          <select
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="text-sm bg-slate-700 border border-slate-600 rounded-md px-3 py-1 text-slate-200"
          >
            {forecast.forecasts.slice(0, 6).map(day => (
              <option key={day.date} value={day.date}>
                {new Date(day.date).toLocaleDateString('en-GB', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </option>
            ))}
          </select>
        </div>

        {/* Overall score */}
        <PhotographyOverview conditions={photographyConditions} location={forecast.location} />
      </div>

      {/* Section navigation */}
      <div className="card p-0">
        <div className="flex border-b border-slate-700">
          {sections.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setExpandedSection(
                  expandedSection === section.id ? 'overview' : section.id
                )}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors',
                  expandedSection === section.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.title}</span>
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {expandedSection === 'overview' && (
            <PhotographyOverview conditions={photographyConditions} location={forecast.location} />
          )}
          {expandedSection === 'opportunities' && (
            <PhotographyOpportunities opportunities={photographyConditions.opportunities} />
          )}
          {expandedSection === 'timing' && (
            <BestTimesSection 
              bestTimes={photographyConditions.bestTimes}
              opportunities={photographyConditions.opportunities}
            />
          )}
          {expandedSection === 'conditions' && (
            <AtmosphericConditions
              conditions={photographyConditions}
              period={currentPeriod}
            />
          )}
          {expandedSection === 'viewpoints' && (
            <PhotographyViewpoints locationId={locationId} />
          )}
        </div>
      </div>
    </div>
  )
}

function PhotographyOverview({ conditions, location }: { 
  conditions: PhotographyConditions
  location: any 
}) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
      case 'good': return 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
      case 'fair': return 'bg-orange-900/50 text-orange-400 border-orange-700'
      case 'poor': return 'bg-red-900/50 text-red-400 border-red-700'
      default: return 'bg-slate-700 text-slate-300 border-slate-600'
    }
  }

  return (
    <div className="space-y-4">
      {/* Score and level */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className={cn('text-3xl font-bold', getScoreColor(conditions.score))}>
            {conditions.score}/10
          </div>
          <div className="text-sm text-slate-400">Photography Score</div>
        </div>
        <div>
          <div className={cn(
            'inline-block px-3 py-1 rounded-full border text-sm font-medium',
            getLevelColor(conditions.level)
          )}>
            {conditions.level.toUpperCase()}
          </div>
          <div className="text-sm text-slate-400 mt-1">Conditions</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-sky-400">
            {conditions.inversionProbability}%
          </div>
          <div className="text-sm text-slate-400">Inversion Chance</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Visibility:</span>
          <span className="font-medium">{conditions.visibilityScore}/10</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Opportunities:</span>
          <span className="font-medium">{conditions.opportunities.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Best Times:</span>
          <span className="font-medium">{conditions.bestTimes.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Elevation:</span>
          <span className="font-medium">{location.elevation_m}m</span>
        </div>
      </div>

      {/* Atmospheric conditions */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <h4 className="font-medium text-sm mb-2 text-slate-200">Atmospheric Conditions</h4>
        <p className="text-sm text-slate-400">{conditions.atmosphericConditions}</p>
      </div>

      {/* Top recommendations */}
      {conditions.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-slate-200">Key Recommendations</h4>
          {conditions.recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <LightBulbIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PhotographyOpportunities({ opportunities }: { opportunities: PhotographyOpportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-8">
        <CameraIcon className="w-12 h-12 text-slate-500 mx-auto mb-2" />
        <h4 className="font-medium text-slate-300 mb-1">Limited Opportunities</h4>
        <p className="text-sm text-slate-400">Current conditions may not be ideal for photography</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opportunity, index) => (
        <div
          key={index}
          className={cn(
            'p-4 rounded-lg border',
            getOpportunityColor(opportunity.type)
          )}
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{getOpportunityIcon(opportunity.type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium capitalize">
                  {opportunity.type.replace('_', ' ')}
                </h4>
                <span className="text-xs bg-slate-800/60 px-2 py-1 rounded-full">
                  {opportunity.probability}% chance
                </span>
              </div>
              <p className="text-sm mb-2">{opportunity.description}</p>
              <div className="text-xs opacity-75">
                {formatTimeRange(opportunity.timeWindow.start, opportunity.timeWindow.end)}
              </div>
            </div>
          </div>
          
          {opportunity.tips.length > 0 && (
            <div className="bg-slate-800/60 p-3 rounded-md">
              <h5 className="font-medium text-sm mb-2 text-slate-200">Photography Tips:</h5>
              <ul className="text-sm space-y-1 text-slate-300">
                {opportunity.tips.map((tip, tipIndex) => (
                  <li key={tipIndex} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function BestTimesSection({ 
  bestTimes, 
  opportunities 
}: { 
  bestTimes: Date[]
  opportunities: PhotographyOpportunity[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {bestTimes.map((time, index) => {
          // Find related opportunities for this time
          const relatedOpportunities = opportunities.filter(opp => 
            time >= opp.timeWindow.start && time <= opp.timeWindow.end
          )

          return (
            <div key={index} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg bg-slate-800/30">
              <div>
                <div className="font-medium text-slate-200">
                  {time.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="text-sm text-slate-400">
                  {relatedOpportunities.length > 0
                    ? relatedOpportunities.map(opp => opp.type.replace('_', ' ')).join(', ')
                    : 'Optimal timing'
                  }
                </div>
              </div>
              <div className="flex gap-1">
                {relatedOpportunities.map((opp, oppIndex) => (
                  <span key={oppIndex} className="text-lg">
                    {getOpportunityIcon(opp.type)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {bestTimes.length === 0 && (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No optimal times identified for current conditions</p>
        </div>
      )}
    </div>
  )
}

function AtmosphericConditions({ 
  conditions, 
  period 
}: { 
  conditions: PhotographyConditions
  period: any
}) {
  return (
    <div className="space-y-4">
      {/* Visibility details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-slate-200">
              <EyeIcon className="w-4 h-4" />
              Visibility
            </h4>
            <div className="text-lg font-semibold text-slate-100">{conditions.visibilityScore}/10</div>
            <div className="text-sm text-slate-400">
              {period.visibility_m ? `${(period.visibility_m / 1000).toFixed(1)}km` : 'Unknown'}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2 text-slate-200">Wind Conditions</h4>
            <div className="text-lg font-semibold text-slate-100">{period.wind_speed_kph} km/h</div>
            <div className="text-sm text-slate-400">{period.wind_direction}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-slate-200">
              <CloudIcon className="w-4 h-4" />
              Cloud Inversion
            </h4>
            <div className="text-lg font-semibold text-slate-100">{conditions.inversionProbability}%</div>
            <div className="text-sm text-slate-400">
              {conditions.inversionProbability > 50 ? 'Likely' :
               conditions.inversionProbability > 30 ? 'Possible' : 'Unlikely'}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2 text-slate-200">Precipitation</h4>
            <div className="text-lg font-semibold text-slate-100">{period.precipitation_mm || 0}mm</div>
            <div className="text-sm text-slate-400">
              {period.precipitation_mm > 0 ? 'Active' : 'Dry conditions'}
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric description */}
      <div className="bg-sky-900/30 p-4 rounded-lg border border-sky-700">
        <h4 className="font-medium text-sky-300 mb-2">Current Conditions</h4>
        <p className="text-sm text-sky-200">{conditions.atmosphericConditions}</p>
      </div>

      {/* All recommendations */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-slate-200">All Recommendations</h4>
        {conditions.recommendations.map((rec, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <LightBulbIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <span className="text-slate-300">{rec}</span>
          </div>
        ))}
      </div>
    </div>
  )
}