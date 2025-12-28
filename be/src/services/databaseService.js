// be/src/services/databaseService.js
const { db } = require('../config/firebase');

/**
 * Fetch attractions from Firestore based on filters
 */
async function fetchAttractions(location, limit = 30) {
    try {
        console.log(`Fetching attractions for ${location}...`);
        
        const snapshot = await db.collection('places')
            .where('province', '==', location)
            .where('type', '==', 'Attraction')
            .orderBy('rating', 'desc')
            .limit(limit)
            .get();

        if (snapshot.empty) {
            console.log(`No attractions found for ${location}`);
            return [];
        }

        const attractions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`Found ${attractions.length} attractions for ${location}`);
        return attractions;
    } catch (error) {
        console.error('Error fetching attractions:', error);
        
        // If index not ready yet, suggest fallback
        if (error.code === 9) {
            console.log('Index not ready yet. Using fallback query without orderBy...');
            
            // Fallback: Query without orderBy
            const snapshot = await db.collection('places')
                .where('province', '==', location)
                .where('type', '==', 'Attraction')
                .limit(limit)
                .get();
            
            const attractions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort in memory
            attractions.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            
            return attractions;
        }
        
        throw new Error('Failed to fetch attractions from database: ' + error.message);
    }
}

/**
 * Fetch restaurants from Firestore based on filters
 */
async function fetchRestaurants(location, priceRanges = ['$', '$$', '$$$'], limit = 20) {
    try {
        console.log(`Fetching restaurants for ${location} with price ranges: ${priceRanges.join(', ')}...`);
        
        let query = db.collection('restaurants')
            .where('province', '==', location);

        // If price range filtering is needed
        if (priceRanges.length > 0 && priceRanges.length < 10) {
            query = query.where('price_range', 'in', priceRanges);
        }

        const snapshot = await query
            .orderBy('rating', 'desc')
            .limit(limit)
            .get();

        if (snapshot.empty) {
            console.log(`No restaurants found for ${location}`);
            return [];
        }

        const restaurants = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`Found ${restaurants.length} restaurants for ${location}`);
        return restaurants;
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        
        // If index not ready yet, use fallback
        if (error.code === 9) {
            console.log('Index not ready yet. Using fallback query without orderBy...');
            
            let query = db.collection('restaurants')
                .where('province', '==', location);

            if (priceRanges.length > 0 && priceRanges.length < 10) {
                query = query.where('price_range', 'in', priceRanges);
            }

            const snapshot = await query.limit(limit).get();
            
            const restaurants = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort in memory
            restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            
            return restaurants;
        }
        
        throw new Error('Failed to fetch restaurants from database: ' + error.message);
    }
}

/**
 * Determine price ranges based on budget
 */
function getPriceRangesForBudget(budgetMin, budgetMax) {
    const avgBudget = (budgetMin + budgetMax) / 2;
    
    if (avgBudget < 500) {
        return ['$'];
    } else if (avgBudget < 1500) {
        return ['$', '$$'];
    } else if (avgBudget < 3000) {
        return ['$$', '$$$'];
    } else {
        return ['$$$', '$$$$'];
    }
}

/**
 * Optimize data for AI - reduce token usage
 */
function optimizeForAI(places) {
    return places.map(place => ({
        name: place.name,
        type: place.type,
        rating: place.rating,
        hours: `${place.open_time || 'N/A'}-${place.close_time || 'N/A'}`,
        description: place.description ? place.description.substring(0, 100) : 'No description',
        lat: place.latitude,
        lon: place.longitude,
        // For restaurants
        priceRange: place.price_range || 'N/A',
        bestFor: Array.isArray(place.best_for) ? place.best_for.join(', ') : (place.best_for || 'N/A'),
        signatureDish: place.signature_dish || 'N/A'
    }));
}

module.exports = {
    fetchAttractions,
    fetchRestaurants,
    getPriceRangesForBudget,
    optimizeForAI
};