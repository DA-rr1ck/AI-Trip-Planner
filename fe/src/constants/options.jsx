export const SelectTravelesList = [
  {
    id: 1,
    title: 'Just Me',
    desc: 'A sole traveles in exploration',
    icon: '✈️',
    people: '1'
  },
  {
    id: 2,
    title: 'A Couple',
    desc: 'Two traveles in tandem',
    icon: '💑',
    people: '2 People'
  },
  {
    id: 3,
    title: 'Family',
    desc: 'A group of fun loving adventure',
    icon: '👨‍👩‍👧',
    people: '3 to 5 People'
  }
];

export const SelectBudgetOptions = [
  {
    id: 1,
    title: 'Cheap',
    desc: 'Stay conscious of costs',
    icon: '💰',
  },
  {
    id: 2,
    title: 'Moderate',
    desc: 'Keep cost on the average side',
    icon: '💵',
  },
  {
    id: 3,
    title: 'Luxury',
    desc: 'Dont worry about the cost',
    icon: '✨',
  }
];

export const REGION_OPTIONS = [
  { code: 'VN', cc: '84', label: '🇻🇳 Vietnam (+84)',    example: '912345678', min: 9,  max: 10 },
  { code: 'US', cc: '1',  label: '🇺🇸 United States (+1)', example: '4155552671', min: 10, max: 10 },
  { code: 'GB', cc: '44', label: '🇬🇧 United Kingdom (+44)', example: '7123456789', min: 10, max: 10 },
  { code: 'SG', cc: '65', label: '🇸🇬 Singapore (+65)',  example: '81234567',   min: 8,  max: 8  },
  { code: 'TH', cc: '66', label: '🇹🇭 Thailand (+66)',   example: '812345678',  min: 9,  max: 9  },
  { code: 'JP', cc: '81', label: '🇯🇵 Japan (+81)',      example: '7012345678', min: 10, max: 10 },
  { code: 'KR', cc: '82', label: '🇰🇷 South Korea (+82)', example: '1012345678', min: 10, max: 10 },
  { code: 'DE', cc: '49', label: '🇩🇪 Germany (+49)',    example: '15123456789',min: 10, max: 11 },
  { code: 'FR', cc: '33', label: '🇫🇷 France (+33)',     example: '612345678',  min: 9,  max: 9  },
  { code: 'AU', cc: '61', label: '🇦🇺 Australia (+61)',  example: '412345678',  min: 9,  max: 9  },
];



export const AI_PROMPT = `Generate Travel Plan for Location: {location}, for {totalDays} Days for {adults} Adults and {children} Children (ages: {childrenAges}) with a budget range of {budgetMin} to {budgetMax} per person.

You MUST respond with ONLY valid JSON in this EXACT format with NO additional text or explanations:

[
    {
        "TravelPlan": {
            "Location": "{location}",
            "Duration": "{totalDays} Days",
            "Budget": "{budgetMin} - {budgetMax} per person",
            "Travelers": "{adults} Adults, {children} Children (ages: {childrenAges})",
            "TotalTravelers": {adults} + {children},
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
                    "BestTimeToVisit": "Afternoon",
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
                                "Duration": "1 hour"
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
                                "Duration": "2 hours"
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
                                "Duration": "2 hours"
                            }
                        ]
                    }
                },
                "Day{totalDays}": {
                    "Theme": "Departure & Check-out",
                    "BestTimeToVisit": "Morning",
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
                                "Duration": "3 hours"
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
                                "Duration": "30 minutes"
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
- Provide 2-3 hotel options suitable for {adults} adults and {children} children
- Hotel prices should accommodate the total number of travelers
- If children > 0, prioritize family-friendly hotels and activities
- Create itinerary for EXACTLY {totalDays} days using Day1, Day2, Day3, etc.
- Each activity MUST include: ActivityId, ActivityType, PlaceName, PlaceDetails, ImageUrl, GeoCoordinates, TicketPricing, TimeSlot, Duration
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
- Middle days (Day2 to Day{totalDays-1}):
  * Full schedule: Morning, Lunch, Afternoon, Evening
  * All activities have ActivityType: 'normal_attraction'
- TimeSlots must be realistic and sequential (no overlaps)
- Activities should be age-appropriate based on the children's ages
- Budget range is per person: total trip budget = ({budgetMin} to {budgetMax}) × ({adults} + {children})
- Use real image URLs from the internet, not placeholder URLs
- Return ONLY the JSON array, no markdown code blocks, no explanations`;