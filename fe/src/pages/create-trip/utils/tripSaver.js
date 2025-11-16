import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'

// Saves a manual trip to Firestore in the same shape used by AI trips
// Returns the created trip id
export async function saveManualTrip({ formData, confirmedHotel, tripDays, user }) {
  if (!formData?.location || !confirmedHotel || !Array.isArray(tripDays) || tripDays.length === 0) {
    throw new Error('Incomplete manual trip data')
  }

  // Build itinerary object keyed by Day1..DayN
  const itinerary = {}
  tripDays.forEach(day => {
    const dayKey = `Day${day.dayNumber}`
    itinerary[dayKey] = {
      Day: day.dayNumber,
      Theme: `Custom Itinerary - Day ${day.dayNumber}`,
      BestTimeToVisit: 'Flexible',
      Activities: day.places.map((place, index) => ({
        PlaceName: place.name,
        PlaceDetails: place.address,
        PlaceImageUrl: '/placeholder.jpg',
        GeoCoordinates: {
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon)
        },
        TicketPricing: 'Check on-site',
        TimeTravel: `Activity ${index + 1}`,
        Rating: 'N/A'
      }))
    }
  })

  const manualTripData = {
    Location: formData.location,
    Hotels: [
      {
        HotelName: confirmedHotel.name,
        HotelAddress: confirmedHotel.address,
        Price: 'User selected',
        HotelImageUrl: '/placeholder.jpg',
        GeoCoordinates: {
          latitude: parseFloat(confirmedHotel.lat),
          longitude: parseFloat(confirmedHotel.lon)
        },
        Rating: 'N/A',
        Description: `${confirmedHotel.type} in ${confirmedHotel.city || formData.location}`
      }
    ],
    Itinerary: itinerary
  }

  const id = Date.now().toString()

  const noOfdays = Number(formData?.noOfdays) || tripDays.length
  const budget = formData?.budget || 'Manual'
  const traveler = formData?.traveler || 'Custom'

  await setDoc(doc(db, 'AITrips', id), {
    userSelection: {
      location: formData.location,
      noOfdays,
      budget,
      traveler
    },
    tripData: manualTripData,
    userEmail: user?.email || '',
    id,
    isManual: true
  })

  return id
}
