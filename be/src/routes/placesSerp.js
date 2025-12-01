const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_ENDPOINT = 'https://serpapi.com/search';

/**
 * Extract place details from Google Maps/Places response
 */
function extractPlaceDetails(data) {
    const place = data.place_results || data.local_results?.[0] || {};
    const knowledgeGraph = data.knowledge_graph || {};

    // Description from various sources
    const description = 
        place.description || 
        knowledgeGraph.description || 
        place.snippet ||
        null;

    // Rating info
    const rating = place.rating || knowledgeGraph.rating || null;
    const reviewsCount = place.reviews || knowledgeGraph.reviews || null;

    // Address
    const address = 
        place.address || 
        knowledgeGraph.address ||
        place.formatted_address ||
        null;

    // Operating hours
    let operatingHours = null;
    if (place.hours || place.operating_hours) {
        const hours = place.hours || place.operating_hours;
        if (Array.isArray(hours)) {
            operatingHours = hours;
        } else if (typeof hours === 'object') {
            operatingHours = hours;
        }
    }

    // Phone
    const phone = place.phone || knowledgeGraph.phone || null;

    // Website
    const website = place.website || knowledgeGraph.website || place.link || null;

    // Type/Category
    const type = place.type || place.types?.[0] || knowledgeGraph.type || null;

    // Price level ($ to $$$$)
    const priceLevel = place.price || place.price_level || null;

    // Service options / amenities that might indicate pricing
    const serviceOptions = place.service_options || place.amenities || null;

    // Ticket/admission info - extract from various possible fields
    const ticketInfo = {
        // Check for explicit ticket prices
        ticketPrices: place.ticket_prices || place.admission || knowledgeGraph.ticket_prices || null,
        // Check for service options that might include entry fees
        entryFee: place.entry_fee || place.admission_fee || knowledgeGraph.entry_fee || null,
        // Popular times (useful for planning visits)
        popularTimes: place.popular_times || null,
        // Reserve/book link if available
        reservationLink: place.reservations || place.order_online || place.book_online || null,
        // Any attributes related to pricing
        attributes: place.attributes || [],
    };

    // Extract price-related attributes
    const priceAttributes = [];
    if (Array.isArray(place.attributes)) {
        place.attributes.forEach(attr => {
            const attrLower = (typeof attr === 'string' ? attr : attr.name || '').toLowerCase();
            if (attrLower.includes('free') || attrLower.includes('price') || 
                attrLower.includes('ticket') || attrLower.includes('admission') ||
                attrLower.includes('fee') || attrLower.includes('cost')) {
                priceAttributes.push(attr);
            }
        });
    }
    ticketInfo.priceAttributes = priceAttributes;

    // Thumbnail/images
    const images = [];
    if (place.thumbnail) images.push(place.thumbnail);
    if (place.images && Array.isArray(place.images)) {
        place.images.forEach(img => {
            const url = typeof img === 'string' ? img : img.thumbnail || img.original;
            if (url && !images.includes(url)) images.push(url);
        });
    }
    if (knowledgeGraph.images && Array.isArray(knowledgeGraph.images)) {
        knowledgeGraph.images.forEach(img => {
            const url = typeof img === 'string' ? img : img.thumbnail || img.original;
            if (url && !images.includes(url)) images.push(url);
        });
    }

    // Reviews
    const userReviews = [];
    const reviewSources = [
        place.reviews_list,
        place.user_reviews,
        data.reviews,
    ].filter(Boolean);

    for (const source of reviewSources) {
        if (Array.isArray(source)) {
            source.forEach(r => {
                userReviews.push({
                    user: r.author || r.user || r.username || 'Anonymous',
                    date: r.date || r.published_date || r.time || null,
                    rating: r.rating || null,
                    text: r.snippet || r.text || r.description || r.content || '',
                    source: r.source || 'Google',
                });
            });
        }
        if (userReviews.length >= 10) break;
    }

    // Rating breakdown if available
    const ratingBreakdown = {};
    if (place.rating_breakdown || data.rating_breakdown) {
        const breakdown = place.rating_breakdown || data.rating_breakdown;
        if (Array.isArray(breakdown)) {
            breakdown.forEach(item => {
                const stars = item.stars || parseInt(item.name, 10);
                if (stars >= 1 && stars <= 5) {
                    ratingBreakdown[stars] = item.count || 0;
                }
            });
        }
    }

    // GPS coordinates
    const gpsCoordinates = place.gps_coordinates || {
        latitude: place.latitude || place.lat,
        longitude: place.longitude || place.lng || place.lon,
    };

    return {
        description,
        rating,
        reviewsCount,
        address,
        operatingHours,
        phone,
        website,
        type,
        priceLevel,
        serviceOptions,
        ticketInfo,
        images,
        userReviews,
        ratingBreakdown,
        gpsCoordinates,
        title: place.title || place.name || knowledgeGraph.title || null,
    };
}

/**
 * GET /api/serp/place/details
 *
 * Query params:
 *  - q     : search query (place name + city, etc.) [REQUIRED]
 *  - hl    : language, e.g. "en"
 *  - gl    : country, e.g. "vn"
 *
 * Returns: place/attraction details including description, hours, rating, reviews
 */
router.get('/place/details', async (req, res) => {
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
        // Use Google Maps engine for place details
        const params = {
            api_key: SERPAPI_KEY,
            engine: 'google_maps',
            q: req.query.q,
            type: 'search',
            hl: req.query.hl || 'en',
            gl: req.query.gl || 'us',
        };

        const searchResp = await axios.get(SERPAPI_ENDPOINT, { params });
        let data = searchResp.data || {};

        // If we found a place, try to get more details
        const firstPlace = data.local_results?.[0];
        if (firstPlace?.data_id) {
            try {
                const detailParams = {
                    api_key: SERPAPI_KEY,
                    engine: 'google_maps',
                    data_id: firstPlace.data_id,
                    type: 'place',
                    hl: req.query.hl || 'en',
                };
                const detailResp = await axios.get(SERPAPI_ENDPOINT, { params: detailParams });
                if (detailResp.data) {
                    data = { ...data, place_results: detailResp.data.place_results || detailResp.data };
                }
            } catch (detailErr) {
                console.warn('Could not fetch place details, using search results:', detailErr.message);
            }
        }

        const placeDetails = extractPlaceDetails(data);

        return res.json({
            query: { ...req.query },
            ...placeDetails,
        });
    } catch (err) {
        console.error(
            'Error fetching place details from SerpApi:',
            err?.response?.data || err.message
        );

        const status = err.response?.status || 500;
        return res.status(status).json({
            error: 'Failed to fetch place details from SerpApi',
            details:
                err.response?.data?.error ||
                err.response?.data?.error_message ||
                err.message,
        });
    }
});

module.exports = router;
