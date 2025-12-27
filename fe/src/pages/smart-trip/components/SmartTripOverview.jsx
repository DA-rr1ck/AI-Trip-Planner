import React from 'react'
import { Calendar, Users, DollarSign, Clock, MapPin } from 'lucide-react'
import { format, parse, differenceInDays } from 'date-fns'

function SmartTripOverview({ trip }) {
  const getTotalDays = () => {
    if (!trip?.userSelection?.startDate || !trip?.userSelection?.endDate) return 0
    const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date())
    return differenceInDays(end, start) + 1
  }

  const totalDays = getTotalDays()
  const totalActivities = Object.values(trip?.tripData?.Itinerary || {}).reduce((total, day) => {
    const morningCount = day.Morning?.Activities?.length || 0
    const lunchCount = day.Lunch?.Activity ? 1 : 0
    const afternoonCount = day.Afternoon?.Activities?.length || 0
    const eveningCount = day.Evening?.Activities?.length || 0
    return total + morningCount + lunchCount + afternoonCount + eveningCount
  }, 0)

  return (
    <div className='mb-8'>
      <h2 className='text-2xl font-bold mb-4'>Trip Overview</h2>
      
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {/* Duration */}
        <div className='bg-white rounded-xl p-6 shadow-md border border-purple-100'>
          <div className='flex items-center gap-3'>
            <div className='p-3 bg-purple-100 rounded-lg'>
              <Calendar className='h-6 w-6 text-purple-600' />
            </div>
            <div>
              <p className='text-sm text-gray-600'>Duration</p>
              <p className='text-2xl font-bold text-purple-900'>{totalDays} Days</p>
            </div>
          </div>
        </div>

        {/* Travelers */}
        <div className='bg-white rounded-xl p-6 shadow-md border border-blue-100'>
          <div className='flex items-center gap-3'>
            <div className='p-3 bg-blue-100 rounded-lg'>
              <Users className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <p className='text-sm text-gray-600'>Travelers</p>
              <p className='text-2xl font-bold text-blue-900'>{trip?.tripData?.TotalTravelers || 0}</p>
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className='bg-white rounded-xl p-6 shadow-md border border-green-100'>
          <div className='flex items-center gap-3'>
            <div className='p-3 bg-green-100 rounded-lg'>
              <DollarSign className='h-6 w-6 text-green-600' />
            </div>
            <div>
              <p className='text-sm text-gray-600'>Budget</p>
              <p className='text-lg font-bold text-green-900'>{trip?.userSelection?.budget}</p>
            </div>
          </div>
        </div>

        {/* Activities */}
        <div className='bg-white rounded-xl p-6 shadow-md border border-orange-100'>
          <div className='flex items-center gap-3'>
            <div className='p-3 bg-orange-100 rounded-lg'>
              <MapPin className='h-6 w-6 text-orange-600' />
            </div>
            <div>
              <p className='text-sm text-gray-600'>Activities</p>
              <p className='text-2xl font-bold text-orange-900'>{totalActivities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className='mt-4 bg-white rounded-xl p-6 shadow-md'>
        <h3 className='font-semibold text-lg mb-3'>Trip Information</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div className='flex items-start gap-2'>
            <MapPin className='h-4 w-4 text-purple-600 mt-0.5' />
            <div>
              <p className='font-medium text-gray-700'>Destination</p>
              <p className='text-gray-600'>{trip?.tripData?.Location}</p>
            </div>
          </div>
          <div className='flex items-start gap-2'>
            <Calendar className='h-4 w-4 text-purple-600 mt-0.5' />
            <div>
              <p className='font-medium text-gray-700'>Travel Dates</p>
              <p className='text-gray-600'>
                {trip?.userSelection?.startDate && format(parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')} - {trip?.userSelection?.endDate && format(parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className='flex items-start gap-2'>
            <Users className='h-4 w-4 text-purple-600 mt-0.5' />
            <div>
              <p className='font-medium text-gray-700'>Group Size</p>
              <p className='text-gray-600'>
                {trip?.userSelection?.adults} Adults
                {trip?.userSelection?.children > 0 && `, ${trip.userSelection.children} Children`}
              </p>
            </div>
          </div>
          <div className='flex items-start gap-2'>
            <Clock className='h-4 w-4 text-purple-600 mt-0.5' />
            <div>
              <p className='font-medium text-gray-700'>Generated On</p>
              <p className='text-gray-600'>
                {trip?.createdAt && format(new Date(trip.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartTripOverview