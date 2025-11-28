// fe/src/pages/edit-trip/components/DayCard.jsx
import React, { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { format, parse } from 'date-fns'
import { Trash2 } from 'lucide-react'
import MapRoute from '@/components/MapRoute'
import RouteSegment from './RouteSegment'

function DayCard({ dateKey, dayData, onRemoveDay, children }) {
  const { setNodeRef } = useSortable({ id: dateKey })
  const [routeSegments, setRouteSegments] = useState([])
  const [detailedInstructions, setDetailedInstructions] = useState([])

  const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')

  // Convert children to array
  const childrenArray = React.Children.toArray(children)
  
  // Separate customization section from activity cards
  const customizationSection = childrenArray[0] // First child is customization
  const activityCards = childrenArray.slice(1) // Rest are activity cards
  
  const isEmpty = activityCards.length === 0

  const handleRouteCalculated = (segments, instructions) => {
    console.log('Route segments received:', segments)
    console.log('Detailed instructions received:', instructions)
    setRouteSegments(segments)
    setDetailedInstructions(instructions)
  }

  return (
    <div ref={setNodeRef} className='mb-6'>
      {/* Day Header */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>
              {displayDate}
            </h3>
            <p className='text-sm text-blue-700'>
              {dayData.Theme} • Best time: {dayData.BestTimeToVisit}
            </p>
          </div>
          <button
            onClick={() => onRemoveDay(dateKey)}
            className='text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50'
            title='Delete this day'
          >
            <Trash2 className='h-5 w-5' />
          </button>
        </div>
      </div>
      
      <div className='space-y-0 pl-4 min-h-[100px]'>
        {/* Customization Section (always first) */}
        {customizationSection}

        {isEmpty ? (
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50'>
            <p className='text-sm'>Drop activities here</p>
          </div>
        ) : (
          <>
            {/* Render activities with route segments between them */}
            {activityCards.map((child, index) => {
              console.log(`Rendering activity ${index}, segment exists:`, !!routeSegments[index])
              
              return (
                <React.Fragment key={child.key || index}>
                  {/* Activity Card */}
                  <div className='mb-3'>
                    {child}
                  </div>
                  
                  {/* Show route segment AFTER each activity (except the last one) */}
                  {index < activityCards.length - 1 && (
                    <RouteSegment 
                      segment={routeSegments[index]} 
                      detailedSteps={detailedInstructions[index]?.steps}
                    />
                  )}
                </React.Fragment>
              )
            })}
            
            {/* Map at the bottom */}
            {dayData.Activities && dayData.Activities.length > 0 && (
              <div className='mt-4'>
                <MapRoute 
                  activities={dayData.Activities} 
                  locationName={dayData.Theme}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DayCard

/*
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { format, parse } from 'date-fns'
import { Trash2 } from 'lucide-react'
import MapRoute from '@/components/MapRoute'

function DayCard({ dateKey, dayData, onRemoveDay, children }) {
  const { setNodeRef } = useSortable({ id: dateKey })
  const isEmpty = children.length === 0

  const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')

  return (
    <div ref={setNodeRef} className='mb-6'>
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>
              {displayDate}
            </h3>
            <p className='text-sm text-blue-700'>
              {dayData.Theme} • Best time: {dayData.BestTimeToVisit}
            </p>
          </div>
          <button
            onClick={() => onRemoveDay(dateKey)}
            className='text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50'
            title='Delete this day'
          >
            <Trash2 className='h-5 w-5' />
          </button>
        </div>
      </div>
      
      <div className='space-y-3 pl-4 min-h-[100px]'>
        {isEmpty ? (
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50'>
            <p className='text-sm'>Drop activities here</p>
          </div>
        ) : (
          <>
            {children}
            
            {dayData.Activities && dayData.Activities.length > 0 && (
              <div className='mt-4'>
                <MapRoute 
                  activities={dayData.Activities} 
                  locationName={dayData.Theme}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DayCard

*/