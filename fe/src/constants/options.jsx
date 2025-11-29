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
                    "Theme": "string",
                    "BestTimeToVisit": "string",
                    "Morning": {
                        "StartTime": "8:00 AM",
                        "EndTime": "12:00 PM",
                        "Activities": [
                            {
                                "PlaceName": "string",
                                "PlaceDetails": "string (consider age-appropriate activities based on children's ages)",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "string (calculate for {adults} adults and {children} children)",
                                "TimeSlot": "8:00 AM - 10:00 AM",
                                "Duration": "2 hours"
                            }
                        ]
                    },
                    "Lunch": {
                        "StartTime": "12:00 PM",
                        "EndTime": "1:30 PM",
                        "Activity": {
                            "PlaceName": "string (restaurant name)",
                            "PlaceDetails": "string",
                            "ImageUrl": "string",
                            "GeoCoordinates": {
                                "Latitude": number,
                                "Longitude": number
                            },
                            "TicketPricing": "string (meal cost for all travelers)",
                            "TimeSlot": "12:00 PM - 1:30 PM",
                            "Duration": "1.5 hours"
                        }
                    },
                    "Afternoon": {
                        "StartTime": "1:30 PM",
                        "EndTime": "6:00 PM",
                        "Activities": [
                            {
                                "PlaceName": "string",
                                "PlaceDetails": "string",
                                "ImageUrl": "string",
                                "GeoCoordinates": {
                                    "Latitude": number,
                                    "Longitude": number
                                },
                                "TicketPricing": "string",
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
                }
            }
        }
    }
]

Rules:
- Provide 2-3 hotel options suitable for {adults} adults and {children} children
- Hotel prices should accommodate the total number of travelers
- If children > 0, prioritize family-friendly hotels and activities
- Consider children's ages: infants (0-2), toddlers (3-5), kids (6-12), teens (13-17) need different activities
- Create itinerary for EXACTLY {totalDays} days using Day1, Day2, Day3, etc.
- Each day MUST have 4 sections: Morning, Lunch, Afternoon, Evening
- Morning should have 1-2 activities (8 AM - 12 PM)
- Lunch is always a single restaurant/meal spot (12 PM - 1:30 PM)
- Afternoon should have 1-2 activities (1:30 PM - 6 PM)
- Evening should have 1-2 activities (6 PM - 10 PM)
- Each activity MUST include: PlaceName, PlaceDetails, ImageUrl, GeoCoordinates, TicketPricing, TimeSlot, Duration
- TimeSlots must be realistic and sequential (no overlaps)
- Activities should be age-appropriate based on the children's ages
- Budget range is per person: total trip budget = ({budgetMin} to {budgetMax}) × ({adults} + {children})
- Use real image URLs from the internet, not placeholder URLs
- Return ONLY the JSON array, no markdown code blocks, no explanations`;