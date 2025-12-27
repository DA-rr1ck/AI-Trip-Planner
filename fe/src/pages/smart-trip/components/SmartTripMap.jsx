import React from 'react'
import MapRoute from '@/components/MapRoute'

function SmartTripMap({ trip }) {
  const itinerary = trip?.tripData?.Itinerary || {}
  
  // Collect all activities with coordinates
  const allActivities = Object.keys(itinerary)
    .sort()
    .flatMap(dateKey => {
      const dayData = itinerary[dateKey]
      return [
        ...(dayData.Morning?.Activities || []),
        ...(dayData.Lunch?.Activity ? [dayData.Lunch.Activity] : []),
        ...(dayData.Afternoon?.Activities || []),
        ...(dayData.Evening?.Activities || [])
      ]
    })
    .filter(activity => activity.GeoCoordinates)

  if (allActivities.length === 0) {
    return (
      <div className='mb-8'>
        <h2 className='text-2xl font-bold mb-4'>Trip Map</h2>
        <div className='bg-white rounded-xl p-8 text-center text-gray-500 shadow-md'>
          No map data available for this trip
        </div>
      </div>
    )
  }

  return (
    <div className='mb-8'>
      <h2 className='text-2xl font-bold mb-4'>Complete Trip Route</h2>
      <p className='text-sm text-gray-600 mb-4'>
        🗺️ View all {allActivities.length} activities across your entire trip
      </p>
      <div className='bg-white rounded-xl p-4 shadow-md'>
        <MapRoute
          activities={allActivities}
          locationName={trip?.tripData?.Location}
        />
      </div>
    </div>
  )
}

export default SmartTripMap