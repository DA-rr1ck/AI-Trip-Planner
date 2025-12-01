const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_ENDPOINT = 'https://serpapi.com/search';

/**
 * Helper to format date to YYYY-MM-DD
 */
function formatDateToYYYYMMDD(dateStr) {
    if (!dateStr) return null;
    // If already in YYYY-MM-DD format, return as is
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // Try to parse the date string
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    // Format as YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Build base params from query.
 */
function buildBaseParams(query) {
    const {
        q,
        check_in_date,
        check_out_date,
        adults,
        children,
        children_ages,
        currency,
        hl,
        gl,
    } = query;

    // Format dates to YYYY-MM-DD (handles various input formats)
    const formattedCheckIn = formatDateToYYYYMMDD(check_in_date);
    const formattedCheckOut = formatDateToYYYYMMDD(check_out_date);

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_hotels',
    };

    if (q) params.q = q;
    if (formattedCheckIn) params.check_in_date = formattedCheckIn;
    if (formattedCheckOut) params.check_out_date = formattedCheckOut;
    if (adults) params.adults = adults;
    if (children) params.children = children;

    if (children_ages) {
        let value = children_ages;
        if (Array.isArray(value)) {
            value = value.join(',');
        }
        if (typeof value === 'string' && value.trim() !== '') {
            params.children_ages = value;
        }
    }

    if (currency) params.currency = currency;
    if (hl) params.hl = hl;
    if (gl) params.gl = gl;

    return params;
}

/**
 * Extract hotel rooms data based on these priority rules:
 *
 * 1. Prefer featured_prices:
 *    - Prefer record with both official === true AND rooms[]
 *    - Else record with rooms[] rooms[] must have images[]
 *    - If found, use that record.rooms as hotel rooms data.
 *
 * 2. If featured_prices missing or no usable rooms:
 *    - Use prices:
 *      - Prefer record with official === true
 *      - Else first record
 *      - Use that record.rate_per_night.lowest to build a synthetic "room"
 *
 * 3. If both missing, return empty array.
 */
function extractRoomsFromHotelDetails(data) {
    const featuredPrices = Array.isArray(data.featured_prices)
        ? data.featured_prices
        : null;
    const prices = Array.isArray(data.prices) ? data.prices : null;

    // --- 1. FEATURED PRICES ---
    if (featuredPrices && featuredPrices.length > 0) {
        const hasRoomsWithImages = (fp) =>
            Array.isArray(fp.rooms) &&
            fp.rooms.some(
                (room) => Array.isArray(room.images) && room.images.length > 0
            );

        // Prefer official + rooms that have images, else first provider with rooms that have images
        let selected =
            featuredPrices.find(
                (fp) => fp.official && hasRoomsWithImages(fp)
            ) ||
            featuredPrices.find(hasRoomsWithImages);

        if (selected && Array.isArray(selected.rooms) && selected.rooms.length > 0) {
            const rooms = selected.rooms.map((room) => ({
                name: room.name || 'Room',
                price:
                    room.rate_per_night?.lowest ||
                    selected.rate_per_night?.lowest ||
                    null,
                numGuests: room.num_guests || selected.num_guests || null,
                images: Array.isArray(room.images) ? room.images : [],
                source: selected.source || null,
                link: selected.link || null,
                logo: selected.logo || null,
                official: !!selected.official,
                from: 'featured_prices.rooms',
                isFromPricesFallback: false,
            }));

            return rooms;
        }
    }

    // --- 2. PRICES (fallback if no featured_prices/rooms) ---
    if (prices && prices.length > 0) {
        let selectedPrice = prices.find((p) => p.official) || prices[0];

        const lowestText = selectedPrice.rate_per_night?.lowest || null;

        // Synthetic "room" because there is no rooms[] data
        const pseudoRoom = {
            name: 'Standard Room (estimated)',
            price: lowestText,
            numGuests: selectedPrice.num_guests || null,
            images: [],
            source: selectedPrice.source || null,
            link: selectedPrice.link || null,
            logo: selectedPrice.logo || null,
            official: !!selectedPrice.official,
            from: 'prices.fallback',
            isFromPricesFallback: true,
        };

        return [pseudoRoom];
    }

    // --- 3. Nothing usable ---
    return [];
}

