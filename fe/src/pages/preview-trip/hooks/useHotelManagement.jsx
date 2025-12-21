
import { useState, useEffect } from 'react'

export function useHotelManagement(tripData, updateTripData, rawTripData, existingTripId, setHasUnsavedChanges) {
  const [selectedHotels, setSelectedHotels] = useState([])

  // Helper function to update hotel check-in/out activities
  const updateHotelActivities = (selectedHotel) => {
    if (!selectedHotel || !tripData?.tripData?.Itinerary) return

    const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
    if (dateKeys.length === 0) return

    const firstDate = dateKeys[0]
    const lastDate = dateKeys[dateKeys.length - 1]
    const newItinerary = { ...tripData.tripData.Itinerary }

    // Update check-in activity (first day's afternoon)
    if (newItinerary[firstDate]?.Afternoon?.Activities) {
      newItinerary[firstDate] = {
        ...newItinerary[firstDate],
        Afternoon: {
          ...newItinerary[firstDate].Afternoon,
          Activities: newItinerary[firstDate].Afternoon.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkin') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-in',
                PlaceDetails: `Check-in at ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    // Update check-out activity (last day's morning)
    if (newItinerary[lastDate]?.Morning?.Activities) {
      newItinerary[lastDate] = {
        ...newItinerary[lastDate],
        Morning: {
          ...newItinerary[lastDate].Morning,
          Activities: newItinerary[lastDate].Morning.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkout') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-out',
                PlaceDetails: `Check-out from ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }

    updateTripData(updatedTripData)
  }

  // Initialize selected hotels when tripData loads
  useEffect(() => {
    if (tripData?.tripData?.Hotels && 
        rawTripData?.id && 
        !existingTripId.startsWith('temp_') && 
        selectedHotels.length === 0) {
      setSelectedHotels(tripData.tripData.Hotels)
    }
  }, [rawTripData?.id, existingTripId])

  // Update hotel activities when hotel selection changes
  useEffect(() => {
    if (selectedHotels.length > 0 && tripData?.tripData?.Itinerary) {
      updateHotelActivities(selectedHotels[0])
    }
  }, [selectedHotels])

  // Handle hotel selection toggle
  const handleToggleHotelSelection = (hotel) => {
    setSelectedHotels(prev => {
      const isSelected = prev.some(h => h.HotelName === hotel.HotelName)
      
      if (isSelected) {
        return []
      } else {
        return [hotel]
      }
    })
    setHasUnsavedChanges(true)
  }

  return {
    selectedHotels,
    handleToggleHotelSelection,
  }
}