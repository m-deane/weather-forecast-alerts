import { useState } from 'react'
import { cn } from '@/utils/cn'
import { 
  CheckIcon, 
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { GearRecommendation } from '@/utils/hiking'

interface GearRecommendationCardProps {
  recommendations: GearRecommendation[]
  onItemCheck?: (category: string, item: string, checked: boolean) => void
  checkedItems?: Record<string, boolean>
  compact?: boolean
}

interface GearItem {
  name: string
  description: string
  alternatives?: string[]
  importance: 'essential' | 'recommended' | 'optional'
}

const GEAR_DETAILS: Record<string, GearItem> = {
  // Clothing
  'Insulating layers': {
    name: 'Insulating Layers',
    description: 'Fleece, down jacket, or synthetic insulation for warmth',
    alternatives: ['Merino wool layers', 'Synthetic fleece', 'Down vest'],
    importance: 'essential'
  },
  'Waterproof jacket': {
    name: 'Waterproof Jacket',
    description: 'Breathable waterproof shell with hood',
    alternatives: ['Gore-Tex jacket', 'eVent jacket', 'Emergency poncho'],
    importance: 'essential'
  },
  'Waterproof trousers': {
    name: 'Waterproof Trousers',
    description: 'Full leg protection from rain and snow',
    alternatives: ['Waterproof overtrousers', 'Softshell pants', 'Rain chaps'],
    importance: 'recommended'
  },
  'Warm hat': {
    name: 'Warm Hat',
    description: 'Insulated beanie or fleece hat',
    alternatives: ['Wool beanie', 'Fleece hat', 'Balaclava'],
    importance: 'essential'
  },
  'Insulated gloves': {
    name: 'Insulated Gloves',
    description: 'Waterproof insulated gloves or mittens',
    alternatives: ['Liner gloves + shells', 'Mittens', 'Heated gloves'],
    importance: 'essential'
  },

  // Navigation
  'GPS device': {
    name: 'GPS Device',
    description: 'Handheld GPS or smartphone with offline maps',
    alternatives: ['Smartphone with offline maps', 'Handheld GPS', 'GPS watch'],
    importance: 'essential'
  },
  'Compass': {
    name: 'Compass',
    description: 'Silva or equivalent orienteering compass',
    alternatives: ['Silva compass', 'Suunto compass', 'Baseplate compass'],
    importance: 'essential'
  },
  'Map': {
    name: 'Topographic Map',
    description: 'Current OS Landranger or Explorer map',
    alternatives: ['OS Explorer 1:25,000', 'OS Landranger 1:50,000', 'Harvey Maps'],
    importance: 'essential'
  },
  'Headtorch': {
    name: 'Headtorch',
    description: 'LED headlamp with red light option',
    alternatives: ['LED headlamp', 'Hand torch backup', 'Emergency headtorch'],
    importance: 'essential'
  },

  // Emergency
  'Emergency shelter': {
    name: 'Emergency Shelter',
    description: 'Lightweight bivi bag or emergency shelter',
    alternatives: ['Bivi bag', 'Emergency tent', 'Space blanket'],
    importance: 'essential'
  },
  'First aid kit': {
    name: 'First Aid Kit',
    description: 'Basic medical supplies for common injuries',
    alternatives: ['Pre-made mountain kit', 'Custom kit', 'Blister kit'],
    importance: 'essential'
  },
  'Whistle': {
    name: 'Emergency Whistle',
    description: 'Loud whistle for emergency signaling',
    alternatives: ['Pealess whistle', 'Traditional whistle', 'Multi-tool whistle'],
    importance: 'recommended'
  },

  // Protection
  'Microspikes/crampons': {
    name: 'Traction Devices',
    description: 'Microspikes or crampons for icy conditions',
    alternatives: ['Microspikes', '10-point crampons', 'Yaktrax'],
    importance: 'essential'
  },
  'Walking poles': {
    name: 'Walking Poles',
    description: 'Adjustable trekking poles for stability',
    alternatives: ['Carbon fiber poles', 'Aluminum poles', 'Single pole'],
    importance: 'recommended'
  },
  'Gaiters': {
    name: 'Gaiters',
    description: 'Leg protection from snow and debris',
    alternatives: ['Short gaiters', 'Full gaiters', 'Waterproof socks'],
    importance: 'recommended'
  }
}

export function GearRecommendationCard({ 
  recommendations, 
  onItemCheck,
  checkedItems = {},
  compact = false 
}: GearRecommendationCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  if (recommendations.length === 0) {
    return (
      <div className="card text-center py-8">
        <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="font-medium text-green-600 mb-1">No Special Gear Required</h3>
        <p className="text-sm text-gray-600">Standard hiking equipment should be sufficient for current conditions</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3">Essential Gear</h3>
        <div className="space-y-2">
          {recommendations
            .filter(rec => rec.essential)
            .map((rec, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium capitalize">{rec.category}:</span>{' '}
                {rec.items.slice(0, 2).join(', ')}
                {rec.items.length > 2 && ` +${rec.items.length - 2} more`}
              </div>
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation, index) => (
        <div key={index} className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              recommendation.essential 
                ? 'bg-red-100 text-red-600' 
                : 'bg-blue-100 text-blue-600'
            )}>
              {recommendation.essential ? (
                <ExclamationTriangleIcon className="w-5 h-5" />
              ) : (
                <InformationCircleIcon className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold capitalize">{recommendation.category}</h4>
                {recommendation.essential && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    Essential
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{recommendation.reasoning}</p>
            </div>
          </div>

          <div className="space-y-3">
            {recommendation.items.map((item, itemIndex) => {
              const gearDetail = GEAR_DETAILS[item]
              const itemKey = `${recommendation.category}-${item}`
              const isChecked = checkedItems[itemKey] || false

              return (
                <div key={itemIndex} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    {onItemCheck && (
                      <button
                        onClick={() => onItemCheck(recommendation.category, item, !isChecked)}
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5',
                          isChecked 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-green-400'
                        )}
                      >
                        {isChecked && <CheckIcon className="w-3 h-3" />}
                      </button>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{gearDetail?.name || item}</h5>
                        {gearDetail?.importance === 'essential' && (
                          <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">
                            Essential
                          </span>
                        )}
                      </div>
                      
                      {gearDetail?.description && (
                        <p className="text-sm text-gray-600 mb-2">{gearDetail.description}</p>
                      )}
                      
                      {gearDetail?.alternatives && (
                        <button
                          onClick={() => setExpandedCategory(
                            expandedCategory === itemKey ? null : itemKey
                          )}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          {expandedCategory === itemKey ? 'Hide' : 'Show'} alternatives
                        </button>
                      )}
                      
                      {expandedCategory === itemKey && gearDetail?.alternatives && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Alternatives:</span>
                          <ul className="ml-2 mt-1">
                            {gearDetail.alternatives.map((alt, altIndex) => (
                              <li key={altIndex}>• {alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Gear summary */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Gear Checklist Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-600">Essential items:</span>
            <div className="font-medium">
              {recommendations.filter(r => r.essential).reduce((sum, r) => sum + r.items.length, 0)}
            </div>
          </div>
          <div>
            <span className="text-blue-600">Total recommendations:</span>
            <div className="font-medium">
              {recommendations.reduce((sum, r) => sum + r.items.length, 0)}
            </div>
          </div>
        </div>
        
        {onItemCheck && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600">Packed:</span>
              <span className="font-medium">
                {Object.values(checkedItems).filter(Boolean).length} / {recommendations.reduce((sum, r) => sum + r.items.length, 0)}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ 
                  width: `${(Object.values(checkedItems).filter(Boolean).length / recommendations.reduce((sum, r) => sum + r.items.length, 0)) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}