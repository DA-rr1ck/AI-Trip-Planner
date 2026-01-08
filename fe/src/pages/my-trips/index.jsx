import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Trash2, Eye, MapPin, Calendar, Users, DollarSign, Plus, Sparkles } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { format, parse, differenceInDays } from 'date-fns'
import { getUserTrips, deleteTrip } from '@/service/tripService'
import { api } from '@/lib/api'
// Simple in-memory cache
const imageCache = new Map()

async function getPlaceImage(placeName) {
  if (imageCache.has(placeName)) {
    return imageCache.get(placeName)
  }

  try {
    const { data } = await api.get('/serp/images/search', {
      params: {
        q: `${placeName} landmark tourist destination`,
      },
    })
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail || '/placeholder.jpg'
    
    imageCache.set(placeName, imageUrl)
    return imageUrl
  } catch (error) {
    console.error('Error fetching image:', error)
    return '/placeholder.jpg'
  }
}

const TRIP_TRACKING_KEY_PREFIX = 'tripTrackingStarted:' // localStorage key prefix

function hasTripStarted(tripId) {
  if (!tripId) return false
  try {
    return localStorage.getItem(`${TRIP_TRACKING_KEY_PREFIX}${tripId}`) === '1'
  } catch {
    return false
  }
}

function markTripStarted(tripId) {
  if (!tripId) return
  try {
    localStorage.setItem(`${TRIP_TRACKING_KEY_PREFIX}${tripId}`, '1')
  } catch {
    // ignore
  }
}

function isTodayWithinTripRange(startDateStr, endDateStr) {
  // startDateStr/endDateStr expected: "yyyy-MM-dd"
  if (!startDateStr || !endDateStr) return false
  try {
    // Compare by yyyy-MM-dd string is safe lexicographically
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return todayStr >= startDateStr && todayStr <= endDateStr
  } catch {
    return false
  }
}