/**
 * Extract hotel details (amenities, description, policies, reviews) from SerpAPI response.
 */
function extractHotelDetails(data) {
    // amenities: array of strings like ["Free Wi-Fi", "Pool", ...]
    const amenities = Array.isArray(data.amenities) ? data.amenities : [];

    // Description paragraphs
    const descriptionParagraphs = [];
    if (data.description) {
        descriptionParagraphs.push(data.description);
    }

    // Essential info (overall_rating, reviews count, etc.)
    const overallRating = data.overall_rating || null;
    const reviewsCount = data.reviews || null;

    // Reviews breakdown by star (if available)
    const ratingBreakdown = {};
    
    // Try multiple sources for review breakdown
    const breakdownSources = [
        data.reviews_breakdown,
        data.rating_breakdown,
        data.ratings_breakdown,
        data.star_breakdown,
    ].filter(Boolean);
    
    for (const source of breakdownSources) {
        if (Array.isArray(source) && source.length > 0) {
            source.forEach((item) => {
                // Handle various formats: { stars: 5, count: 123 } or { name: "5", count: 123 } or { rating: 5, total: 123 }
                const stars = item.stars || item.rating || parseInt(item.name, 10);
                const count = item.count || item.total || item.reviews || 0;
                if (stars >= 1 && stars <= 5) {
                    ratingBreakdown[stars] = count;
                }
            });
            break; // Use first valid source
        } else if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
            // Handle object format: { "5": 70, "4": 30, ... }
            Object.entries(source).forEach(([key, value]) => {
                const stars = parseInt(key, 10);
                if (stars >= 1 && stars <= 5 && typeof value === 'number') {
                    ratingBreakdown[stars] = value;
                }
            });
            if (Object.keys(ratingBreakdown).length > 0) break;
        }
    }

    // Typical prices
    const typicalPrices = data.typical_prices || null;

    // Location details
    const locationInfo = {
        address: data.address || null,
        gpsCoordinates: data.gps_coordinates || null,
        link: data.link || null,
    };

    // Hotel class (stars)
    const hotelClass = data.hotel_class || null;

    // Check-in/Check-out times
    const checkInTime = data.check_in_time || null;
    const checkOutTime = data.check_out_time || null;

    // Number of rooms
    const numberOfRooms = data.rooms || null;

    // Phone
    const phone = data.phone || null;

    // Extract user reviews from Google hotel search
    // These come from featured_reviews or reviews array
    const userReviews = [];
    const reviewSources = [
        data.featured_reviews,
        data.reviews_by_category?.all,
        data.extracted_reviews,
        data.reviews_list,
        data.user_reviews,
        data.top_reviews,
    ].filter(Boolean);

    for (const source of reviewSources) {
        if (Array.isArray(source)) {
            source.forEach((r) => {
                userReviews.push({
                    user: r.author || r.user || r.username || r.reviewer || r.name || 'Anonymous',
                    date: r.date || r.published_date || r.time || r.review_date || null,
                    rating: r.rating || r.stars || r.score || null,
                    text: r.snippet || r.text || r.description || r.content || r.review || r.comment || '',
                    source: r.source || 'Google',
                });
            });
        }
        // Limit to avoid too many
        if (userReviews.length >= 10) break;
    }

    // Property policies: try to extract from structured data if available
    const policies = {
        checkInOut: checkInTime && checkOutTime 
            ? `Check-in: ${checkInTime}, Check-out: ${checkOutTime}`
            : checkInTime 
                ? `Check-in: ${checkInTime}`
                : checkOutTime 
                    ? `Check-out: ${checkOutTime}`
                    : null,
        childPolicies: null,
        cribsAndExtraBeds: null,
        breakfast: null,
        depositPolicy: null,
        pets: null,
        serviceAnimals: null,
        ageRequirements: null,
        paymentMethods: null,
    };

    // Try to extract policies from data if they exist in other keys
    if (data.about && Array.isArray(data.about)) {
        data.about.forEach((item) => {
            const title = (item.title || '').toLowerCase();
            const content = item.contents || item.content || null;
            
            if (title.includes('child') || title.includes('kid')) {
                policies.childPolicies = content;
            } else if (title.includes('pet')) {
                policies.pets = content;
            } else if (title.includes('breakfast') || title.includes('meal')) {
                policies.breakfast = content;
            } else if (title.includes('payment') || title.includes('card')) {
                policies.paymentMethods = content;
            } else if (title.includes('deposit')) {
                policies.depositPolicy = content;
            } else if (title.includes('crib') || title.includes('extra bed')) {
                policies.cribsAndExtraBeds = content;
            } else if (title.includes('age')) {
                policies.ageRequirements = content;
            } else if (title.includes('service animal')) {
                policies.serviceAnimals = content;
            }
        });
    }

    // Extract nearby places from SerpAPI response
    const nearbyPlaces = [];
    
    // Try multiple possible sources for nearby places data
    const nearbySourcesArray = [
        data.nearby_places,
        data.nearby_attractions,
        data.places_nearby,
        data.points_of_interest,
    ].filter(Boolean);
    
    for (const source of nearbySourcesArray) {
        if (Array.isArray(source)) {
            source.forEach((place) => {
                nearbyPlaces.push({
                    name: place.name || place.title || 'Unknown Place',
                    type: place.type || place.category || 'poi',
                    distance: place.distance || place.walking_distance || null,
                    duration: place.duration || place.walking_time || null,
                    transportations: place.transportations || [],
                    gps: place.gps_coordinates || place.coordinates || null,
                });
            });
        }
    }
    
    // Also check for nested structure like { transit: [...], restaurants: [...] }
    const nestedSources = [
        { key: 'transit', data: data.nearby_places?.transit || data.transit_nearby },
        { key: 'restaurant', data: data.nearby_places?.restaurants || data.restaurants_nearby },
        { key: 'attraction', data: data.nearby_places?.attractions || data.attractions_nearby },
        { key: 'gas', data: data.nearby_places?.gas || data.nearby_places?.gas_stations },
        { key: 'conbini', data: data.nearby_places?.conbini || data.nearby_places?.convenience_stores || data.nearby_places?.convenience },
        { key: 'atm', data: data.nearby_places?.atm || data.nearby_places?.atms || data.nearby_places?.banks },
        { key: 'parking', data: data.nearby_places?.parking || data.nearby_places?.car_parks },
        { key: 'pharmacy', data: data.nearby_places?.pharmacy || data.nearby_places?.pharmacies },
    ];
    
    for (const { key, data: sourceData } of nestedSources) {
        if (Array.isArray(sourceData)) {
            sourceData.forEach((place) => {
                nearbyPlaces.push({
                    name: place.name || place.title || 'Unknown Place',
                    type: key,
                    distance: place.distance || place.walking_distance || null,
                    duration: place.duration || place.walking_time || null,
                    transportations: place.transportations || [],
                    gps: place.gps_coordinates || place.coordinates || null,
                });
            });
        }
    }

    return {
        amenities,
        descriptionParagraphs,
        overallRating,
        reviewsCount,
        ratingBreakdown,
        typicalPrices,
        locationInfo,
        hotelClass,
        checkInTime,
        checkOutTime,
        numberOfRooms,
        phone,
        userReviews,
        policies,
        nearbyPlaces,
    };
}

