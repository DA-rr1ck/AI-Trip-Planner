// fe/src/pages/view-trip/components/PlacesToVisit.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parse } from 'date-fns'
import { Clock } from 'lucide-react'

// Simple in-memory cache
const imageCache = new Map()

// Function to get image from your backend SerpAPI
async function getPlaceImage(placeName) {
  // Check cache first
  if (imageCache.has(placeName)) {
    return imageCache.get(placeName)
  }

  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(placeName)}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail || '/placeholder.jpg'
    
    // Cache the result
    imageCache.set(placeName, imageUrl)
    
    return imageUrl
  } catch (error) {
    console.error('Error fetching image:', error)
    return '/placeholder.jpg'
  }
}

// Component for each activity card
function ActivityCard({ activity, location }) {
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

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.PlaceName + " " + location)} 
      target='_blank'
    >
      <div className='border rounded-xl p-3 mt-2 flex gap-5 hover:scale-105 transition-all hover:shadow-md cursor-pointer'>
        <div className='w-[130px] h-[130px] rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 relative'>
          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400'></div>
            </div>
          )}
          
          {!imageLoading && imageError && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
              </svg>
            </div>
          )}

          {!imageLoading && !imageError && (
            <img 
              src={imageUrl} 
              alt={activity.PlaceName} 
              className='w-full h-full object-cover'
              onError={() => setImageError(true)}
            />
          )}
        </div>
        
        <div className='flex-1'>
          <h2 className='font-bold text-lg'>{activity.PlaceName}</h2>
          <p className='text-sm text-gray-400 mt-1 line-clamp-2'>{activity.PlaceDetails}</p>
          <div className='flex items-center gap-1 mt-2 text-xs text-gray-500'>
            <Clock className='h-3 w-3' />
            {activity.TimeSlot || activity.Duration || 'N/A'}
          </div>
          <h2 className='mt-2'>🎟️ {activity.TicketPricing}</h2>
        </div>
      </div>
    </Link>
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
    Morning: 'from-amber-50 to-yellow-50 border-amber-200',
    Lunch: 'from-green-50 to-emerald-50 border-green-200',
    Afternoon: 'from-blue-50 to-cyan-50 border-blue-200',
    Evening: 'from-purple-50 to-pink-50 border-purple-200'
  }

  if (!activities || activities.length === 0) return null

  return (
    <div className='mb-4'>
      <div className={`bg-gradient-to-r ${colorMap[title]} border-l-4 px-4 py-2 rounded-lg mb-3`}>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>{iconMap[title]}</span>
          <h4 className='font-semibold text-lg'>{title}</h4>
          <Clock className='h-4 w-4 text-gray-500 ml-auto' />
          <span className='text-sm text-gray-600'>{timeRange}</span>
        </div>
      </div>

      <div className='grid md:grid-cols-2 gap-4'>
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
  // Handle both date-based and Day-based structures
  const itinerary = trip?.tripData?.Itinerary
  const location = trip?.tripData?.Location || trip?.userSelection?.location

  console.log('Itinerary data:', itinerary)
  console.log('Location:', location)

  if (!itinerary) return <div>No itinerary found.</div>

  // Sort by date (for date-based structure like '2024-08-24')
  const sortedDays = Object.entries(itinerary).sort((a, b) => {
    // Try to parse as date first
    const dateA = new Date(a[0])
    const dateB = new Date(b[0])
    
    // If both are valid dates, sort by date
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB
    }
    
    // Otherwise, sort by day number (Day1, Day2, etc.)
    const dayNumA = parseInt(a[0].replace('Day', ''))
    const dayNumB = parseInt(b[0].replace('Day', ''))
    return dayNumA - dayNumB
  })

  return (
    <div>
      <h2 className='font-bold text-xl mt-5'>Places to Visit</h2>
      <div>
        {sortedDays.map(([dayKey, dayPlan]) => {
          // Check if dayKey is a date (YYYY-MM-DD format) or Day1, Day2, etc.
          const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(dayKey)
          
          let displayTitle
          if (isDateFormat) {
            // Format as "Friday, August 24, 2024"
            displayTitle = format(parse(dayKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')
          } else {
            // Format as "Day 1", "Day 2", etc.
            displayTitle = dayKey.replace('Day', 'Day ')
          }

          return (
            <div key={dayKey} className='mt-5 p-4 bg-white rounded-lg border border-gray-200 shadow-sm'>
              <h2 className='font-bold text-lg mb-2'>{displayTitle}</h2>
              {dayPlan.Theme && (
                <p className='text-sm text-gray-600 mb-4'>
                  {dayPlan.Theme} • Best time: {dayPlan.BestTimeToVisit}
                </p>
              )}

              {/* Check if time-slotted structure exists */}
              {(dayPlan.Morning || dayPlan.Lunch || dayPlan.Afternoon || dayPlan.Evening) ? (
                <>
                  {/* Morning Section */}
                  {dayPlan.Morning?.Activities && dayPlan.Morning.Activities.length > 0 && (
                    <TimeSlotSection
                      title='Morning'
                      timeRange={`${dayPlan.Morning.StartTime} - ${dayPlan.Morning.EndTime}`}
                      activities={dayPlan.Morning.Activities}
                      location={location}
                    />
                  )}

                  {/* Lunch Section */}
                  {dayPlan.Lunch?.Activity && (
                    <TimeSlotSection
                      title='Lunch'
                      timeRange={`${dayPlan.Lunch.StartTime} - ${dayPlan.Lunch.EndTime}`}
                      activities={[dayPlan.Lunch.Activity]}
                      location={location}
                    />
                  )}

                  {/* Afternoon Section */}
                  {dayPlan.Afternoon?.Activities && dayPlan.Afternoon.Activities.length > 0 && (
                    <TimeSlotSection
                      title='Afternoon'
                      timeRange={`${dayPlan.Afternoon.StartTime} - ${dayPlan.Afternoon.EndTime}`}
                      activities={dayPlan.Afternoon.Activities}
                      location={location}
                    />
                  )}

                  {/* Evening Section */}
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
                // Fallback for old flat structure
                <div className='grid md:grid-cols-2 gap-5'>
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
          )
        })}
      </div>
    </div>
  )
}

export default PlacesToVisit