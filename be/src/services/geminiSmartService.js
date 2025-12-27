// be/src/services/geminiSmartService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Build optimized prompt with database data
 */
function buildSmartPrompt({ location, startDate, endDate, budgetMin, budgetMax, adults, children, childrenAges, attractions, restaurants }) {
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    const attractionsText = attractions.map((a, idx) => 
        `${idx + 1}. ${a.name} (${a.rating}★, Lat: ${a.lat}, Lon: ${a.lon}) - ${a.description}`
    ).join('\n');
    
    const restaurantsText = restaurants.map((r, idx) => 
        `${idx + 1}. ${r.name} (${r.rating}★, ${r.priceRange}, Lat: ${r.lat}, Lon: ${r.lon}) - Best for: ${r.bestFor}, Signature: ${r.signatureDish}`
    ).join('\n');

    return `Generate a detailed ${days}-day travel itinerary for ${location}, Vietnam.

**TRAVELER INFORMATION:**
- Start Date: ${startDate}
- End Date: ${endDate}
- Travelers: ${adults} adults${children > 0 ? `, ${children} children (ages: ${childrenAges.join(', ')})` : ''}
- Budget: $${budgetMin}-$${budgetMax} per person
- Timezone: Asia/Ho_Chi_Minh

**AVAILABLE ATTRACTIONS (select best ones based on rating and relevance):**
${attractionsText}

**AVAILABLE RESTAURANTS (can be included as activities if desired):**
${restaurantsText}

**INSTRUCTIONS:**
1. Create itinerary for EXACTLY ${days} days using date keys in format: ${startDate}, ${new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0]}, etc.
2. Day 1 (Arrival Day - ${startDate}):
   - Morning: null (arrival time)
   - Lunch: null
   - Afternoon: Start at 2:00 PM with 1-2 light activities from the list
   - Evening: 1-2 activities from the list
3. Last Day (Departure Day - ${endDate}):
   - Morning: 1-2 light activities ending before 12:00 PM
   - Lunch: null
   - Afternoon: null
   - Evening: null
4. Middle days:
   - Morning (8:00 AM - 12:00 PM): 2-3 activities
   - Lunch: null (travelers can choose their own lunch spots)
   - Afternoon (1:30 PM - 6:00 PM): 2-3 activities
   - Evening (6:00 PM - 10:00 PM): 1-2 activities
5. ONLY select places from the provided lists above - use exact names and coordinates
6. Consider operating hours when scheduling
7. If children present, prioritize family-friendly activities
8. Arrange activities logically by proximity (use provided lat/lon coordinates)
9. Each activity MUST include all these fields:
   - ActivityId: Generate unique ID like "activity-{timestamp}-{random}"
   - ActivityType: "normal_attraction" for all activities
   - PlaceName: Exact name from the list
   - PlaceDetails: Description from the list
   - GeoCoordinates: { "Latitude": number, "Longitude": number } - USE EXACT coordinates from the list
   - TimeSlot: "HH:MM AM/PM - HH:MM AM/PM"
   - Duration: "X hours" or "X minutes"
   - BestTimeToVisit: "Morning" or "Afternoon" or "Evening"
   - TicketPricing: Estimate based on budget (e.g., "Free", "$5-10", "$10-20")

**OUTPUT FORMAT (JSON only, no markdown, no code blocks):**
{
  "Location": "${location}",
  "Duration": "${days} Days",
  "Budget": "$${budgetMin} - $${budgetMax} per person",
  "Travelers": "${adults} Adults${children > 0 ? `, ${children} Children` : ''}",
  "TotalTravelers": ${adults + children},
  "Timezone": "Asia/Ho_Chi_Minh",
  "Itinerary": {
    "${startDate}": {
      "Theme": "Arrival & Exploration",
      "Morning": null,
      "Lunch": null,
      "Afternoon": {
        "StartTime": "2:00 PM",
        "EndTime": "6:00 PM",
        "Activities": [
          {
            "ActivityId": "activity-1234567890-abc123",
            "ActivityType": "normal_attraction",
            "PlaceName": "exact name from attractions list",
            "PlaceDetails": "description from the list",
            "GeoCoordinates": {
              "Latitude": 21.0285,
              "Longitude": 105.8542
            },
            "TimeSlot": "2:00 PM - 4:00 PM",
            "Duration": "2 hours",
            "BestTimeToVisit": "Afternoon",
            "TicketPricing": "Free"
          }
        ]
      },
      "Evening": {
        "StartTime": "6:00 PM",
        "EndTime": "10:00 PM",
        "Activities": [
          {
            "ActivityId": "activity-1234567891-def456",
            "ActivityType": "normal_attraction",
            "PlaceName": "exact name from list",
            "PlaceDetails": "description",
            "GeoCoordinates": {
              "Latitude": 21.0333,
              "Longitude": 105.8500
            },
            "TimeSlot": "6:00 PM - 8:00 PM",
            "Duration": "2 hours",
            "BestTimeToVisit": "Evening",
            "TicketPricing": "$5-10"
          }
        ]
      }
    }
  }
}

**CRITICAL RULES:**
- Use EXACT date format for keys: ${startDate}, ${new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0]}, etc. (NOT Day1, Day2)
- Use EXACT coordinates from the provided list for each activity
- Generate unique ActivityId for EVERY activity
- NO lunch time slots - set Lunch to null for all days
- Return ONLY the JSON object, no markdown formatting, no explanations
- Ensure all GeoCoordinates match the attractions/restaurants in the provided lists`;
}

/**
 * Generate trip using Gemini with database data
 */
async function generateSmartTrip(tripParams) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = buildSmartPrompt(tripParams);
        
        console.log('Sending prompt to Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('Raw Gemini response length:', text.length);
        
        // Clean and parse JSON
        let cleanedText = text.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Parse JSON
        const parsedData = JSON.parse(cleanedText);
        
        console.log('Successfully parsed JSON response');
        
        // Return the parsed data directly (should already have the right structure)
        return parsedData;
    } catch (error) {
        console.error('Error generating smart trip:', error);
        console.error('Error details:', error.message);
        throw new Error('Failed to generate trip with AI: ' + error.message);
    }
}

module.exports = {
    generateSmartTrip,
    buildSmartPrompt
};