import React from 'react'
import MapRoute from '@/components/MapRoute'

function TripMapSection({ itinerary, locationName }) {
  // Collect all activities from all days in chronological order
  const allActivities = Object.keys(itinerary)
    .sort() // Sort by date keys
    .flatMap(dateKey => {
      const dayData = itinerary[dateKey]
      return [
        ...(dayData.Morning?.Activities || []),
        ...(dayData.Lunch?.Activity ? [dayData.Lunch.Activity] : []),
        ...(dayData.Afternoon?.Activities || []),
        ...(dayData.Evening?.Activities || [])
      ]
    })

  // Filter activities that have valid coordinates for Leaflet
  const mapActivities = allActivities.filter(a => {
    const g = a?.GeoCoordinates || a?.geoCoordinates || a?.gps_coordinates || a?.coordinates
    if (!g || typeof g !== 'object') return false

    const latRaw = g.Latitude ?? g.latitude ?? g.lat
    const lngRaw = g.Longitude ?? g.longitude ?? g.lng ?? g.lon

    const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw)
    const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw)

    return Number.isFinite(lat) && Number.isFinite(lng)
  })

  if (mapActivities.length === 0) return null

  return (
    <div className='mb-8'>
      <h2 className='font-bold text-2xl mb-4'>Complete Trip Route</h2>
      <p className='text-sm text-gray-600 mb-4'>
        🗺️ View the complete route for your entire trip across all {Object.keys(itinerary).length} day{Object.keys(itinerary).length > 1 ? 's' : ''}
      </p>
      <div className='bg-white rounded-lg shadow-md p-4'>
        <MapRoute
          activities={mapActivities}
          locationName={locationName}
        />
        <div className='mt-4 flex items-center justify-between text-sm text-gray-600'>
          <span>📍 Total activities: {allActivities.length}</span>
          <span>🚗 Route spans: {Object.keys(itinerary).length} day{Object.keys(itinerary).length > 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

export default TripMapSection