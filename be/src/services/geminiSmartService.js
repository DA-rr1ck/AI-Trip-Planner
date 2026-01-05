const { GoogleGenerativeAI } = require('@google/generative-ai');
const { format, differenceInDays, addDays } = require('date-fns');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateSmartTrip(tripParams) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = buildSmartPrompt(tripParams);
    
    console.log('Sending prompt to Gemini (length:', prompt.length, 'chars)');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    
    let cleanedText = text.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '');
    
    const parsedData = JSON.parse(cleanedText);
    
    return parsedData;
}

function buildSmartPrompt(params) {
    const {
        location,
        startDate,
        endDate,
        budgetMin,
        budgetMax,
        adults,
        children,
        childrenAges,
        attractions,
        restaurants,
        hotels  
    } = params;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = differenceInDays(end, start) + 1;
    
   
    const attractionsText = attractions.map((a, idx) => 
        `${idx + 1}. ${a.name} (${a.rating}★) - ${a.description} [Lat: ${a.lat}, Lon: ${a.lon}]`
    ).join('\n');
    
    
    const restaurantsText = restaurants.map((r, idx) => 
        `${idx + 1}. ${r.name} (${r.rating}★, ${r.priceRange}) - ${r.signatureDish} [Lat: ${r.lat}, Lon: ${r.lon}]`
    ).join('\n');
    
   
    const hotelsText = hotels.map((h, idx) => 
        `${idx + 1}. ${h.name} (${h.rating}★, ${h.stars}⭐, ${h.priceRange}) - ${h.description}\n   Check-in: ${h.checkIn}, Check-out: ${h.checkOut}\n   Amenities: ${h.amenities}\n   [Lat: ${h.lat}, Lon: ${h.lon}]`
    ).join('\n');
    
    return `Generate a detailed ${totalDays}-day travel itinerary for ${location}, Vietnam.

**TRIP DETAILS:**
- Dates: ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}
- Travelers: ${adults} Adults${children > 0 ? `, ${children} Children (ages: ${childrenAges.join(', ')})` : ''}
- Budget: $${budgetMin} - $${budgetMax} per person

**AVAILABLE HOTELS (select 2-3 best matching budget and needs):**
${hotelsText}

**AVAILABLE ATTRACTIONS (select best ones for itinerary):**
${attractionsText}

**AVAILABLE RESTAURANTS (use for lunch/dinner recommendations):**
${restaurantsText}

**INSTRUCTIONS:**
1. Select 2-3 hotels from the list above that best match the budget ($${budgetMin}-$${budgetMax}) and traveler needs
2. Some notes about first and last day: 
Day 1 (Arrival):
  * Morning and Lunch are null
  * Afternoon is fixed to start at 2:00 PM with hotel check-in activity (ActivityType: 'hotel_checkin')
  * Include 1-2 light activities after check-in
  * Evening has normal activities
- Last Day (Departure):
  * Morning includes light activities before 11:30 AM
  * Last activity in Morning is hotel check-out at 11:30 AM (ActivityType: 'hotel_checkout')
  * Lunch, Afternoon, Evening are null
3. ONLY use places from the lists above - do NOT invent new places
4. Include exact coordinates (lat/lon) from the lists
5. Create realistic time slots that don't overlap
6. Consider travel time between locations
7. Make activities family-friendly if children are present
8. Activities that are not hotel_checkin or hotel_checkout will have the ActivityType "normal_attraction"

**RESPONSE FORMAT (JSON only, no markdown):**
{
  "Location": "${location}",
  "Duration": "${totalDays} Days",
  "Budget": "$${budgetMin} - $${budgetMax} per person",
  "Travelers": "${adults} Adults${children > 0 ? `, ${children} Children` : ''}",
  "TotalTravelers": ${adults + children},
  "Timezone": "Asia/Ho_Chi_Minh",
  "Hotels": [
    {
      "HotelName": "string (from list above)",
      "HotelAddress": "string",
      "Price": "string (estimate for ${totalDays} nights)",
      "HotelImageUrl": "string",
      "GeoCoordinates": {
        "Latitude": number,
        "Longitude": number
      },
      "Rating": "string",
      "Description": "string"
    }
  ],
  "Itinerary": {
    "${format(start, 'yyyy-MM-dd')}": {
      "Theme": "Arrival & Check-in",
      "Morning": null,
      "Lunch": null,
      "Afternoon": {
        "StartTime": "2:00 PM",
        "EndTime": "6:00 PM",
        "Activities": [
          {
            "ActivityId": "auto-generated",
            "ActivityType": "hotel_checkin",
            "PlaceName": "Hotel Check-in",
            "PlaceDetails": "Check-in at [selected hotel name]",
            "ImageUrl": "string",
            "GeoCoordinates": {
              "Latitude": number,
              "Longitude": number
            },
            "TicketPricing": "Included",
            "TimeSlot": "2:00 PM - 3:00 PM",
            "Duration": "1 hour",
            "BestTimeToVisit": "Afternoon"
          }
        ]
      },
      "Evening": {
        "StartTime": "6:00 PM",
        "EndTime": "10:00 PM",
        "Activities": []
      }
    }
  }
}

Return ONLY the JSON, no explanations or markdown.`;
}

module.exports = {
    generateSmartTrip
};