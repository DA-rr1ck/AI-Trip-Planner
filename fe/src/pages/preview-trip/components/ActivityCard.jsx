// fe/src/pages/edit-trip/components/ActivityCard.jsx
import React, { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, MapPin, Clock, DollarSign, Star, Sparkles } from 'lucide-react'

const imageCache = new Map()

async function getPlaceImage(placeName) {
  if (imageCache.has(placeName)) {
    return imageCache.get(placeName)
  }

  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(placeName + ' landmark tourist destination')}`
    )

    if (!response.ok) {
      return '/placeholder.jpg'
    }

    const data = await response.json()
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail || '/placeholder.jpg'
    
    imageCache.set(placeName, imageUrl)
    return imageUrl
  } catch (error) {
    console.error('Error fetching image:', error)
    return '/placeholder.jpg'
  }
}

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
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (activity.PlaceName) {
      setImageLoading(true)
      setImageError(false)
      
      getPlaceImage(activity.PlaceName)
        .then(url => {
          setImageUrl(url)
          setImageLoading(false)
        })
        .catch(err => {
          console.error('Failed to load image:', err)
          setImageError(true)
          setImageLoading(false)
        })
    }
  }, [activity.PlaceName])

  const isHotelActivity = activity.ActivityType === 'hotel_checkin' || activity.ActivityType === 'hotel_checkout'

  // Color mapping for BestTimeToVisit
  const timeColors = {
    Morning: 'bg-amber-50 text-amber-700 border-amber-200',
    Afternoon: 'bg-blue-50 text-blue-700 border-blue-200',
    Evening: 'bg-purple-50 text-purple-700 border-purple-200'
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
      className={`group relative border rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 ${
        isHotelActivity ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
      } ${isDragging ? 'shadow-2xl z-50' : ''}`}
    >
      {/* Hotel activity badge - repositioned to not overlap with controls */}
      {isHotelActivity && (
        <div className='absolute top-3 left-3 z-10 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg'>
          {activity.ActivityType === 'hotel_checkin' ? '🏨 Check-in' : '🏨 Check-out'}
        </div>
      )}

      {/* Subtle gradient overlay on hover */}
      <div className='absolute inset-0 bg-gradient-to-r from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/30 group-hover:to-indigo-50/30 transition-all duration-300 pointer-events-none' />
      
      <div className='relative flex gap-4 p-4 cursor-pointer' onClick={onClick}>
        {/* Image Section */}
        <div className='relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm'>
          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center z-10'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent'></div>
            </div>
          )}
          
          {!imageLoading && imageError && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10'>
              <MapPin className='h-8 w-8 mb-1' />
              <span className='text-xs'>No image</span>
            </div>
          )}

          {!imageLoading && !imageError && (
            <img 
              src={imageUrl} 
              alt={activity.PlaceName} 
              className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
              onError={() => setImageError(true)}
            />
          )}

          {/* Rating badge on image */}
          {activity.Rating && !imageLoading && !imageError && (
            <div className='absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-md z-10'>
              <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
              <span className='text-xs font-semibold text-gray-700'>{activity.Rating}</span>
            </div>
          )}

          {/* Drag handle on image - left side */}
          <div className='absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity'>
            <button
              className='cursor-grab active:cursor-grabbing touch-none p-1.5 bg-white/95 backdrop-blur-sm hover:bg-white rounded-lg shadow-md border border-gray-200 transition-all'
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              title='Drag to reorder'
            >
              <GripVertical className='h-4 w-4 text-gray-600' />
            </button>
          </div>

          {/* Remove button on image - top right corner */}
          {!isHotelActivity && (
            <div className='absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className='p-1.5 bg-white/95 backdrop-blur-sm hover:bg-red-50 rounded-lg shadow-md border border-gray-200 hover:border-red-300 transition-all'
                title='Remove activity'
              >
                <Trash2 className='h-4 w-4 text-red-500' />
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className='flex-1 min-w-0 flex flex-col'>
          {/* Title and Best Time Badge - now with space for badges */}
          <div className='flex items-start gap-3 mb-2'>
            <h4 className='flex-1 font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight'>
              {activity.PlaceName}
            </h4>
            
            {/* Best Time to Visit Badge - no overlap now */}
            {activity.BestTimeToVisit && (
              <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${
                timeColors[activity.BestTimeToVisit] || 'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                <Sparkles className='h-3 w-3' />
                {activity.BestTimeToVisit}
              </span>
            )}
          </div>
          
          <p className='text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed'>
            {activity.PlaceDetails}
          </p>

          {/* Info Tags - More compact and elegant */}
          <div className='flex flex-wrap gap-2 mt-auto'>
            {activity.TimeSlot && (
              <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs border border-gray-200'>
                <Clock className='h-3 w-3 text-gray-500' />
                {activity.TimeSlot}
              </span>
            )}
            
            {activity.Duration && (
              <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-200'>
                <Clock className='h-3 w-3 text-blue-500' />
                {activity.Duration}
              </span>
            )}
            
            {activity.TicketPricing && (
              <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs border border-green-200'>
                <DollarSign className='h-3 w-3 text-green-500' />
                {activity.TicketPricing}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityCard