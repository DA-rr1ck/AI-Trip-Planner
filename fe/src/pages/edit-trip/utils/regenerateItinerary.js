import { generateTrip } from '@/service/AIModel'

// NEW: Regenerate single day with time slots
export async function regenerateSingleDay(tripData, dayTheme, dayPreference, dayNumber) {
  const SINGLE_DAY_PROMPT = `
Generate activities for Day ${dayNumber} of a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- Day Theme: ${dayTheme}
- User Preference: ${dayPreference}

You MUST return ONLY valid JSON in this EXACT format with NO additional text or explanations:

{
  "Theme": "Day theme that matches user preference",
  "BestTimeToVisit": "Morning/Afternoon/Evening",
  "Morning": {
    "StartTime": "8:00 AM",
    "EndTime": "12:00 PM",
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
        "TimeSlot": "8:00 AM - 10:00 AM",
        "Duration": "2 hours"
      }
    ]
  },
  "Lunch": {
    "StartTime": "12:00 PM",
    "EndTime": "1:30 PM",
    "Activity": {
      "PlaceName": "Restaurant name",
      "PlaceDetails": "Description",
      "ImageUrl": "https://example.com/image.jpg",
      "GeoCoordinates": {
        "Latitude": 0.0,
        "Longitude": 0.0
      },
      "TicketPricing": "Meal cost",
      "TimeSlot": "12:00 PM - 1:30 PM",
      "Duration": "1.5 hours"
    }
  },
  "Afternoon": {
    "StartTime": "1:30 PM",
    "EndTime": "6:00 PM",
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
        "TimeSlot": "1:30 PM - 4:00 PM",
        "Duration": "2.5 hours"
      }
    ]
  },
  "Evening": {
    "StartTime": "6:00 PM",
    "EndTime": "10:00 PM",
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
        "TimeSlot": "6:00 PM - 8:00 PM",
        "Duration": "2 hours"
      }
    ]
  }
}

Rules:
- Morning should have 1-2 activities (8 AM - 12 PM)
- Lunch is always a single restaurant/meal spot (12 PM - 1:30 PM)
- Afternoon should have 1-2 activities (1:30 PM - 6 PM)
- Evening should have 1-2 activities (6 PM - 10 PM)
- All activities must match the user's preference: ${dayPreference}
- Use real image URLs from the internet
- Return ONLY the JSON object, no markdown code blocks, no explanations
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

  // Return with time-slotted structure (IDs will be added in index.jsx)
  return dayData
}

// Full itinerary regeneration (for "Regenerate All" button)
export async function regenerateItinerary(tripData, itineraryPreference, dayCount) {
  const ITINERARY_PROMPT = `
Generate a ${dayCount}-day itinerary for a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- User Preference: ${itineraryPreference}

You MUST return ONLY valid JSON in this EXACT format with NO additional text or explanations:

{
  "Day1": {
    "Theme": "Day theme",
    "BestTimeToVisit": "Morning/Afternoon/Evening",
    "Morning": {
      "StartTime": "8:00 AM",
      "EndTime": "12:00 PM",
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
          "TimeSlot": "8:00 AM - 10:00 AM",
          "Duration": "2 hours"
        }
      ]
    },
    "Lunch": {
      "StartTime": "12:00 PM",
      "EndTime": "1:30 PM",
      "Activity": {
        "PlaceName": "Restaurant name",
        "PlaceDetails": "Description",
        "ImageUrl": "https://example.com/image.jpg",
        "GeoCoordinates": {
          "Latitude": 0.0,
          "Longitude": 0.0
        },
        "TicketPricing": "Meal cost",
        "TimeSlot": "12:00 PM - 1:30 PM",
        "Duration": "1.5 hours"
      }
    },
    "Afternoon": {
      "StartTime": "1:30 PM",
      "EndTime": "6:00 PM",
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
          "TimeSlot": "1:30 PM - 4:00 PM",
          "Duration": "2.5 hours"
        }
      ]
    },
    "Evening": {
      "StartTime": "6:00 PM",
      "EndTime": "10:00 PM",
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
          "TimeSlot": "6:00 PM - 8:00 PM",
          "Duration": "2 hours"
        }
      ]
    }
  },
  "Day2": { ... },
  ...
}

Rules:
- Generate exactly ${dayCount} days using Day1, Day2, Day3, etc.
- Each day MUST have 4 sections: Morning, Lunch, Afternoon, Evening
- Morning should have 1-2 activities (8 AM - 12 PM)
- Lunch is always a single restaurant/meal spot (12 PM - 1:30 PM)
- Afternoon should have 1-2 activities (1:30 PM - 6 PM)
- Evening should have 1-2 activities (6 PM - 10 PM)
- All activities should match the user's preference: ${itineraryPreference}
- Use real image URLs from the internet
- Return ONLY the JSON object, no markdown code blocks, no explanations
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

  return newItinerary
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