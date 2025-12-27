// be/src/services/geminiSmartService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Build optimized prompt with database data
 */
function buildSmartPrompt({ location, startDate, endDate, budgetMin, budgetMax, adults, children, childrenAges, attractions, restaurants }) {
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    const attractionsText = attractions.map((a, idx) => 
        `${idx + 1}. ${a.name} (${a.rating}★) - ${a.description}`
    ).join('\n');
    
    const restaurantsText = restaurants.map((r, idx) => 
        `${idx + 1}. ${r.name} (${r.rating}★, ${r.priceRange}) - Best for: ${r.bestFor}, Signature: ${r.signatureDish}`
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

**AVAILABLE RESTAURANTS (select for meals):**
${restaurantsText}

**INSTRUCTIONS:**
1. Create itinerary for EXACTLY ${days} days (Day1, Day2, Day3, etc.)
2. Day 1 (Arrival Day):
   - Morning: null (arrival time)
   - Lunch: null
   - Afternoon: Start at 2:00 PM with 1-2 light activities from the list
   - Evening: 1-2 activities from the list
3. Day ${days} (Departure Day):
   - Morning: 1-2 light activities ending before 12:00 PM
   - Lunch: null
   - Afternoon: null
   - Evening: null
4. Middle days (Day2 to Day${days - 1}):
   - Morning (8:00 AM - 12:00 PM): 1-2 activities
   - Lunch (12:00 PM - 1:30 PM): Select 1 restaurant
   - Afternoon (1:30 PM - 6:00 PM): 1-2 activities
   - Evening (6:00 PM - 10:00 PM): 1-2 activities
5. ONLY select places from the provided lists above - use exact names
6. Consider operating hours when scheduling
7. Match restaurant price ranges to budget
8. If children present, prioritize family-friendly activities
9. Arrange activities logically by proximity (use lat/lon coordinates)
10. Each activity must include: PlaceName (exact name from list), PlaceDetails, TimeSlot, Duration, BestTimeToVisit

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "TravelPlan": {
    "Location": "${location}",
    "Duration": "${days} Days",
    "Budget": "$${budgetMin} - $${budgetMax} per person",
    "Travelers": "${adults} Adults${children > 0 ? `, ${children} Children` : ''}",
    "TotalTravelers": ${adults + children},
    "Timezone": "Asia/Ho_Chi_Minh",
    "Itinerary": {
      "Day1": {
        "Theme": "Arrival & Exploration",
        "Morning": null,
        "Lunch": null,
        "Afternoon": {
          "StartTime": "2:00 PM",
          "EndTime": "6:00 PM",
          "Activities": [
            {
              "PlaceName": "exact name from attractions list",
              "PlaceDetails": "description from the list",
              "TimeSlot": "2:00 PM - 4:00 PM",
              "Duration": "2 hours",
              "BestTimeToVisit": "Afternoon",
              "TicketPricing": "estimate based on budget"
            }
          ]
        },
        "Evening": {
          "StartTime": "6:00 PM",
          "EndTime": "10:00 PM",
          "Activities": [...]
        }
      },
      "Day2": {
        "Theme": "...",
        "Morning": {
          "StartTime": "8:00 AM",
          "EndTime": "12:00 PM",
          "Activities": [...]
        },
        "Lunch": {
          "StartTime": "12:00 PM",
          "EndTime": "1:30 PM",
          "Activity": {
            "PlaceName": "exact restaurant name from list",
            "PlaceDetails": "description",
            "TimeSlot": "12:00 PM - 1:30 PM",
            "Duration": "1.5 hours",
            "BestTimeToVisit": "Afternoon",
            "TicketPricing": "based on price_range"
          }
        },
        "Afternoon": {...},
        "Evening": {...}
      }
    }
  }
}

Return ONLY valid JSON, no explanations or markdown.`;
}

/**
 * Generate trip using Gemini with database data
 */
async function generateSmartTrip(tripParams) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = buildSmartPrompt(tripParams);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean and parse JSON
        let cleanedText = text.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Parse JSON
        const parsedData = JSON.parse(cleanedText);
        
        // Handle both array and object responses
        if (Array.isArray(parsedData)) {
            return parsedData[0].TravelPlan || parsedData[0];
        } else if (parsedData.TravelPlan) {
            return parsedData.TravelPlan;
        } else {
            return parsedData;
        }
    } catch (error) {
        console.error('Error generating smart trip:', error);
        throw new Error('Failed to generate trip with AI: ' + error.message);
    }
}

module.exports = {
    generateSmartTrip,
    buildSmartPrompt
};