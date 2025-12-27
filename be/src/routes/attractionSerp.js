const express = require('express');
const axios = require('axios');
const { getAuthUserFromRequest } = require('../utils/authUser');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

/**
 * Build base params for Google Maps Place Results.
 */
function buildBasePlaceParams(query) {
    const {
        q,
        hl,
    } = query;

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_maps',
        google_domain: 'google.com',
        q: q,
        gl: 'vn',
        hl: hl || 'en',
        type: 'search',
    };

    return params;
}

/**
 * Fetch place_results
 */
async function fetchPlaceResults(query) {
    const params = buildBasePlaceParams(query);

    const resp = await axios.get(SERPAPI_BASE_URL, { params });
    const data = resp.data || {};

    return data.place_results || null;
}

/**
 * Fetch images for the attraction using google_images_light.
 * Returns up to 8 image URLs (original).
 */
async function fetchAttractionImages(place, query) {
    const searchQuery = place?.title || query.q || null;

    if (!searchQuery) return [];

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_images_light',
        google_domain: 'google.com.vn',
        q: searchQuery,
        location: 'Vietnam',
        gl: 'vn',
        hl: 'en',
    };

    if (query.hl) params.hl = query.hl;

    try {
        const resp = await axios.get(SERPAPI_BASE_URL, { params });
        const imagesResults = resp.data?.images_results || [];

        return imagesResults
            .slice(0, 8)
            .map((img) => img.original)
            .filter(Boolean);
    } catch (err) {
        console.error(
            'Error fetching attraction images from SerpApi:',
            err?.response?.data || err.message
        );
        return [];
    }
}

/**
 * HEADER:
 * - Images (passed in)
 * - Operating Time: place_results.hours[].monday (or object)
 * - Address: place_results.address
 * - Visiting Hours Recommendation: place_results.popular_times.live_hash.time_spent
 * - Contacts: phone, website
 */
function extractHeaderFromAttractionDetails(place, images) {
    if (!place || typeof place !== 'object') {
        return {
            name: null,
            address: null,
            operating_time: null,
            visiting_hours_recommendation: null,
            contacts: {
                phone: null,
                website: null,
            },
            images: [],
            gps_coordinates: null,
        };
    }

    const hours = place.hours;
    let operatingTime = null;

    if (Array.isArray(hours)) {
        const mondayEntry = hours.find((h) => h && (h.monday || h.Monday));
        if (mondayEntry) {
            operatingTime = mondayEntry.monday || mondayEntry.Monday;
        } else {
            operatingTime = hours;
        }
    } else if (hours && typeof hours === 'object') {
        operatingTime = hours.monday || hours.Monday || hours;
    } else if (hours) {
        operatingTime = hours;
    }

    const visitingHoursRecommendation = place.popular_times?.live_hash?.time_spent || null;

    return {
        name: place.title || place.name || null,
        address: place.address || null,
        operating_time: operatingTime,
        visiting_hours_recommendation: visitingHoursRecommendation,
        contacts: {
            phone: place.phone || null,
            website: place.website || null,
        },
        images: Array.isArray(images) ? images : [],
        gps_coordinates: place.gps_coordinates || null,
    };
}

/**
 * DESCRIPTION:
 * - Attraction Description: place_results.description
 */
function extractDescriptionFromAttractionDetails(place) {
    return place?.description || null;
}

/**
 * TICKETS & PASSES:
 * - Tickets & Passes: place_results.experiences[]
 */
function extractTicketsPassesFromAttractionDetails(place) {
    return Array.isArray(place?.experiences)
        ? place.experiences.slice(0, 5)
        : [];
}

/**
 * RATINGS & REVIEWS:
 * - rating, reviews, rating_summary, user_reviews.most_relevant[]
 */
function extractRatingsReviewsFromAttractionDetails(place) {
    const userReviews =
        place?.user_reviews &&
            Array.isArray(place.user_reviews.most_relevant)
            ? place.user_reviews.most_relevant
            : [];

    return {
        rating: place?.rating ?? null,
        reviews: place?.reviews ?? null,
        rating_summary: place?.rating_summary || null,
        user_reviews: userReviews,
    };
}

