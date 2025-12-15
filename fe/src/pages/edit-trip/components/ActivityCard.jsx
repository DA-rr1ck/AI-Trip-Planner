// fe/src/pages/edit-trip/components/ActivityCard.jsx
import React, { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, MapPin, Clock, DollarSign, Star, Info } from 'lucide-react'
import { getPlaceImage } from '../utils/imageUtils'

function ActivityCard({ activity, onClick, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const [imageUrl, setImageUrl] = useState('/placeholder.jpg')
  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    if (activity.PlaceName) {
      setImageLoading(true)
      getPlaceImage(activity.PlaceName)
        .then(url => {
          setImageUrl(url)
          setImageLoading(false)
        })
        .catch(() => {
          setImageLoading(false)
        })
    }
  }, [activity.PlaceName])

  const isHotelActivity = activity.ActivityType === 'hotel_checkin' || activity.ActivityType === 'hotel_checkout'

  // Map BestTimeToVisit to colors
  const timeColors = {
    Morning: 'bg-amber-100 text-amber-800 border-amber-300',
    Afternoon: 'bg-blue-100 text-blue-800 border-blue-300',
    Evening: 'bg-purple-100 text-purple-800 border-purple-300'
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer ${
        isHotelActivity ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
      } ${isDragging ? 'shadow-2xl z-50' : ''}`}
    >
      {/* Top badges row */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex gap-2 flex-wrap'>
          {/* Activity Type Badge for Hotel Activities */}
          {isHotelActivity && (
            <span className='text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded-full font-medium'>
              {activity.ActivityType === 'hotel_checkin' ? '🏨 Check-in' : '🏨 Check-out'}
            </span>
          )}
          
          {/* Best Time to Visit Badge */}
          {activity.BestTimeToVisit && (
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
              timeColors[activity.BestTimeToVisit] || 'bg-gray-100 text-gray-800 border-gray-300'
            }`}>
              🕒 {activity.BestTimeToVisit}
            </span>
          )}
        </div>

        {/* Drag handle and remove button */}
        <div className='flex items-center gap-2'>
          <button
            className='cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-gray-100 rounded'
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className='h-5 w-5 text-gray-400' />
          </button>
          
          {!isHotelActivity && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className='text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors'
              title='Remove activity'
            >
              <Trash2 className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className='flex gap-4' onClick={onClick}>
        {/* Activity image with loading state */}
        <div className='relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100'>
          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400'></div>
            </div>
          )}
          <img
            src={imageUrl}
            alt={activity.PlaceName}
            className={`w-full h-full object-cover transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setImageLoading(false)}
          />
          {/* View details overlay on hover */}
          <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center'>
            <Info className='h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity' />
          </div>
        </div>

        {/* Activity details */}
        <div className='flex-1 min-w-0'>
          <h4 className='font-bold text-lg text-gray-900 line-clamp-1 mb-1'>
            {activity.PlaceName}
          </h4>
          
          <p className='text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed'>
            {activity.PlaceDetails}
          </p>

          {/* Info grid */}
          <div className='grid grid-cols-2 gap-2 text-sm'>
            {/* Duration */}
            {activity.Duration && (
              <div className='flex items-center gap-1.5 text-gray-700'>
                <Clock className='h-4 w-4 text-blue-600 flex-shrink-0' />
                <span className='truncate'>{activity.Duration}</span>
              </div>
            )}

            {/* Ticket Pricing */}
            {activity.TicketPricing && (
              <div className='flex items-center gap-1.5 text-gray-700'>
                <DollarSign className='h-4 w-4 text-green-600 flex-shrink-0' />
                <span className='truncate font-medium'>{activity.TicketPricing}</span>
              </div>
            )}

            {/* Time Slot */}
            {activity.TimeSlot && (
              <div className='flex items-center gap-1.5 text-gray-700 col-span-2'>
                <Clock className='h-4 w-4 text-purple-600 flex-shrink-0' />
                <span className='text-xs truncate'>{activity.TimeSlot}</span>
              </div>
            )}

            {/* Rating (if available) */}
            {activity.Rating && (
              <div className='flex items-center gap-1.5 text-gray-700'>
                <Star className='h-4 w-4 text-yellow-500 flex-shrink-0 fill-yellow-500' />
                <span className='font-medium'>{activity.Rating}</span>
              </div>
            )}
          </div>

          {/* Click to view details hint */}
          <div className='mt-2 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity'>
            Click to view full details →
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityCard