// fe/src/pages/view-trip/components/PlacesToVisit.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parse } from 'date-fns'
import { Clock, MapPin, DollarSign, Star, Navigation, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
// Simple in-memory cache
const imageCache = new Map()

// Function to get image from your backend SerpAPI
async function getPlaceImage(placeName) {
  if (imageCache.has(placeName)) {
    return imageCache.get(placeName)
  }

  try {
    const { data } = await api.get('/serp/images/search', {
      params: {
        q: placeName,
      },
    })

    const imageUrl = data.images?.[0]?.original || 
                     data.images?.[0]?.thumbnail || 
                     '/placeholder.jpg'
    
    imageCache.set(placeName, imageUrl)
    return imageUrl
  } catch (error) {
    console.error('Error fetching image:', error)
    return '/placeholder.jpg'
  }
}

// Component for each activity card
function ActivityCard({ activity, location }) {
  // Check if activity already has a saved image URL
  const savedImageUrl = activity.PlaceImageUrl && activity.PlaceImageUrl !== '/placeholder.jpg' 
    ? activity.PlaceImageUrl 
    : null
  
  const [imageUrl, setImageUrl] = useState(savedImageUrl || '/placeholder.jpg')
  const [imageLoading, setImageLoading] = useState(!savedImageUrl)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // Only fetch if there's no saved image URL
    if (!savedImageUrl && activity.PlaceName) {
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
  }, [activity.PlaceName, savedImageUrl])

  // Color mapping for BestTimeToVisit
  const timeColors = {
    Morning: 'bg-amber-50 text-amber-700 border-amber-200',
    Afternoon: 'bg-blue-50 text-blue-700 border-blue-200',
    Evening: 'bg-purple-50 text-purple-700 border-purple-200'
  }

  return (
    <div className='group relative border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white'>
      {/* Subtle gradient overlay on hover */}
      <div className='absolute inset-0 bg-gradient-to-r from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/30 group-hover:to-indigo-50/30 transition-all duration-300 pointer-events-none' />
      
      <div className='relative flex gap-4 p-4'>
        {/* Image Section */}
        <div className='relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm'>
          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent'></div>
            </div>
          )}
          
          {!imageLoading && imageError && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-gray-400'>
              <MapPin className='h-8 w-8 mb-1' />
              <span className='text-xs'>No image</span>
            </div>
          )}

          {!imageLoading && !imageError && (
            <>
              <img 
                src={imageUrl} 
                alt={activity.PlaceName} 
                className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                onError={() => setImageError(true)}
              />
              {/* Image overlay gradient */}
              <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
            </>
          )}

          {/* Rating badge */}
          {activity.Rating && (
            <div className='absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-md'>
              <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
              <span className='text-xs font-semibold text-gray-700'>{activity.Rating}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className='flex-1 min-w-0 flex flex-col'>
          {/* Title and Best Time Badge */}
          <div className='flex items-start justify-between gap-3 mb-2'>
            <h4 className='font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight'>
              {activity.PlaceName}
            </h4>
            
            {/* Best Time to Visit Badge */}
            {activity.BestTimeToVisit && (
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${
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
          <div className='flex flex-wrap gap-2 mb-3'>
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

          {/* View on Map Button */}
          <div className='mt-auto'>
            <Link 
              to={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.PlaceName + " " + location)} 
              target='_blank'
            >
              <button className='inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-sm hover:shadow-md'>
                <Navigation className='h-3.5 w-3.5' />
                View on Map
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Time slot section component
function TimeSlotSection({ title, timeRange, activities, location }) {
  const iconMap = {
    Morning: '🌅',
    Lunch: '🍽️',
    Afternoon: '☀️',
    Evening: '🌆'
  }

  const colorMap = {
    Morning: 'from-amber-50 via-orange-50 to-yellow-50 border-amber-300',
    Lunch: 'from-green-50 via-emerald-50 to-teal-50 border-green-300',
    Afternoon: 'from-blue-50 via-cyan-50 to-sky-50 border-blue-300',
    Evening: 'from-purple-50 via-violet-50 to-pink-50 border-purple-300'
  }

  const textColorMap = {
    Morning: 'text-amber-900',
    Lunch: 'text-green-900',
    Afternoon: 'text-blue-900',
    Evening: 'text-purple-900'
  }

  if (!activities || activities.length === 0) return null

  return (
    <div className='mb-6'>
      <div className={`relative bg-gradient-to-r ${colorMap[title]} border-l-4 px-5 py-3 rounded-xl mb-4 shadow-sm overflow-hidden`}>
        {/* Subtle pattern overlay */}
        <div className='absolute inset-0 opacity-5' style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className='relative flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='text-2xl'>{iconMap[title]}</div>
            <h4 className={`font-bold text-lg ${textColorMap[title]}`}>
              {title}
            </h4>
          </div>
          <div className='flex items-center gap-2 text-sm'>
            <Clock className='h-4 w-4 text-gray-600' />
            <span className='font-medium text-gray-700'>{timeRange}</span>
          </div>
        </div>
      </div>

      <div className='space-y-3 pl-4'>
        {activities.map((activity, idx) => (
          <ActivityCard 
            key={idx} 
            activity={activity} 
            location={location}
          />
        ))}
      </div>
    </div>
  )
}

function PlacesToVisit({ trip }) {
  const itinerary = trip?.tripData?.Itinerary
  const location = trip?.tripData?.Location || trip?.userSelection?.location

  if (!itinerary) return (
    <div className='text-center py-12 text-gray-500'>
      <div className='bg-gray-50 rounded-2xl p-8 inline-block'>
        <MapPin className='h-16 w-16 mx-auto mb-3 text-gray-300' />
        <p className='font-medium'>No itinerary found</p>
      </div>
    </div>
  )

  const sortedDays = Object.entries(itinerary).sort((a, b) => {
    const dateA = new Date(a[0])
    const dateB = new Date(b[0])
    
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB
    }
    
    const dayNumA = parseInt(a[0].replace('Day', ''))
    const dayNumB = parseInt(b[0].replace('Day', ''))
    return dayNumA - dayNumB
  })

  return (
    <div className='mb-10'>
      {/* Section Header */}
      <div className='mb-6'>
        <h2 className='font-bold text-3xl text-gray-900 mb-2'>Places to Visit</h2>
        <div className='h-1 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full'></div>
      </div>

      <div className='space-y-8'>
        {sortedDays.map(([dayKey, dayPlan], dayIndex) => {
          const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(dayKey)
          
          let displayTitle
          if (isDateFormat) {
            displayTitle = format(parse(dayKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')
          } else {
            displayTitle = dayKey.replace('Day', 'Day ')
          }

          return (
            <div key={dayKey} className='relative'>
              {/* Day Header with pale blue styling */}
              <div className='relative bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
                <div className='flex items-center gap-3'>
                  {/* Day number badge - removed */}
                  
                  <div className='flex-1'>
                    <h3 className='font-bold text-xl text-blue-900'>{displayTitle}</h3>
                    {dayPlan.Theme && (
                      <p className='text-sm text-blue-700 flex items-center gap-2 mt-1'>
                        <Sparkles className='h-3.5 w-3.5' />
                        {dayPlan.Theme}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Day Content */}
              <div className='space-y-0 pl-4'>
                {(dayPlan.Morning || dayPlan.Lunch || dayPlan.Afternoon || dayPlan.Evening) ? (
                  <>
                    {dayPlan.Morning?.Activities && dayPlan.Morning.Activities.length > 0 && (
                      <TimeSlotSection
                        title='Morning'
                        timeRange={`${dayPlan.Morning.StartTime} - ${dayPlan.Morning.EndTime}`}
                        activities={dayPlan.Morning.Activities}
                        location={location}
                      />
                    )}

                    {dayPlan.Lunch?.Activity && (
                      <TimeSlotSection
                        title='Lunch'
                        timeRange={`${dayPlan.Lunch.StartTime} - ${dayPlan.Lunch.EndTime}`}
                        activities={[dayPlan.Lunch.Activity]}
                        location={location}
                      />
                    )}

                    {dayPlan.Afternoon?.Activities && dayPlan.Afternoon.Activities.length > 0 && (
                      <TimeSlotSection
                        title='Afternoon'
                        timeRange={`${dayPlan.Afternoon.StartTime} - ${dayPlan.Afternoon.EndTime}`}
                        activities={dayPlan.Afternoon.Activities}
                        location={location}
                      />
                    )}

                    {dayPlan.Evening?.Activities && dayPlan.Evening.Activities.length > 0 && (
                      <TimeSlotSection
                        title='Evening'
                        timeRange={`${dayPlan.Evening.StartTime} - ${dayPlan.Evening.EndTime}`}
                        activities={dayPlan.Evening.Activities}
                        location={location}
                      />
                    )}
                  </>
                ) : (
                  <div className='space-y-3'>
                    {dayPlan.Activities?.map((activity, idx) => (
                      <ActivityCard 
                        key={idx} 
                        activity={activity} 
                        location={location}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlacesToVisit