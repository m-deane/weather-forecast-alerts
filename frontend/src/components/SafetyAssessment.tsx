import { useState } from 'react'
import { cn } from '@/utils/cn'
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MapIcon,
  ClockIcon,
  UserGroupIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import type { RiskFactor } from '@/utils/hiking'

interface SafetyAssessmentProps {
  riskFactors: RiskFactor[]
  safetyGuidance: string[]
  locationName: string
  experienceLevel: string
}

interface SafetyChecklist {
  id: string
  category: 'preparation' | 'navigation' | 'communication' | 'emergency'
  item: string
  description: string
  mandatory: boolean
}

const SAFETY_CHECKLIST: SafetyChecklist[] = [
  // Preparation
  {
    id: 'weather-check',
    category: 'preparation',
    item: 'Check latest weather forecast',
    description: 'Verify conditions before departure and monitor for changes',
    mandatory: true
  },
  {
    id: 'route-plan',
    category: 'preparation',
    item: 'Plan route and alternatives',
    description: 'Have a clear route plan with escape routes identified',
    mandatory: true
  },
  {
    id: 'gear-check',
    category: 'preparation',
    item: 'Check all gear and equipment',
    description: 'Ensure all equipment is functional and appropriate',
    mandatory: true
  },
  {
    id: 'fitness-assessment',
    category: 'preparation',
    item: 'Assess group fitness and experience',
    description: 'Ensure route is within capabilities of all group members',
    mandatory: true
  },

  // Navigation
  {
    id: 'map-compass',
    category: 'navigation',
    item: 'Carry map and compass',
    description: 'Physical backup for electronic navigation',
    mandatory: true
  },
  {
    id: 'gps-device',
    category: 'navigation',
    item: 'GPS device or smartphone with offline maps',
    description: 'Primary navigation tool with offline capability',
    mandatory: true
  },
  {
    id: 'navigation-skills',
    category: 'navigation',
    item: 'Know how to use navigation equipment',
    description: 'Practice navigation skills before heading out',
    mandatory: true
  },

  // Communication
  {
    id: 'tell-someone',
    category: 'communication',
    item: 'Tell someone your plans',
    description: 'Leave detailed route plan and expected return time',
    mandatory: true
  },
  {
    id: 'emergency-contacts',
    category: 'communication',
    item: 'Carry emergency contact numbers',
    description: 'Have rescue services and emergency contacts available',
    mandatory: true
  },
  {
    id: 'phone-backup',
    category: 'communication',
    item: 'Phone with backup power',
    description: 'Portable charger or power bank for emergency calls',
    mandatory: false
  },

  // Emergency
  {
    id: 'first-aid',
    category: 'emergency',
    item: 'Carry first aid kit',
    description: 'Basic medical supplies for treating injuries',
    mandatory: true
  },
  {
    id: 'emergency-shelter',
    category: 'emergency',
    item: 'Emergency shelter',
    description: 'Bivi bag or emergency shelter for unexpected overnight',
    mandatory: true
  },
  {
    id: 'whistle',
    category: 'emergency',
    item: 'Emergency whistle',
    description: 'For signaling in case of emergency',
    mandatory: false
  },
  {
    id: 'headtorch',
    category: 'emergency',
    item: 'Headtorch with spare batteries',
    description: 'Essential if benighted or for early/late travel',
    mandatory: true
  }
]

export function SafetyAssessment({ 
  riskFactors, 
  safetyGuidance, 
  locationName,
  experienceLevel 
}: SafetyAssessmentProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [expandedSection, setExpandedSection] = useState<string | null>('risks')

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked
    }))
  }

  const getOverallRiskLevel = () => {
    if (riskFactors.some(r => r.severity === 'extreme')) return 'extreme'
    if (riskFactors.some(r => r.severity === 'high')) return 'high'
    if (riskFactors.some(r => r.severity === 'moderate')) return 'moderate'
    return 'low'
  }

  const overallRisk = getOverallRiskLevel()
  const mandatoryItems = SAFETY_CHECKLIST.filter(item => item.mandatory)
  const checkedMandatory = mandatoryItems.filter(item => checkedItems[item.id]).length
  const safetyScore = Math.round((checkedMandatory / mandatoryItems.length) * 100)

  const sections = [
    { id: 'risks', title: 'Risk Assessment', icon: ExclamationTriangleIcon },
    { id: 'guidance', title: 'Safety Guidance', icon: LightBulbIcon },
    { id: 'checklist', title: 'Safety Checklist', icon: ShieldCheckIcon },
    { id: 'emergency', title: 'Emergency Info', icon: PhoneIcon },
  ]

  return (
    <div className="space-y-4">
      {/* Overall risk summary */}
      <div className={cn(
        'card border-l-4',
        overallRisk === 'extreme' && 'bg-red-50 border-red-500',
        overallRisk === 'high' && 'bg-orange-50 border-orange-500',
        overallRisk === 'moderate' && 'bg-yellow-50 border-yellow-500',
        overallRisk === 'low' && 'bg-green-50 border-green-500'
      )}>
        <div className="flex items-center gap-3 mb-3">
          <ExclamationTriangleIcon className={cn(
            'w-6 h-6',
            overallRisk === 'extreme' && 'text-red-600',
            overallRisk === 'high' && 'text-orange-600',
            overallRisk === 'moderate' && 'text-yellow-600',
            overallRisk === 'low' && 'text-green-600'
          )} />
          <div>
            <h3 className="font-semibold">Overall Risk Level: {overallRisk.toUpperCase()}</h3>
            <p className="text-sm opacity-75">{locationName} • Required experience: {experienceLevel.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold">{riskFactors.length}</div>
            <div className="opacity-75">Risk Factors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{safetyScore}%</div>
            <div className="opacity-75">Safety Prep</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{safetyGuidance.length}</div>
            <div className="opacity-75">Guidance Items</div>
          </div>
        </div>
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
                  expandedSection === section.id ? null : section.id
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
          {expandedSection === 'risks' && (
            <RiskFactorsSection riskFactors={riskFactors} />
          )}
          {expandedSection === 'guidance' && (
            <SafetyGuidanceSection guidance={safetyGuidance} />
          )}
          {expandedSection === 'checklist' && (
            <SafetyChecklistSection 
              checkedItems={checkedItems}
              onItemCheck={handleItemCheck}
              safetyScore={safetyScore}
            />
          )}
          {expandedSection === 'emergency' && (
            <EmergencyInfoSection locationName={locationName} />
          )}
        </div>
      </div>
    </div>
  )
}

