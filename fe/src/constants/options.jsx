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

  export const AI_PROMPT = `Generate Travel Plan for Location: {location}, for {totalDays} Days for {traveler} with a {budget} budget.

You MUST respond with ONLY valid JSON in this EXACT format with NO additional text or explanations:

[
    {
        "TravelPlan": {
            "Location": "{location}",
            "Duration": "{totalDays} Days",
            "Budget": "{budget}",
            "Traveler": "{traveler}",
            "Hotels": [
                {
                    "HotelName": "string",
                    "HotelAddress": "string",
                    "Price": "string",
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
                "Day1": {
                    "Theme": "string",
                    "BestTimeToVisit": "string",
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
                            "TimeTravel": "string"
                        }
                    ]
                }
            }
        }
    }
]

Rules:
- Provide 2-3 hotel options in the "Hotels" array
- Create itinerary for EXACTLY {totalDays} days using Day1, Day2, Day3, etc.
- Each day MUST have a "Theme", "BestTimeToVisit", and "Activities" array
- Each activity MUST include all fields: PlaceName, PlaceDetails, ImageUrl, GeoCoordinates, TicketPricing, TimeTravel
- Use real image URLs from the internet, not placeholder url
- Return ONLY the JSON array, no markdown code blocks, no explanations`;