/**
 * GET /api/serp/hotel/details
 *
 * Query params:
 *  - q               : search query (hotel name + city, etc.)  [REQUIRED]
 *  - check_in_date   : YYYY-MM-DD [REQUIRED]
 *  - check_out_date  : YYYY-MM-DD [REQUIRED]
 *  - gl              : country, e.g. "vn"
 *  - hl              : language, e.g. "en"
 *  - currency        : e.g. "USD"
 *
 * Returns: hotel details including amenities, description, policies, reviews
 */
router.get('/hotel/details', async (req, res) => {
    if (!SERPAPI_KEY) {
        return res
            .status(500)
            .json({ error: 'Missing SERPAPI_KEY in environment variables' });
    }

    if (!req.query.q) {
        return res
            .status(400)
            .json({ error: 'Query parameter "q" (search query) is required' });
    }

    try {
        const baseParams = buildBaseParams(req.query);

        // First call: search to get property token
        const initialResp = await axios.get(SERPAPI_ENDPOINT, {
            params: baseParams,
        });
        let data = initialResp.data || {};

        // If we have properties[], do second call using property_token
        if (Array.isArray(data.properties) && data.properties.length > 0) {
            const firstProperty = data.properties[0];
            const propertyToken =
                firstProperty.property_token || firstProperty.token || null;

            if (propertyToken) {
                const detailsParams = {
                    ...baseParams,
                    property_token: propertyToken,
                    type: 'property_details',
                };

                const detailsResp = await axios.get(SERPAPI_ENDPOINT, {
                    params: detailsParams,
                });
                data = detailsResp.data || {};
            }
        }

        // Extract details from the response
        const hotelDetails = extractHotelDetails(data);

        // Also include some raw data for debugging
        return res.json({
            query: { ...req.query },
            ...hotelDetails,
            // Include images if available
            images: data.images || [],
        });
    } catch (err) {
        console.error(
            'Error fetching hotel details from SerpApi:',
            err?.response?.data || err.message
        );

        const status = err.response?.status || 500;
        return res.status(status).json({
            error: 'Failed to fetch hotel details from SerpApi',
            details:
                err.response?.data?.error ||
                err.response?.data?.error_message ||
                err.message,
        });
    }
});