function RiskFactorsSection({ riskFactors }: { riskFactors: RiskFactor[] }) {
  if (riskFactors.length === 0) {
    return (
      <div className="text-center py-8">
        <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h4 className="font-medium text-green-600 mb-1">Low Risk Conditions</h4>
        <p className="text-sm text-gray-600">No significant risks identified for current conditions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {riskFactors.map((risk, index) => (
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
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-medium capitalize">{risk.type} Risk</h5>
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
              <p className="text-sm mb-3">{risk.description}</p>
              <div className="bg-white bg-opacity-60 p-3 rounded-md">
                <h6 className="font-medium text-sm mb-1">Mitigation Strategy:</h6>
                <p className="text-sm">{risk.mitigation}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SafetyGuidanceSection({ guidance }: { guidance: string[] }) {
  return (
    <div className="space-y-3">
      {guidance.map((item, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <LightBulbIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">{item}</p>
        </div>
      ))}
    </div>
  )
}

function SafetyChecklistSection({ 
  checkedItems, 
  onItemCheck, 
  safetyScore 
}: { 
  checkedItems: Record<string, boolean>
  onItemCheck: (id: string, checked: boolean) => void
  safetyScore: number
}) {
  const categories = ['preparation', 'navigation', 'communication', 'emergency'] as const
  
  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Safety Preparation</span>
          <span className="text-sm text-gray-600">{safetyScore}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={cn(
              'h-2 rounded-full transition-all',
              safetyScore >= 80 ? 'bg-green-500' :
              safetyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${safetyScore}%` }}
          />
        </div>
      </div>

      {categories.map(category => {
        const categoryItems = SAFETY_CHECKLIST.filter(item => item.category === category)
        const checkedCount = categoryItems.filter(item => checkedItems[item.id]).length
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium capitalize">{category}</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {checkedCount}/{categoryItems.length}
              </span>
            </div>
            
            {categoryItems.map(item => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedItems[item.id] || false}
                  onChange={(e) => onItemCheck(item.id, e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{item.item}</span>
                    {item.mandatory && (
                      <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </label>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function EmergencyInfoSection({ locationName }: { locationName: string }) {
  return (
    <div className="space-y-4">
      {/* Emergency contacts */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
          <PhoneIcon className="w-5 h-5" />
          Emergency Contacts
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-red-700">Emergency Services:</span>
            <a href="tel:999" className="font-medium text-red-800 hover:underline">999</a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-700">Police Scotland:</span>
            <a href="tel:101" className="font-medium text-red-800 hover:underline">101</a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-700">Mountain Rescue:</span>
            <span className="font-medium text-red-800">999 (ask for Mountain Rescue)</span>
          </div>
        </div>
      </div>

      {/* Location-specific information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          Location Information
        </h4>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>Location:</span>
            <span className="font-medium">{locationName}</span>
          </div>
          <div className="flex justify-between">
            <span>Grid Reference:</span>
            <span className="font-medium">Available on OS Map</span>
          </div>
          <div className="flex justify-between">
            <span>What3Words:</span>
            <span className="font-medium">Check smartphone app</span>
          </div>
        </div>
      </div>

      {/* Emergency procedures */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-3">Emergency Procedures</h4>
        <div className="space-y-2 text-sm text-yellow-700">
          <div className="flex items-start gap-2">
            <span className="font-medium">1.</span>
            <span>Ensure immediate safety of all group members</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">2.</span>
            <span>Assess injuries and provide first aid</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">3.</span>
            <span>Call 999 and ask for Mountain Rescue</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">4.</span>
            <span>Provide exact location (grid reference/what3words)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">5.</span>
            <span>Stay warm and visible while awaiting rescue</span>
          </div>
        </div>
      </div>
    </div>
  )
}