/**
 * Normalize a single nearby place from google_maps local_results.
 */
function normalizeNearbyPlace(raw, categoryLabel) {
    if (!raw) return null;

    return {
        category: categoryLabel || raw.type || null,
        title: raw.title || null,
        type: raw.type || null,
        address: raw.address || null,
        rating: raw.rating ?? null,
        reviews: raw.reviews ?? null,
        thumbnail: raw.thumbnail || null,
        gps_coordinates: raw.gps_coordinates || null,
    };
}

// Helper: normalize string for safe comparing
function normalizeString(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Fetch NearbyPlaces:
 * - Uses place_results.gps_coordinates
 * - For each q in ["Hotels", "Attractions", "Restaurants"]
 * - google_maps engine, type=search → local_results (we always have this here)
 */
async function fetchNearbyPlaces(place, query) {
    if (!place) {
        return {
            hotels: [],
            attractions: [],
            restaurants: [],
        };
    }

    const gps = place.gps_coordinates || {};
    const lat = gps.latitude ?? gps.lat;
    const lon = gps.longitude ?? gps.lng ?? gps.lon;

    if (lat == null || lon == null) {
        return {
            hotels: [],
            attractions: [],
            restaurants: [],
        };
    }

    const hl = query.hl || 'en';
    const currentAttractionTitle = normalizeString(query?.q)

    const categories = [
        { key: 'hotels', q: 'Hotels' },
        { key: 'attractions', q: 'Attractions' },
        { key: 'restaurants', q: 'Restaurants' },
    ];

    const result = {
        hotels: [],
        attractions: [],
        restaurants: [],
    };

    await Promise.all(
        categories.map(async (cat) => {
            const params = {
                api_key: SERPAPI_KEY,
                engine: 'google_maps',
                google_domain: 'google.com',
                q: `${cat.q} near ${place.title}`,
                ll: `@${lat},${lon},15z`,
                gl: 'vn',
                hl,
                type: 'search',
            };

            try {
                const resp = await axios.get(SERPAPI_BASE_URL, { params });
                const localResults = Array.isArray(resp.data?.local_results)
                    ? resp.data.local_results
                    : [];

                let normalized = localResults
                    .map((item) => normalizeNearbyPlace(item, cat.q))
                    .filter(Boolean)

                // Exclude the current queried attraction from the attractions array
                if (cat.key === 'attractions' && currentAttractionTitle) {
                    normalized = normalized.filter(
                        (item) =>
                            normalizeString(item.title) !==
                            currentAttractionTitle
                    )
                }

                result[cat.key] = normalized
            } catch (err) {
                console.error(
                    `Error fetching nearby ${cat.q} from SerpApi:`,
                    err?.response?.data || err.message
                );
                result[cat.key] = [];
            }
        })
    );

    return result;
}

/**
 * GET /api/serp/attraction/details
 */
router.get('/attraction/details', async (req, res) => {
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
        const me = await getAuthUserFromRequest(req);
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const place = await fetchPlaceResults(req.query);

        if (!place) {
            return res.status(404).json({
                error: 'No place_results found for this attraction',
            });
        }

        // Fetch images + nearby in parallel
        const [images, nearby_places] = await Promise.all([
            fetchAttractionImages(place, req.query),
            fetchNearbyPlaces(place, req.query),
        ]);

        // Extract sections
        const header = extractHeaderFromAttractionDetails(place, images);
        const description = extractDescriptionFromAttractionDetails(place);
        const tickets_passes = extractTicketsPassesFromAttractionDetails(place);
        const ratings_reviews = extractRatingsReviewsFromAttractionDetails(place);

        return res.json({
            query: {
                ...req.query,
            },
            header,
            description,
            tickets_passes,
            ratings_reviews,
            nearby_places,
        });
    } catch (err) {
        console.error(
            'Error fetching attraction details from SerpApi:',
            err?.response?.data || err.message
        );

        const status = err.response?.status || 500;
        return res.status(status).json({
            error: 'Failed to fetch attraction details from SerpApi',
            details:
                err.response?.data?.error ||
                err.response?.data?.error_message ||
                err.message,
        });
    }
});

module.exports = router;