/**
 * GET /api/serp/hotel/rooms
 *
 * Query params:
 *  - q               : search query (hotel name + city, etc.)  [REQUIRED]
 *  - check_in_date   : YYYY-MM-DD [REQUIRED]
 *  - check_out_date  : YYYY-MM-DD [REQUIRED]
 *  - adults          : number of adults
 *  - children        : number of children
 *  - children_ages   : "3,7" or repeated param children_ages=3&children_ages=7
 *  - gl              : country, e.g. "vn"
 *  - hl              : language, e.g. "en"
 *  - currency        : e.g. "USD"
 *
 * Logic:
 *  - First call SerpApi without property_token.
 *  - If response has properties[]:
 *      -> grab first.properties[0].property_token
 *      -> call SerpApi again with same params + property_token (+ type=property_details)
 *      -> then run room selection logic.
 *  - If no properties[]:
 *      -> directly run room selection logic on this response.
 */
router.get('/hotel/rooms', async (req, res) => {
    if (!SERPAPI_KEY) {
        return res
            .status(500)
            .json({ error: 'Missing SERPAPI_KEY in environment variables' });
    }

    if (!req.query.q) {
        return res
            .status(400)
            .json({ error: 'Query parameter "q" (search query) is required' });
    }

    try {
        const baseParams = buildBaseParams(req.query);

        // ----- First call: search -----
        const initialResp = await axios.get(SERPAPI_ENDPOINT, {
            params: baseParams,
        });
        let data = initialResp.data || {};

        // If we have properties[], do second call using property_token
        if (Array.isArray(data.properties) && data.properties.length > 0) {
            const firstProperty = data.properties[0];
            const propertyToken =
                firstProperty.property_token || firstProperty.token || null;

            if (propertyToken) {
                const detailsParams = {
                    ...baseParams,
                    property_token: propertyToken,
                    type: 'property_details',
                };

                const detailsResp = await axios.get(SERPAPI_ENDPOINT, {
                    params: detailsParams,
                });
                data = detailsResp.data || {};
            }
            // If no propertyToken found, we just fall back to initial `data` below.
        }

        // At this point, `data` should look like your mock (property-details).
        const rooms = extractRoomsFromHotelDetails(data);

        return res.json({
            query: {
                ...req.query,
            },
            rooms,
        });
    } catch (err) {
        console.error(
            'Error fetching hotel rooms from SerpApi:',
            err?.response?.data || err.message
        );

        const status = err.response?.status || 500;
        return res.status(status).json({
            error: 'Failed to fetch hotel rooms from SerpApi',
            details:
                err.response?.data?.error ||
                err.response?.data?.error_message ||
                err.message,
        });
    }
});

module.exports = router;
