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

async function fetchHotels(location, priceRanges = ['$', '$$', '$$$'], limit = 5) {
    try {
        console.log(`Fetching hotels for ${location} with price ranges: ${priceRanges.join(', ')}...`);
        
        let query = db.collection('hotels')
            .where('province', '==', location);

        
        if (priceRanges.length > 0 && priceRanges.length < 10) {
            query = query.where('price_range', 'in', priceRanges);
        }

        // Query without orderBy to avoid index issues
        const snapshot = await query.limit(limit * 2).get();

        if (snapshot.empty) {
            console.log(`No hotels found for ${location}`);
            return [];
        }

        const hotels = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        
        hotels.sort((a, b) => {
            // First sort by star rating (5 stars > 4 stars)
            if (b.star_rating !== a.star_rating) {
                return (b.star_rating || 0) - (a.star_rating || 0);
            }
            // by user rating
            return (b.rating || 0) - (a.rating || 0);
        });
        
        
        const limited = hotels.slice(0, limit);
        
        console.log(`Found ${limited.length} hotels for ${location}`);
        return limited;
    } catch (error) {
        console.error('Error fetching hotels:', error);
        
        // Fallback if error occurs
        if (error.code === 9) {
            console.log('Index not ready. Using basic query...');
            
            const snapshot = await db.collection('hotels')
                .where('province', '==', location)
                .limit(limit * 2)
                .get();
            
            const hotels = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            hotels.sort((a, b) => {
                if (b.star_rating !== a.star_rating) {
                    return (b.star_rating || 0) - (a.star_rating || 0);
                }
                return (b.rating || 0) - (a.rating || 0);
            });
            
            return hotels.slice(0, limit);
        }
        
        throw new Error('Failed to fetch hotels from database: ' + error.message);
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
    return places.map(place => {
        const base = {
            name: place.name,
            type: place.type,
            rating: place.rating,
            lat: place.latitude,
            lon: place.longitude,
        };

        // For attractions
        if (place.type === 'Attraction') {
            return {
                ...base,
                hours: `${place.open_time || 'N/A'}-${place.close_time || 'N/A'}`,
                description: place.description ? place.description.substring(0, 100) : 'No description'
            };
        }

        // For restaurants
        if (place.type === 'Restaurant' || place.price_range) {
            return {
                ...base,
                priceRange: place.price_range || 'N/A',
                bestFor: Array.isArray(place.best_for) ? place.best_for.join(', ') : (place.best_for || 'N/A'),
                signatureDish: place.signature_dish || 'N/A'
            };
        }

        // For hotels
        if (place.type === 'Hotel' || place.star_rating) {
            return {
                ...base,
                stars: place.star_rating || 'N/A',
                priceRange: place.price_range || 'N/A',
                checkIn: place.check_in_time || '14:00',
                checkOut: place.check_out_time || '12:00',
                amenities: Array.isArray(place.amenities) ? place.amenities.slice(0, 5).join(', ') : 'N/A',
                description: place.description ? place.description.substring(0, 100) : 'No description'
            };
        }

        return base;
    });
}

module.exports = {
    fetchAttractions,
    fetchRestaurants,
    fetchHotels,  
    getPriceRangesForBudget,
    optimizeForAI
};