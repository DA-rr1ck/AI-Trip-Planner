import React, { useState } from 'react'
import { Navigation, Clock, ArrowDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

function RouteSegment({ segment, detailedSteps }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!segment) {
    // Show loading placeholder
    return (
      <div className='flex items-center justify-center my-3'>
        <div className='bg-gray-100 border-2 border-gray-200 rounded-lg px-4 py-3 inline-flex items-center gap-3 shadow-sm'>
          <Loader2 className='h-4 w-4 text-gray-400 animate-spin' />
          <span className='text-sm text-gray-500'>Calculating route...</span>
        </div>
      </div>
    )
  }

  const getModeIcon = () => {
    if (segment.mode === 'car') return '🚗'
    if (segment.mode === 'bike') return '🚴'
    return '🚶'
  }

  const getModeColor = () => {
    if (segment.mode === 'car') return 'indigo'
    if (segment.mode === 'bike') return 'green'
    return 'amber'
  }

  const getModeLabel = () => {
    if (segment.mode === 'car') return 'driving'
    if (segment.mode === 'bike') return 'cycling'
    return 'walking'
  }

  // Use inline styles to avoid Tailwind purging dynamic classes
  const bgColorMap = {
    indigo: '#EEF2FF',
    green: '#F0FDF4',
    amber: '#FFFBEB'
  }

  const borderColorMap = {
    indigo: '#C7D2FE',
    green: '#BBF7D0',
    amber: '#FDE68A'
  }

  const textColorMap = {
    indigo: '#4F46E5',
    green: '#10B981',
    amber: '#F59E0B'
  }

  const modeColor = getModeColor()

  return (
    <div className='my-3'>
      {/* Main Route Summary */}
      <div className='flex items-center justify-center'>
        <div 
          className='border-2 rounded-lg px-4 py-3 inline-flex items-center gap-3 shadow-sm'
          style={{
            backgroundColor: bgColorMap[modeColor],
            borderColor: borderColorMap[modeColor]
          }}
        >
          <ArrowDown 
            className='h-4 w-4' 
            style={{ color: textColorMap[modeColor] }}
          />
          
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1'>
              <Navigation className='h-3 w-3 text-gray-600' />
              <span className='text-sm font-semibold'>{segment.distance} km</span>
            </div>
            
            <div className='flex items-center gap-1'>
              <Clock className='h-3 w-3 text-gray-600' />
              <span className='text-sm font-semibold'>{segment.duration} min</span>
            </div>
            
            <span className='text-lg'>{getModeIcon()}</span>
          </div>
        </div>
      </div>

      {/* Show/Hide Detailed Instructions Button */}
      {detailedSteps && detailedSteps.length > 0 && (
        <div className='flex justify-center mt-2'>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className='text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors'
          >
            {showDetails ? (
              <>
                Hide Directions <ChevronUp className='h-3 w-3' />
              </>
            ) : (
              <>
                Show Directions <ChevronDown className='h-3 w-3' />
              </>
            )}
          </button>
        </div>
      )}

      {/* Detailed Turn-by-Turn Instructions */}
      {showDetails && detailedSteps && detailedSteps.length > 0 && (
        <div 
          className='mt-3 mx-8 p-4 rounded-lg border-2'
          style={{
            backgroundColor: bgColorMap[modeColor],
            borderColor: borderColorMap[modeColor]
          }}
        >
          <h4 className='font-semibold text-sm mb-3' style={{ color: textColorMap[modeColor] }}>
            Turn-by-turn directions ({getModeLabel()})
          </h4>
          
          <ol className='space-y-2'>
            {detailedSteps.map((step, idx) => (
              <li key={idx} className='text-xs text-gray-700 flex items-start gap-2'>
                <span 
                  className='font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-white text-[10px]'
                  style={{ backgroundColor: textColorMap[modeColor] }}
                >
                  {idx + 1}
                </span>
                <div className='flex-1'>
                  <span>{step.text}</span>
                  {step.distance > 0 && (
                    <span className='text-gray-500 ml-2'>
                      ({step.distance} km
                      {step.time > 0 && `, ${step.time} min`})
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default RouteSegment