function TripCard({ trip, onDelete }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg')
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (trip.userSelection?.location) {
      setImageLoading(true)
      setImageError(false)
      
      getPlaceImage(trip.userSelection.location)
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
  }, [trip.userSelection?.location])

  const startDateStr = trip.userSelection?.startDate
  const endDateStr = trip.userSelection?.endDate

  const withinTripWindow = isTodayWithinTripRange(startDateStr, endDateStr)
  const started = hasTripStarted(trip.id)

  const startBtnLabel = started ? 'Continue trip' : 'Start trip'
  const startBtnDisabled = !withinTripWindow

  const handleStartTrip = (e) => {
    e.stopPropagation()
    if (startBtnDisabled) return

    // first click => mark as started (so next time label becomes Continue trip)
    if (!started) markTripStarted(trip.id)

    // go to tracking page
    navigate(`/trip/${trip.id}/track`)
  }

  // Calculate days from date range
  const getTripDays = () => {
    if (trip.userSelection?.startDate && trip.userSelection?.endDate) {
      const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date())
      const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date())
      return differenceInDays(end, start) + 1
    }
    return trip.userSelection?.noOfdays || 0
  }

  // Format date range for display
  const getDateRange = () => {
    if (trip.userSelection?.startDate && trip.userSelection?.endDate) {
      const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date())
      const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date())
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    }
    return null
  }

  const days = getTripDays()
  const dateRange = getDateRange()
  const isSmartTrip = trip.generationMethod === 'smart_database'

  return (
    <div className='group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300'>
      {/* Three-dot menu */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className='absolute top-3 right-3 z-10 rounded-full p-1.5 bg-white/95 backdrop-blur-sm hover:bg-white shadow-md border border-gray-200 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity'
            aria-label='Trip actions'
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className='h-4 w-4 text-gray-600' />
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-44 p-2' align='end' sideOffset={6} onClick={(e) => e.stopPropagation()}>
          <div className='flex flex-col gap-1'>
            <button
              type='button'
              className='flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-blue-50 text-left text-gray-700 hover:text-blue-600 transition-colors'
              onClick={() => navigate(`/view-trip/${trip.id}`)}
            >
              <Eye className='h-4 w-4' />
              View Trip
            </button>
            <button
              type='button'
              className='flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-red-50 text-left text-red-600 transition-colors'
              onClick={() => onDelete?.(trip.id)}
            >
              <Trash2 className='h-4 w-4' />
              Delete Trip
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Horizontal layout: Image on left, content on right */}
      <div className='flex flex-col md:flex-row cursor-pointer' onClick={() => navigate(`/view-trip/${trip.id}`)}>
        {/* Trip Image */}
        <div className='relative w-full md:w-64 h-52 md:h-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden'>
          {/* Smart Trip Badge */}
          {isSmartTrip && (
            <div className='absolute top-3 left-3 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg'>
              <Sparkles className='h-3 w-3' />
              Smart Trip
            </div>
          )}

          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent'></div>
            </div>
          )}
          
          {!imageLoading && imageError && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-gray-400'>
              <MapPin className='h-10 w-10 mb-2' />
              <span className='text-sm'>No image</span>
            </div>
          )}

          {!imageLoading && !imageError && (
            <>
              <img 
                src={imageUrl} 
                alt={trip.userSelection?.location} 
                className='h-full w-full object-cover group-hover:scale-110 transition-transform duration-500'
                onError={() => setImageError(true)}
              />
              {/* Gradient overlay */}
              <div className='absolute inset-0 bg-gradient-to-r from-black/30 to-transparent' />
            </>
          )}
        </div>

        {/* Card Content */}
        <div className='flex-1 p-4'>
          {/* Location name */}
          <h3 className='font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors'>
            {trip.userSelection?.location}
          </h3>
          
          {/* Date range */}
          {dateRange && (
            <div className='flex items-center gap-2 text-sm text-gray-600 mb-3'>
              <Calendar className='h-4 w-4 text-blue-600' />
              <span className='font-medium'>{dateRange}</span>
            </div>
          )}
          
          {/* Trip details - inline */}
          <div className='flex items-center gap-3 text-sm'>
            {days > 0 && (
              <div className='flex items-center gap-1.5 text-gray-600'>
                <Calendar className='h-4 w-4 text-gray-500' />
                <span>{days} {days === 1 ? 'Day' : 'Days'}</span>
              </div>
            )}
            
            {trip.userSelection?.budget && (
              <div className='flex items-center gap-1.5 text-gray-600'>
                <DollarSign className='h-4 w-4 text-green-600' />
                <span>{trip.userSelection.budget}</span>
              </div>
            )}
            
            {trip.userSelection?.traveler && (
              <div className='flex items-center gap-1.5 text-gray-600'>
                <Users className='h-4 w-4 text-purple-600' />
                <span>{trip.userSelection.traveler}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start/Continue Trip button (MOBILE ONLY) */}
      {(startDateStr && endDateStr) && (
        <div className="pb-4 px-4 md:hidden">
          <button
            type="button"
            onClick={handleStartTrip}
            disabled={startBtnDisabled}
            className={
              "w-full rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition " + 
                (startBtnDisabled
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white duration-150 active:scale-95")
            }
          >
            {startBtnLabel}
          </button>

          {!withinTripWindow && (
            <p className="mt-1 text-[11px] text-gray-500">
              You can only start/continue during the trip dates.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MyTrips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userTrips, setUserTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) {
      navigate('/')
      return
    }

    (async () => {
      setLoading(true)
      try {
        const result = await getUserTrips(user.email)
        
        if (result.success) {
          // Sort trips by creation date (newest first)
          const sortedTrips = result.trips.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
            return dateB - dateA
          })
          
          setUserTrips(sortedTrips)
        } else {
          toast.error('Failed to load your trips')
        }
      } catch (error) {
        console.error('Error fetching trips:', error)
        toast.error(error.message || 'Failed to load your trips')
      } finally {
        setLoading(false)
      }
    })()
  }, [user, navigate])

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Delete this trip permanently? This cannot be undone.')) return
    
    try {
      const result = await deleteTrip(tripId)
      
      if (result.success) {
        setUserTrips((prev) => prev.filter((t) => t.id !== tripId))
        toast.success('Trip deleted successfully')
      } else {
        toast.error('Failed to delete trip')
      }
    } catch (error) {
      console.error('Error deleting trip:', error)
      toast.error(error.message || 'Failed to delete trip, please try again.')
    }
  }

  if (loading) {
    return (
      <div className='max-w-5xl mx-auto px-6 py-10'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='font-bold text-3xl text-gray-900'>My Trips</h1>
            <p className='text-gray-500 mt-1 text-sm'>Loading your adventures...</p>
          </div>
        </div>
        <div className='flex justify-center items-center min-h-[400px]'>
          <div className='animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-5xl mx-auto px-6 pt-0 md:pt-10 pb-20 md:pb-10'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-bold text-3xl text-gray-900 mb-1'>My Trips</h1>
          <p className='text-gray-600 text-sm'>
            {userTrips.length === 0 
              ? 'No trips yet. Start planning your next adventure!' 
              : `${userTrips.length} ${userTrips.length === 1 ? 'trip' : 'trips'} planned`}
          </p>
        </div>
        <button
          onClick={() => navigate('/create-trip')}
          className='flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium text-sm'
        >
          <Plus className='h-4 w-4' />
          New Trip
        </button>
      </div>

      {/* Trips List or Empty State */}
      {userTrips.length === 0 ? (
        <div className='flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200'>
          <div className='text-center p-8'>
            <div className='inline-block p-4 bg-white rounded-full shadow-lg mb-4'>
              <MapPin className='h-10 w-10 text-blue-600' />
            </div>
            <h2 className='text-xl font-bold text-gray-900 mb-2'>No trips yet</h2>
            <p className='text-gray-600 mb-6 max-w-md text-sm'>
              Start planning your next adventure! Create your first trip and let AI help you discover amazing destinations.
            </p>
            <button
              onClick={() => navigate('/create-trip')}
              className='inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium text-sm'
            >
              <Plus className='h-4 w-4' />
              Create Your First Trip
            </button>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          {userTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyTrips