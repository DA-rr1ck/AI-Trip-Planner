// fe/src/pages/smart-trip/view/index.jsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { Loader2, Calendar, Users, DollarSign, MapPin, Sparkles, ArrowLeft, Edit } from 'lucide-react'
import { format, parse } from 'date-fns'
import SmartTripOverview from '../components/SmartTripOverview'
import SmartItinerary from '../components/SmartItinerary'
import SmartTripMap from '../components/SmartTripMap'

function ViewSmartTrip() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTripData()
  }, [tripId])

  const fetchTripData = async () => {
    try {
      setLoading(true)
      const docRef = doc(db, 'AITrips', tripId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const tripData = {
          id: docSnap.id,
          ...docSnap.data()
        }
        console.log('Smart trip data loaded:', tripData)
        setTrip(tripData)
      } else {
        console.error('No such trip found!')
        navigate('/my-trips')
      }
    } catch (error) {
      console.error('Error fetching trip:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-white'>
        <Loader2 className='h-12 w-12 animate-spin text-purple-600 mb-4' />
        <p className='text-gray-600'>Loading your smart trip...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center'>
        <p className='text-gray-600'>Trip not found</p>
        <button onClick={() => navigate('/my-trips')} className='mt-4 text-purple-600 hover:underline'>
          Go to My Trips
        </button>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-purple-50 to-white'>
      <div className='max-w-7xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-6'>
          <button
            onClick={() => navigate('/my-trips')}
            className='flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to My Trips
          </button>

          <div className='bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-6 border border-purple-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Sparkles className='h-10 w-10 text-purple-600' />
                <div>
                  <h1 className='text-3xl font-bold text-purple-900'>
                    {trip.userSelection?.location || 'Your Trip'}
                  </h1>
                  <div className='flex items-center gap-4 mt-2 text-sm text-purple-700'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='h-4 w-4' />
                      {trip.userSelection?.startDate && format(parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date()), 'MMM d')} - {trip.userSelection?.endDate && format(parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Users className='h-4 w-4' />
                      {trip.userSelection?.traveler}
                    </span>
                    <span className='flex items-center gap-1'>
                      <DollarSign className='h-4 w-4' />
                      {trip.userSelection?.budget}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className='flex items-center gap-2'>
                <span className='px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold'>
                  ⚡ Smart Generated
                </span>
                <button
                  onClick={() => navigate(`/edit-trip/${tripId}`)}
                  className='flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 border border-purple-300 transition-colors'
                >
                  <Edit className='h-4 w-4' />
                  Edit Trip
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <SmartTripOverview trip={trip} />

        {/* Itinerary Section */}
        <SmartItinerary trip={trip} />

        {/* Map Section */}
        <SmartTripMap trip={trip} />
      </div>
    </div>
  )
}

export default ViewSmartTrip