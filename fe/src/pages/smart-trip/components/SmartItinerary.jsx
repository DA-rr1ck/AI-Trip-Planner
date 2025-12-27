// fe/src/pages/smart-trip/view/components/SmartItinerary.jsx
import React from 'react'
import { format, parse, isValid } from 'date-fns'
import { Clock, MapPin, DollarSign } from 'lucide-react'

function SmartItinerary({ trip }) {
  const itinerary = trip?.tripData?.Itinerary || {}
  const dateKeys = Object.keys(itinerary).sort()

  const timeSlotColors = {
    Morning: 'from-amber-50 to-yellow-50 border-amber-200',
    Lunch: 'from-green-50 to-emerald-50 border-green-200',
    Afternoon: 'from-blue-50 to-cyan-50 border-blue-200',
    Evening: 'from-purple-50 to-pink-50 border-purple-200'
  }

  const timeSlotIcons = {
    Morning: '🌅',
    Lunch: '🍽️',
    Afternoon: '☀️',
    Evening: '🌆'
  }

  // Helper to format day label
  const formatDayLabel = (dateKey) => {
    // Check if it's a date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      try {
        const parsedDate = parse(dateKey, 'yyyy-MM-dd', new Date())
        if (isValid(parsedDate)) {
          return format(parsedDate, 'EEEE, MMMM d, yyyy')
        }
      } catch (error) {
        console.error('Error parsing date:', dateKey, error)
      }
    }
    
    // Fallback: If it's "Day1", "Day2", etc., format it nicely
    if (/^Day\d+$/.test(dateKey)) {
      const dayNumber = dateKey.replace('Day', '')
      return `Day ${dayNumber}`
    }
    
    // Last resort: return as-is
    return dateKey
  }

  const renderActivity = (activity) => (
    <div className='bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow'>
      <h4 className='font-semibold text-lg mb-1'>{activity.PlaceName}</h4>
      <p className='text-sm text-gray-600 mb-2'>{activity.PlaceDetails}</p>
      <div className='flex flex-wrap gap-3 text-xs text-gray-500'>
        {activity.TimeSlot && (
          <span className='flex items-center gap-1'>
            <Clock className='h-3 w-3' />
            {activity.TimeSlot}
          </span>
        )}
        {activity.Duration && (
          <span>⏱️ {activity.Duration}</span>
        )}
        {activity.TicketPricing && (
          <span className='flex items-center gap-1'>
            <DollarSign className='h-3 w-3' />
            {activity.TicketPricing}
          </span>
        )}
      </div>
    </div>
  )

  const renderTimeSlot = (title, timeRange, activities) => {
    if (!activities || activities.length === 0) return null

    return (
      <div className='mb-4'>
        <div className={`bg-gradient-to-r ${timeSlotColors[title]} border-l-4 px-4 py-2 rounded-lg mb-3`}>
          <div className='flex items-center gap-2'>
            <span className='text-xl'>{timeSlotIcons[title]}</span>
            <h4 className='font-semibold text-lg'>{title}</h4>
            {timeRange && (
              <>
                <Clock className='h-4 w-4 text-gray-500 ml-auto' />
                <span className='text-sm text-gray-600'>{timeRange}</span>
              </>
            )}
          </div>
        </div>
        <div className='space-y-3 pl-4'>
          {activities.map((activity, idx) => (
            <div key={idx}>{renderActivity(activity)}</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='mb-8'>
      <h2 className='text-2xl font-bold mb-4'>Daily Itinerary</h2>

      <div className='space-y-6'>
        {dateKeys.map((dateKey) => {
          const dayData = itinerary[dateKey]
          const displayDate = formatDayLabel(dateKey)

          return (
            <div key={dateKey} className='bg-white rounded-xl p-6 shadow-md border border-gray-200'>
              {/* Day Header */}
              <div className='mb-4 pb-4 border-b border-gray-200'>
                <h3 className='text-xl font-bold text-purple-900'>{displayDate}</h3>
                {dayData.Theme && (
                  <p className='text-sm text-gray-600 mt-1'>{dayData.Theme}</p>
                )}
              </div>

              {/* Time Slots */}
              <div className='space-y-4'>
                {dayData.Morning?.Activities && renderTimeSlot(
                  'Morning',
                  `${dayData.Morning.StartTime} - ${dayData.Morning.EndTime}`,
                  dayData.Morning.Activities
                )}

                {dayData.Lunch?.Activity && renderTimeSlot(
                  'Lunch',
                  `${dayData.Lunch.StartTime} - ${dayData.Lunch.EndTime}`,
                  [dayData.Lunch.Activity]
                )}

                {dayData.Afternoon?.Activities && renderTimeSlot(
                  'Afternoon',
                  `${dayData.Afternoon.StartTime} - ${dayData.Afternoon.EndTime}`,
                  dayData.Afternoon.Activities
                )}

                {dayData.Evening?.Activities && renderTimeSlot(
                  'Evening',
                  `${dayData.Evening.StartTime} - ${dayData.Evening.EndTime}`,
                  dayData.Evening.Activities
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SmartItinerary