import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  CameraIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  EyeIcon,
  ClockIcon,
  LightBulbIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { weatherApi } from '@/api/client'
import { cn } from '@/utils/cn'
import { 
  assessPhotographyConditions, 
  formatTimeRange,
  getOpportunityColor,
  getOpportunityIcon,
  type PhotographyConditions,
  type PhotographyOpportunity,
  type SunTimes,
  type MoonInfo
} from '@/utils/photography'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

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
        <div className="text-center py-8 text-gray-500">
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
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
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
        <div className="flex border-b border-gray-200">
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
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700'
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
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'good': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'fair': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'poor': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
          <div className="text-sm text-gray-500">Photography Score</div>
        </div>
        <div>
          <div className={cn(
            'inline-block px-3 py-1 rounded-full border text-sm font-medium',
            getLevelColor(conditions.level)
          )}>
            {conditions.level.toUpperCase()}
          </div>
          <div className="text-sm text-gray-500 mt-1">Conditions</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-blue-600">
            {conditions.inversionProbability}%
          </div>
          <div className="text-sm text-gray-500">Inversion Chance</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Visibility:</span>
          <span className="font-medium">{conditions.visibilityScore}/10</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Opportunities:</span>
          <span className="font-medium">{conditions.opportunities.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Best Times:</span>
          <span className="font-medium">{conditions.bestTimes.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Elevation:</span>
          <span className="font-medium">{location.elevation_m}m</span>
        </div>
      </div>

      {/* Atmospheric conditions */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Atmospheric Conditions</h4>
        <p className="text-sm text-gray-600">{conditions.atmosphericConditions}</p>
      </div>

      {/* Top recommendations */}
      {conditions.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Key Recommendations</h4>
          {conditions.recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <LightBulbIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{rec}</span>
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
        <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <h4 className="font-medium text-gray-600 mb-1">Limited Opportunities</h4>
        <p className="text-sm text-gray-500">Current conditions may not be ideal for photography</p>
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
                <span className="text-xs bg-white bg-opacity-60 px-2 py-1 rounded-full">
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
            <div className="bg-white bg-opacity-60 p-3 rounded-md">
              <h5 className="font-medium text-sm mb-2">Photography Tips:</h5>
              <ul className="text-sm space-y-1">
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
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium">
                  {time.toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-sm text-gray-500">
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
          <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No optimal times identified for current conditions</p>
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
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <EyeIcon className="w-4 h-4" />
              Visibility
            </h4>
            <div className="text-lg font-semibold">{conditions.visibilityScore}/10</div>
            <div className="text-sm text-gray-600">
              {period.visibility_m ? `${(period.visibility_m / 1000).toFixed(1)}km` : 'Unknown'}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Wind Conditions</h4>
            <div className="text-lg font-semibold">{period.wind_speed_kph} km/h</div>
            <div className="text-sm text-gray-600">{period.wind_direction}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <CloudIcon className="w-4 h-4" />
              Cloud Inversion
            </h4>
            <div className="text-lg font-semibold">{conditions.inversionProbability}%</div>
            <div className="text-sm text-gray-600">
              {conditions.inversionProbability > 50 ? 'Likely' :
               conditions.inversionProbability > 30 ? 'Possible' : 'Unlikely'}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Precipitation</h4>
            <div className="text-lg font-semibold">{period.precipitation_mm || 0}mm</div>
            <div className="text-sm text-gray-600">
              {period.precipitation_mm > 0 ? 'Active' : 'Dry conditions'}
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric description */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Current Conditions</h4>
        <p className="text-sm text-blue-700">{conditions.atmosphericConditions}</p>
      </div>

      {/* All recommendations */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">All Recommendations</h4>
        {conditions.recommendations.map((rec, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <LightBulbIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{rec}</span>
          </div>
        ))}
      </div>
    </div>
  )
}