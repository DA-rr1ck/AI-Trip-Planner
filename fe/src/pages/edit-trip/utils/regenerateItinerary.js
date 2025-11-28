// fe/src/pages/edit-trip/utils/regenerateItinerary.js
import { generateTrip } from '@/service/AIModel'

// NEW: Regenerate single day
export async function regenerateSingleDay(tripData, dayTheme, dayPreference, dayNumber) {
  const SINGLE_DAY_PROMPT = `
Generate activities for Day ${dayNumber} of a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- Day Theme: ${dayTheme}
- User Preference: ${dayPreference}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "Theme": "Day theme",
  "BestTimeToVisit": "Morning/Afternoon/Evening",
  "Activities": [
    {
      "PlaceName": "Place Name",
      "PlaceDetails": "Description",
      "ImageUrl": "https://example.com/image.jpg",
      "GeoCoordinates": {
        "Latitude": 0.0,
        "Longitude": 0.0
      },
      "TicketPricing": "Price or Free",
      "TimeTravel": "Duration"
    }
  ]
}

Generate 3-5 activities that match the user's preference: ${dayPreference}
`
  const result = await generateTrip(SINGLE_DAY_PROMPT)
  console.log('Raw single day result:', result)

  let dayData
  if (typeof result === 'string') {
    const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    dayData = JSON.parse(cleanResult)
  } else {
    dayData = result
  }

  // Add unique IDs to activities
  const activitiesWithIds = dayData.Activities.map((activity, idx) => ({
    ...activity,
    id: `day${dayNumber}-activity-${idx}-${Date.now()}-${Math.random()}`,
  }))

  return {
    ...dayData,
    Activities: activitiesWithIds,
  }
}

// Keep the existing full itinerary regeneration (for reference/backward compatibility)
export async function regenerateItinerary(tripData, itineraryPreference, dayCount) {
  const ITINERARY_PROMPT = `
Generate a ${dayCount}-day itinerary for a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- User Preference: ${itineraryPreference}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "Day1": {
    "Theme": "Day theme",
    "BestTimeToVisit": "Morning/Afternoon/Evening",
    "Activities": [
      {
        "PlaceName": "Place Name",
        "PlaceDetails": "Description",
        "ImageUrl": "https://example.com/image.jpg",
        "GeoCoordinates": {
          "Latitude": 0.0,
          "Longitude": 0.0
        },
        "TicketPricing": "Price or Free",
        "TimeTravel": "Duration"
      }
    ]
  },
  "Day2": { ... },
  ...
}

Generate ${dayCount} days with 3-4 activities per day.
`
  const result = await generateTrip(ITINERARY_PROMPT)
  console.log('Raw itinerary result:', result)

  let newItinerary
  if (typeof result === 'string') {
    const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    newItinerary = JSON.parse(cleanResult)
  } else {
    newItinerary = result
  }

  // Add unique IDs to activities
  const itineraryWithIds = {}
  Object.entries(newItinerary).forEach(([dayKey, dayData]) => {
    itineraryWithIds[dayKey] = {
      ...dayData,
      Activities: dayData.Activities.map((activity, idx) => ({
        ...activity,
        id: `${dayKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
      })),
    }
  })

  return itineraryWithIds
}






/*
import { generateTrip } from '@/service/AIModel'

export async function regenerateItinerary(tripData, itineraryPreference, dayCount) {
  const ITINERARY_PROMPT = `
Generate a ${dayCount}-day itinerary for a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- User Preference: ${itineraryPreference}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "Day1": {
    "Theme": "Day theme",
    "BestTimeToVisit": "Morning/Afternoon/Evening",
    "Activities": [
      {
        "PlaceName": "Place Name",
        "PlaceDetails": "Description",
        "ImageUrl": "https://example.com/image.jpg",
        "GeoCoordinates": {
          "Latitude": 0.0,
          "Longitude": 0.0
        },
        "TicketPricing": "Price or Free",
        "TimeTravel": "Duration"
      }
    ]
  },
  "Day2": { ... },
  ...
}

Generate ${dayCount} days with 3-4 activities per day.
`
  const result = await generateTrip(ITINERARY_PROMPT)
  console.log('Raw itinerary result:', result)

  let newItinerary
  if (typeof result === 'string') {
    const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    newItinerary = JSON.parse(cleanResult)
  } else {
    newItinerary = result
  }

  // Add unique IDs to activities
  const itineraryWithIds = {}
  Object.entries(newItinerary).forEach(([dayKey, dayData]) => {
    itineraryWithIds[dayKey] = {
      ...dayData,
      Activities: dayData.Activities.map((activity, idx) => ({
        ...activity,
        id: `${dayKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
      })),
    }
  })

  return itineraryWithIds
}

*/