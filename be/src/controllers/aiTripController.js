// be/src/controllers/aiTripController.js
const { generateTripWithGemini } = require('../services/geminiService');
const { validateTripInput } = require('../services/tripValidationService');
const { formatTripData } = require('../services/tripDataService');
const { db } = require('../config/firebase');
const { format, addDays, differenceInDays } = require('date-fns');

async function generateAITrip(req, res) {
    try {
        const { 
            location, 
            startDate, 
            endDate, 
            budgetMin, 
            budgetMax, 
            adults, 
            children, 
            childrenAges 
        } = req.body;

        console.log('Generating AI trip for:', location);

        // 1. Validate input
        const validation = validateTripInput({
            location,
            startDate,
            endDate,
            budgetMin,
            budgetMax,
            adults,
            children,
            childrenAges
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // 2. Calculate trip details
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = differenceInDays(end, start) + 1;

        // 3. Build AI prompt
        const prompt = buildAIPrompt({
            location,
            totalDays,
            adults,
            children,
            childrenAges,
            budgetMin,
            budgetMax
        });

        // 4. Generate trip with Gemini
        const rawTripData = await generateTripWithGemini(prompt);

        // 5. Format and enhance trip data
        const formattedTrip = formatTripData({
            rawData: rawTripData,
            startDate: start,
            endDate: end,
            location,
            budgetMin,
            budgetMax,
            adults,
            children,
            childrenAges
        });

        // 6. Save to Firestore (optional - or save from frontend)
        const tripId = Date.now().toString();
        
        // Return trip data to frontend
        return res.json({
            success: true,
            tripId,
            tripData: formattedTrip
        });

    } catch (error) {
        console.error('Error generating AI trip:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate trip'
        });
    }
}

function buildAIPrompt({ location, totalDays, adults, children, childrenAges, budgetMin, budgetMax }) {
    // Convert childrenAges array to string
    const childrenAgesStr = Array.isArray(childrenAges) && childrenAges.length > 0 
        ? childrenAges.join(', ') 
        : 'N/A';

    const totalTravelers = adults + children;

    return `Generate Travel Plan for Location: ${location}, for ${totalDays} Days for ${adults} Adults and ${children} Children (ages: ${childrenAgesStr}) with a budget range of ${budgetMin} to ${budgetMax} per person.

You MUST respond with ONLY valid JSON in this EXACT format with NO additional text or explanations:

[
    {
        "TravelPlan": {
            "Location": "${location}",
            "Duration": "${totalDays} Days",
            "Budget": "${budgetMin} - ${budgetMax} per person",
            "Travelers": "${adults} Adults, ${children} Children (ages: ${childrenAgesStr})",
            "TotalTravelers": ${totalTravelers},
            "Timezone": "Asia/Ho_Chi_Minh",
            "Hotels": [
                {
                    "HotelName": "string",
                    "HotelAddress": "string",
                    "Price": "string (consider the number of travelers and budget range)",
                    "HotelImageUrl": "string",
                    "GeoCoordinates": {
                        "Latitude": number,
                        "Longitude": number
                    },
                    "Rating": "string",
                    "Description": "string (mention if family-friendly when children > 0, consider children's ages)"
                }
            ],
            "Itinerary": {
                "Day1": {
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
                                "PlaceDetails": "Check-in at {selected_hotel_name}",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "Included",
                                "TimeSlot": "2:00 PM - 3:00 PM",
                                "Duration": "1 hour",
                                "BestTimeToVisit": "Afternoon"
                            },
                            {
                                "ActivityId": "auto-generated",
                                "ActivityType": "normal_attraction",
                                "PlaceName": "string",
                                "PlaceDetails": "string (light activity near hotel)",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "string",
                                "TimeSlot": "3:30 PM - 5:30 PM",
                                "Duration": "2 hours",
                                "BestTimeToVisit": "Afternoon"
                            }
                        ]
                    },
                    "Evening": {
                        "StartTime": "6:00 PM",
                        "EndTime": "10:00 PM",
                        "Activities": [
                            {
                                "ActivityId": "auto-generated",
                                "ActivityType": "normal_attraction",
                                "PlaceName": "string",
                                "PlaceDetails": "string",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "string",
                                "TimeSlot": "6:00 PM - 8:00 PM",
                                "Duration": "2 hours",
                                "BestTimeToVisit": "Evening"
                            }
                        ]
                    }
                },
                "Day${totalDays}": {
                    "Theme": "Departure & Check-out",
                    "Morning": {
                        "StartTime": "8:00 AM",
                        "EndTime": "12:00 PM",
                        "Activities": [
                            {
                                "ActivityId": "auto-generated",
                                "ActivityType": "normal_attraction",
                                "PlaceName": "string",
                                "PlaceDetails": "string (light activity before checkout)",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "string",
                                "TimeSlot": "8:00 AM - 11:30 AM",
                                "Duration": "3 hours",
                                "BestTimeToVisit": "Morning"
                            },
                            {
                                "ActivityId": "auto-generated",
                                "ActivityType": "hotel_checkout",
                                "PlaceName": "Hotel Check-out",
                                "PlaceDetails": "Check-out from {selected_hotel_name}",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "Included",
                                "TimeSlot": "11:30 AM - 12:00 PM",
                                "Duration": "30 minutes",
                                "BestTimeToVisit": "Morning"
                            }
                        ]
                    },
                    "Lunch": null,
                    "Afternoon": null,
                    "Evening": null
                }
            }
        }
    }
]

Rules:
- Timezone is ALWAYS "Asia/Ho_Chi_Minh" for Vietnam
- Provide 2-3 hotel options suitable for ${adults} adults and ${children} children
- Hotel prices should accommodate the total number of travelers
- If children > 0, prioritize family-friendly hotels and activities
- Create itinerary for EXACTLY ${totalDays} days using Day1, Day2, Day3, etc.
- Each activity MUST include: ActivityId, ActivityType, PlaceName, PlaceDetails, ImageUrl, GeoCoordinates, TicketPricing, TimeSlot, Duration (PlaceName must only be the real name of the location, no extra text)
- ActivityType must be one of: 'hotel_checkin', 'hotel_checkout', 'normal_attraction'
- Day 1 (Arrival):
  * Morning and Lunch are null
  * Afternoon is fixed to start at 2:00 PM with hotel check-in activity (ActivityType: 'hotel_checkin')
  * Include 1-2 light activities after check-in
  * Evening has normal activities
- Last Day (Departure):
  * Morning includes light activities before 11:30 AM
  * Last activity in Morning is hotel check-out at 11:30 AM (ActivityType: 'hotel_checkout')
  * Lunch, Afternoon, Evening are null
- Middle days (Day2 to Day${totalDays - 1}):
  * Full schedule: Morning, Lunch, Afternoon, Evening
  * All activities have ActivityType: 'normal_attraction'
  * All activities have the field BestTimeToVisit indicating the recommended time to visit
- TimeSlots must be realistic and sequential (no overlaps)
- Activities should be age-appropriate based on the children's ages
- Budget range is per person: total trip budget = (${budgetMin} to ${budgetMax}) × (${adults} + ${children})
- Use real image URLs from the internet, not placeholder URLs
- Return ONLY the JSON array, no markdown code blocks, no explanations`;
}

module.exports = {
    generateAITrip
};