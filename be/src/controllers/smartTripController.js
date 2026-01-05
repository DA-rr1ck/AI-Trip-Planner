const { 
    fetchAttractions, 
    fetchRestaurants,
    fetchHotels, 
    getPriceRangesForBudget, 
    optimizeForAI 
} = require('../services/databaseService');
const { generateSmartTrip } = require('../services/geminiSmartService');
const { db } = require('../config/firebase'); 

/**
 * POST /api/smart-trip/generate
 * Generate trip using database + AI
 */
async function generateSmartTripController(req, res) {
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

        // Validate required fields
        if (!location || !startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: location, startDate, endDate' 
            });
        }

        console.log(`Generating smart trip for ${location}...`);

        // 1. Fetch attractions
        console.log('Fetching attractions...');
        const attractions = await fetchAttractions(location, 30);
        
        if (attractions.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No attractions found for ${location}. Please check if data exists in database.`
            });
        }

        // 2. Fetch restaurants
        console.log('Fetching restaurants...');
        const priceRanges = getPriceRangesForBudget(budgetMin || 500, budgetMax || 2000);
        const restaurants = await fetchRestaurants(location, priceRanges, 20);

        // 3. Fetch hotels
        console.log('Fetching hotels...');
        const hotels = await fetchHotels(location, priceRanges, 5);

        // 4. Optimize data for AI
        console.log('Optimizing data for AI...');
        const optimizedAttractions = optimizeForAI(attractions);
        const optimizedRestaurants = optimizeForAI(restaurants);
        const optimizedHotels = optimizeForAI(hotels);

        // 5. Generate trip with Gemini
        console.log('Calling Gemini API...');
        const tripPlan = await generateSmartTrip({
            location,
            startDate,
            endDate,
            budgetMin: budgetMin || 500,
            budgetMax: budgetMax || 2000,
            adults: adults || 2,
            children: children || 0,
            childrenAges: childrenAges || [],
            attractions: optimizedAttractions,
            restaurants: optimizedRestaurants,
            hotels: optimizedHotels
        });

        // 6. Add metadata
        tripPlan.generationMethod = 'smart_database';
        tripPlan.databaseStats = {
            attractionsAvailable: attractions.length,
            restaurantsAvailable: restaurants.length,
            hotelsAvailable: hotels.length,
            priceRangesUsed: priceRanges
        };

        console.log('Smart trip generated successfully!');

        // ✅ 7. Return trip data WITHOUT saving to Firestore
        // Frontend will handle preview and saving
        return res.json({
            success: true,
            tripData: tripPlan,  // Return the generated trip
            message: 'Trip generated successfully using database + AI'
        });

    } catch (error) {
        console.error('Error in generateSmartTripController:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}

/**
 * GET /api/smart-trip/locations
 * Get available locations from database
 */
async function getAvailableLocations(req, res) {
    try {
        const { db } = require('../config/firebase');
        
        // Get unique provinces from places collection
        const snapshot = await db.collection('places')
            .select('province')
            .get();
        
        const provinces = new Set();
        snapshot.docs.forEach(doc => {
            const province = doc.data().province;
            if (province) provinces.add(province);
        });
        
        return res.json({
            success: true,
            locations: Array.from(provinces).sort()
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    generateSmartTripController,
    getAvailableLocations
};