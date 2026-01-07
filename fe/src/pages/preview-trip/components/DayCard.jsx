// fe/src/pages/edit-trip/components/DayCard.jsx
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { format, parse } from 'date-fns'
import { Trash2 } from 'lucide-react'
import TimeSlotSection from './TimeSlotSection'
import AttractionSearchBox from './AttractionSearchBox'

function DayCard({ dateKey, dayData, onRemoveDay, onActivityClick, onRemoveActivity, onActivityAdd, location, children, isFirstDay,  
  isLastDay,   
  allDateKeys }) {
  const { setNodeRef } = useSortable({ id: dateKey })

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

  return (
    <div ref={setNodeRef} className='mb-6'>
      {/* Day Header - REMOVED BestTimeToVisit */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>{displayDate}</h3>
            <p className='text-sm text-blue-700'>{dayData.Theme}</p>
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
              <TimeSlotSection
                title="Morning"
                timeRange={`${dayData.Morning.StartTime} - ${dayData.Morning.EndTime}`}
                activities={dayData.Morning.Activities}
                dateKey={dateKey}
                onActivityClick={onActivityClick}
                onRemoveActivity={onRemoveActivity}
              />
            )}

            {/* Lunch Section */}
            {dayData.Lunch?.Activity && (
              <TimeSlotSection
                title="Lunch"
                timeRange={`${dayData.Lunch.StartTime} - ${dayData.Lunch.EndTime}`}
                activities={[dayData.Lunch.Activity]}
                dateKey={dateKey}
                onActivityClick={onActivityClick}
                onRemoveActivity={onRemoveActivity}
              />
            )}

            {/* Afternoon Section */}
            {dayData.Afternoon?.Activities && dayData.Afternoon.Activities.length > 0 && (
              <TimeSlotSection
                title="Afternoon"
                timeRange={`${dayData.Afternoon.StartTime} - ${dayData.Afternoon.EndTime}`}
                activities={dayData.Afternoon.Activities}
                dateKey={dateKey}
                onActivityClick={onActivityClick}
                onRemoveActivity={onRemoveActivity}
              />
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
            )}
          </>
        )}

        {/* Manual Attraction Search Box */}
        {location && onActivityAdd && (
          <AttractionSearchBox
            location={location}
            dateKey={dateKey}
            onActivityAdd={onActivityAdd}
            existingActivities={allActivities}
          />
        )}
      </div>
    </div>
  )
}

export default DayCard