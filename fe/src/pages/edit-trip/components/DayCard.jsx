// fe/src/pages/edit-trip/components/DayCard.jsx
import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { format, parse } from 'date-fns'
import { Trash2 } from 'lucide-react'
import MapRoute from '@/components/MapRoute'
import RouteSegment from './RouteSegment'
import TimeSlotSection from './TimeSlotSection'

function DayCard({ dateKey, dayData, onRemoveDay, onActivityClick, onRemoveActivity, children }) {
  const { setNodeRef } = useSortable({ id: dateKey })
  const [routeSegments, setRouteSegments] = useState([])
  const [detailedInstructions, setDetailedInstructions] = useState([])

  const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')

  // Convert children to array
  const childrenArray = React.Children.toArray(children)
  const customizationSection = childrenArray[0]

  // Collect all activities from all time slots
  const allActivities = [
    ...(dayData.Morning?.Activities || []),
    ...(dayData.Lunch?.Activity ? [dayData.Lunch.Activity] : []),
    ...(dayData.Afternoon?.Activities || []),
    ...(dayData.Evening?.Activities || [])
  ]

  const isEmpty = allActivities.length === 0

  const handleRouteCalculated = (segments, instructions) => {
    console.log('Route segments received:', segments)
    console.log('Detailed instructions received:', instructions)
    setRouteSegments(segments)
    setDetailedInstructions(instructions)
  }

  // NEW: Get the global activity index (0-based across all activities)
  const getGlobalActivityIndex = (slot, localIndex) => {
    let globalIndex = 0
    
    // Add all activities from previous slots
    if (slot !== 'Morning') {
      globalIndex += dayData.Morning?.Activities?.length || 0
    }
    
    if (slot === 'Afternoon' || slot === 'Evening') {
      globalIndex += dayData.Lunch?.Activity ? 1 : 0
    }
    
    if (slot === 'Evening') {
      globalIndex += dayData.Afternoon?.Activities?.length || 0
    }
    
    // Add the local index within the current slot
    globalIndex += localIndex
    
    return globalIndex
  }

  return (
    <div ref={setNodeRef} className='mb-6'>
      {/* Day Header */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>{displayDate}</h3>
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
        {/* Customization Section */}
        {customizationSection}

        {isEmpty ? (
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50'>
            <p className='text-sm'>No activities for this day</p>
          </div>
        ) : (
          <>
            {/* Morning Section */}
            {dayData.Morning?.Activities && dayData.Morning.Activities.length > 0 && (
              <>
                <TimeSlotSection
                  title="Morning"
                  timeRange={`${dayData.Morning.StartTime} - ${dayData.Morning.EndTime}`}
                  activities={dayData.Morning.Activities}
                  dateKey={dateKey}
                  onActivityClick={onActivityClick}
                  onRemoveActivity={onRemoveActivity}
                />
                {/* Show route after last morning activity */}
                {(dayData.Lunch?.Activity || dayData.Afternoon?.Activities?.length > 0 || dayData.Evening?.Activities?.length > 0) && (
                  <RouteSegment
                    segment={routeSegments[getGlobalActivityIndex('Morning', dayData.Morning.Activities.length - 1)]}
                    detailedSteps={detailedInstructions[getGlobalActivityIndex('Morning', dayData.Morning.Activities.length - 1)]?.steps}
                  />
                )}
              </>
            )}

            {/* Lunch Section */}
            {dayData.Lunch?.Activity && (
              <>
                <TimeSlotSection
                  title="Lunch"
                  timeRange={`${dayData.Lunch.StartTime} - ${dayData.Lunch.EndTime}`}
                  activities={[dayData.Lunch.Activity]}
                  dateKey={dateKey}
                  onActivityClick={onActivityClick}
                  onRemoveActivity={onRemoveActivity}
                />
                {/* Show route after lunch */}
                {(dayData.Afternoon?.Activities?.length > 0 || dayData.Evening?.Activities?.length > 0) && (
                  <RouteSegment
                    segment={routeSegments[getGlobalActivityIndex('Lunch', 0)]}
                    detailedSteps={detailedInstructions[getGlobalActivityIndex('Lunch', 0)]?.steps}
                  />
                )}
              </>
            )}

            {/* Afternoon Section */}
            {dayData.Afternoon?.Activities && dayData.Afternoon.Activities.length > 0 && (
              <>
                <TimeSlotSection
                  title="Afternoon"
                  timeRange={`${dayData.Afternoon.StartTime} - ${dayData.Afternoon.EndTime}`}
                  activities={dayData.Afternoon.Activities}
                  dateKey={dateKey}
                  onActivityClick={onActivityClick}
                  onRemoveActivity={onRemoveActivity}
                />
                {/* Show route after last afternoon activity */}
                {dayData.Evening?.Activities?.length > 0 && (
                  <RouteSegment
                    segment={routeSegments[getGlobalActivityIndex('Afternoon', dayData.Afternoon.Activities.length - 1)]}
                    detailedSteps={detailedInstructions[getGlobalActivityIndex('Afternoon', dayData.Afternoon.Activities.length - 1)]?.steps}
                  />
                )}
              </>
            )}

            {/* Evening Section */}
            {dayData.Evening?.Activities && dayData.Evening.Activities.length > 0 && (
              <TimeSlotSection
                title="Evening"
                timeRange={`${dayData.Evening.StartTime} - ${dayData.Evening.EndTime}`}
                activities={dayData.Evening.Activities}
                dateKey={dateKey}
                onActivityClick={onActivityClick}
                onRemoveActivity={onRemoveActivity}
              />
              // No route segment after evening (it's the last slot)
            )}

            {/* Map at the bottom */}
            {allActivities.length > 0 && (
              <div className='mt-4'>
                <MapRoute
                  activities={allActivities}
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
        
        {customizationSection}

        {isEmpty ? (
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50'>
            <p className='text-sm'>Drop activities here</p>
          </div>
        ) : (
          <>
            
            {activityCards.map((child, index) => {
              console.log(`Rendering activity ${index}, segment exists:`, !!routeSegments[index])
              
              return (
                <React.Fragment key={child.key || index}>
                  
                  <div className='mb-3'>
                    {child}
                  </div>
                  
                  
                  {index < activityCards.length - 1 && (
                    <RouteSegment 
                      segment={routeSegments[index]} 
                      detailedSteps={detailedInstructions[index]?.steps}
                    />
                  )}
                </React.Fragment>
              )
            })}
            
           
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
*/

