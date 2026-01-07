import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'

const TIME_SLOTS = [
  { key: 'Morning', start: '8:00 AM', end: '12:00 PM' },
  { key: 'Lunch', start: '12:00 PM', end: '1:30 PM' },
  { key: 'Afternoon', start: '1:30 PM', end: '6:00 PM' },
  { key: 'Evening', start: '6:00 PM', end: '10:00 PM' },
]

function placeToActivity(place, fallbackIndex, timeSlot) {
  return {
    PlaceName: place.name,
    PlaceDetails: place.address,
    PlaceImageUrl: '/placeholder.jpg',
    GeoCoordinates: {
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    },
    TicketPricing: 'Check on-site',
    TimeTravel: `Activity ${fallbackIndex + 1}`,
    TimeSlot: timeSlot || 'N/A',
    Rating: 'N/A'
  }
}

function getAllPlacesForDay(day) {
  if (day?.slots) {
    const ordered = []
    for (const slot of TIME_SLOTS) {
      ordered.push(...(day.slots?.[slot.key] || []))
    }
    return ordered
  }
  return Array.isArray(day?.places) ? day.places : []
}

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

    const allPlaces = getAllPlacesForDay(day)

    const toActivities = (places, slotKey, startIndexOffset) =>
      places.map((place, idx) => placeToActivity(place, startIndexOffset + idx, slotKey))

    const slots = day.slots || null
    const morningPlaces = slots?.Morning || []
    const lunchPlaces = slots?.Lunch || []
    const afternoonPlaces = slots?.Afternoon || []
    const eveningPlaces = slots?.Evening || []

    const morningActivities = toActivities(morningPlaces, 'Morning', 0)
    const lunchActivity = lunchPlaces[0] ? placeToActivity(lunchPlaces[0], morningActivities.length, 'Lunch') : null
    const afternoonActivities = toActivities(afternoonPlaces, 'Afternoon', morningActivities.length + (lunchActivity ? 1 : 0))
    const eveningActivities = toActivities(eveningPlaces, 'Evening', morningActivities.length + (lunchActivity ? 1 : 0) + afternoonActivities.length)

    itinerary[dayKey] = {
      Day: day.dayNumber,
      Theme: `Custom Itinerary - Day ${day.dayNumber}`,
      BestTimeToVisit: 'Flexible',
      // New AI-compatible time-slotted structure
      Morning: {
        StartTime: '8:00 AM',
        EndTime: '12:00 PM',
        Activities: morningActivities,
      },
      Lunch: {
        StartTime: '12:00 PM',
        EndTime: '1:30 PM',
        Activity: lunchActivity,
      },
      Afternoon: {
        StartTime: '1:30 PM',
        EndTime: '6:00 PM',
        Activities: afternoonActivities,
      },
      Evening: {
        StartTime: '6:00 PM',
        EndTime: '10:00 PM',
        Activities: eveningActivities,
      },

      // Backward-compatible flat list (used by older UIs)
      Activities: allPlaces.map((place, index) => placeToActivity(place, index, place.timeSlot))
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
