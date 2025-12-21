import { generateTrip } from '@/service/AIModel'

export async function regenerateHotels(tripData, hotelPreference) {
  const HOTEL_PROMPT = `
Generate 3 hotel recommendations for a trip to ${tripData.Location} with the following details:
- Duration: ${tripData.Duration}
- Budget: ${tripData.Budget}
- Traveler: ${tripData.Traveler}
- User Preference: ${hotelPreference}

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "HotelName": "Hotel Name",
    "HotelAddress": "Full Address",
    "Price": "Price per night",
    "HotelImageUrl": "https://example.com/image.jpg",
    "GeoCoordinates": {
      "Latitude": 0.0,
      "Longitude": 0.0
    },
    "Rating": "X stars",
    "Description": "Brief description"
  }
]
`
  const result = await generateTrip(HOTEL_PROMPT)
  console.log('Raw hotel result:', result)

  let newHotels
  if (typeof result === 'string') {
    const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    newHotels = JSON.parse(cleanResult)
  } else {
    newHotels = result
  }

  return newHotels
}