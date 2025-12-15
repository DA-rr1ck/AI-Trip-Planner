// be/src/controllers/smartTripController.js
const { 
    fetchAttractions, 
    fetchRestaurants, 
    getPriceRangesForBudget, 
    optimizeForAI 
} = require('../services/databaseService');
const { generateSmartTrip } = require('../services/geminiSmartService');

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

        // 1. Fetch attractions from database
        console.log('Fetching attractions...');
        const attractions = await fetchAttractions(location, 30);
        
        if (attractions.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No attractions found for ${location}. Please check if data exists in database.`
            });
        }

        // 2. Fetch restaurants from database
        console.log('Fetching restaurants...');
        const priceRanges = getPriceRangesForBudget(budgetMin || 500, budgetMax || 2000);
        const restaurants = await fetchRestaurants(location, priceRanges, 20);

        // 3. Optimize data for AI (reduce tokens)
        console.log('Optimizing data for AI...');
        const optimizedAttractions = optimizeForAI(attractions);
        const optimizedRestaurants = optimizeForAI(restaurants);

        // 4. Generate trip with Gemini
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
            restaurants: optimizedRestaurants
        });

        // 5. Add metadata
        tripPlan.generationMethod = 'smart_database';
        tripPlan.databaseStats = {
            attractionsAvailable: attractions.length,
            restaurantsAvailable: restaurants.length,
            priceRangesUsed: priceRanges
        };

        console.log('Smart trip generated successfully!');

        return res.json({
            success: true,
            data: tripPlan,
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