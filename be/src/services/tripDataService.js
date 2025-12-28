const { format, addDays } = require('date-fns');

function formatTripData({ rawData, startDate, endDate, location, budgetMin, budgetMax, adults, children, childrenAges }) {
   
    let travelPlan;
    
    if (typeof rawData === 'string') {
        travelPlan = JSON.parse(rawData);
    } else if (Array.isArray(rawData) && rawData[0]?.TravelPlan) {
        travelPlan = rawData[0].TravelPlan;
    } else if (rawData.TravelPlan) {
        travelPlan = rawData.TravelPlan;
    } else {
        travelPlan = rawData;
    }

    // Convert Day1, Day2... to actual dates
    const itineraryWithDates = {};
    
    Object.entries(travelPlan.Itinerary || {}).forEach(([dayKey, dayData], index) => {
        const actualDate = addDays(startDate, index);
        const dateKey = format(actualDate, 'yyyy-MM-dd');
        itineraryWithDates[dateKey] = dayData;
    });

    // Format travelers string
    const travelerParts = [];
    if (adults > 0) travelerParts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
    if (children > 0) {
        const childrenText = `${children} ${children === 1 ? 'Child' : 'Children'}`;
        const agesText = childrenAges.length > 0 ? ` (ages: ${childrenAges.join(', ')})` : '';
        travelerParts.push(childrenText + agesText);
    }
    const travelerString = travelerParts.join(', ');

    return {
        userSelection: {
            location,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            budget: `$${budgetMin.toLocaleString()} - $${budgetMax.toLocaleString()}`,
            traveler: travelerString,
            budgetMin,
            budgetMax,
            adults,
            children,
            childrenAges
        },
        tripData: {
            ...travelPlan,
            Itinerary: itineraryWithDates
        }
    };
}

module.exports = {
    formatTripData
};