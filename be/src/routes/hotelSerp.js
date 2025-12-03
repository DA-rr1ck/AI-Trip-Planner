const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

/**
 * Build base params from query.
 */
function buildParamsHotelDetails(query) {
    const {
        q,
        check_in_date,
        check_out_date,
        adults,
        children,
        children_ages,
        hl,
        currency,
    } = query;

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_hotels',
        q: q,
        check_in_date: check_in_date,
        check_out_date: check_out_date,
        gl: 'vn',
        hl: 'en',
        currency: 'USD',
    };

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

    if (hl) params.hl = hl;
    if (currency) params.currency = currency;

    return params;
}

/**
 * HEADER: { extracted_hotel_class, address, images[] (original_image only) }
 */
function extractHeaderFromHotelDetails(data) {
    const imagesArray = Array.isArray(data.images) ? data.images : [];
    const originalImages = imagesArray
        .map((img) => img.original_image)

    return {
        hotel_class: data.extracted_hotel_class || null,
        name: data.name || null,
        address: data.address || null,
        images: originalImages,
    };
}

/**
 * AMENITIES: { amenities_detailed }
 */
function extractAmenitiesFromHotelDetails(data) {
    return data.amenities_detailed || null;
}

/**
 * Helper: extract policy info for a given amenities_detailed group title.
 *
 * Rules:
 * - status:
 *    - if any item.available === true -> "allowed"
 *    - else if group exists but no item available -> "prohibited"
 *    - else (group not found) -> null
 */
function extractGroupPolicy(groups, title) {
    const group = groups.find((g) => g.title === title);
    if (!group || !Array.isArray(group.list)) {
        return null;
    }

    const anyAvailable = group.list.some((item) => item.available === true);
    return anyAvailable ? 'allowed' : 'prohibited';
}

/**
 * POLICIES:
 * {
 *   check_in_time,
 *   check_out_time,
 *   children: { status: "allowed" | "prohibited" | null },
 *   pets: { status: "allowed" | "prohibited" | null }
 * }
 */
function extractPoliciesFromHotelDetails(data) {
    const amenitiesDetailed = data.amenities_detailed || {};
    const groups = Array.isArray(amenitiesDetailed.groups)
        ? amenitiesDetailed.groups
        : [];

    return {
        check_in_time: data.check_in_time || null,
        check_out_time: data.check_out_time || null,
        children: extractGroupPolicy(groups, 'Children'),
        pets: extractGroupPolicy(groups, 'Pets'),
    };
}

/**
 * DESCRIPTION: { phone, link, description }
 */
function extractDescriptionFromHotelDetails(data) {
    return {
        phone: data.phone || null,
        link: data.link || null,
        description: data.description || null,
    };
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
 * RATINGS-REVIEWS: { overall_rating, reviews, ratings, other_reviews }
 */
function extractRatingsReviewsFromHotelDetails(data) {
    return {
        overall_rating: data.overall_rating ?? null,
        reviews: data.reviews ?? null,
        ratings: Array.isArray(data.ratings) ? data.ratings : [],
        user_reviews: Array.isArray(data.other_reviews) ? data.other_reviews : [],
    };
}

/**
 * NEARBY HIGHLIGHTS + HOTEL GPS COORDINATES
 */
function extractNearbyHighlightsFromHotelDetails(data) {
    const nearbyPlaces = Array.isArray(data.nearby_places)
        ? data.nearby_places
        : [];

    const hotelGps = data.gps_coordinates || null;

    const result = {
        hotel_coordinates: hotelGps,
        transport: [],
        pois: [],
        dining: [],
    };

    const pushNormalized = (targetArray, place) => {
        const normalized = {
            category: place.category || null,
            name: place.name || null,
            thumbnail: place.thumbnail || null,
            rating: place.rating ?? null,
            reviews: place.reviews ?? null,
            gps_coordinates: place.gps_coordinates || null,
            transportations: Array.isArray(place.transportations)
                ? place.transportations
                : [],
        };

        targetArray.push(normalized);
    };

    for (const place of nearbyPlaces) {
        if (!place) continue;

        const category = (place.category || '').toLowerCase();

        // --- Transport ---
        if (
            category.includes('airport') || category.includes('sân bay') ||
            category.includes('train station') || category.includes('ga tàu') || category.includes('nhà ga') ||
            category.includes('bus station') || category.includes('trạm xe buýt')
        ) {
            pushNormalized(result.transport, place);
            continue;
        }

        // --- POIs ---
        if (category.includes('point of interest') || category.includes('điểm quan tâm')) {
            pushNormalized(result.pois, place);
            continue;
        }

        // --- Dining ---
        if (category.includes('restaurant') || category.includes('nhà hàng')) {
            pushNormalized(result.dining, place);
            continue;
        }

        // --- Others: ignore for now ---
    }

    return result;
}

/**
 * NEARBY HOTELS
 *
 * Uses SerpApi again with query:
 *   hotels near "<data.name>"
 *
 * All other params are taken from data.search_parameters.
 *
 * Returns an array of up to 12 nearby hotels:
 */
async function extractNearbyHotelsFromHotelDetails(data) {
    const searchParams = data.search_parameters || {};
    const hotelName = data.name || searchParams.q || null;

    if (!hotelName) {
        return [];
    }

    // Identify current hotel token / name so we can exclude it
    const currentPropertyToken =
        searchParams.property_token || data.property_token || null;
    const normalizeName = (str) =>
        String(str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    const normalizedCurrentName = normalizeName(hotelName);

    // Build params for the "nearby hotels" search:
    // - Start from search_parameters
    // - Override q
    // - Remove property_token / type so it's a normal search, not property_details
    const baseFromSearchParams = { ...searchParams };

    delete baseFromSearchParams.property_token;
    delete baseFromSearchParams.type;

    const params = {
        api_key: SERPAPI_KEY,
        engine: baseFromSearchParams.engine || 'google_hotels',
        ...baseFromSearchParams,
        q: `Hotels near "${hotelName}"`,
    };

    try {
        const resp = await axios.get(SERPAPI_BASE_URL, { params });
        const resData = resp.data || {};
        const properties = Array.isArray(resData.properties)
            ? resData.properties
            : [];

        const nearby = [];

        for (const prop of properties) {
            if (!prop || prop.type !== 'hotel') continue;
            if (nearby.length >= 12) break;

            // Exclude the current hotel (by token or by name)
            const propToken =
                prop.property_token || prop.token || null;
            if (
                currentPropertyToken &&
                propToken &&
                propToken === currentPropertyToken
            ) {
                continue;
            }

            const normalizedPropName = normalizeName(prop.name);
            if (
                normalizedCurrentName &&
                normalizedPropName &&
                normalizedPropName === normalizedCurrentName
            ) {
                continue;
            }

            const gps = prop.gps_coordinates || {};
            const normalizedHotel = {
                property_token: propToken,
                name: prop.name || null,
                thumbnail:
                    (Array.isArray(prop.images) &&
                        prop.images.length > 0 &&
                        prop.images[0].thumbnail) ||
                    null,
                hotel_class: prop.extracted_hotel_class || null,
                overall_rating:
                    prop.overall_rating != null
                        ? Number(prop.overall_rating)
                        : null,
                reviews:
                    prop.reviews != null ? Number(prop.reviews) : null,
                price:
                    prop.rate_per_night?.lowest ||
                    prop.price ||
                    null,
            };

            nearby.push(normalizedHotel);
        }

        return nearby;
    } catch (err) {
        console.error(
            'Error fetching nearby hotels from SerpApi:',
            err?.response?.data || err.message
        );
        // On failure, just return empty list and let the main route continue
        return [];
    }
}

/**
 * Pick the best matching property based on the hotel name.
 *
 * Rules:
 * - If hotelNameRaw is provided:
 *   - Check the first 5 properties.
 *   - Return the first property whose name "contains/matches" the hotel name (case-insensitive).
 *   - Matching rule: normalized propertyName includes hotelName OR hotelName includes propertyName.
 * - If none match, or no hotelName, fall back to properties[0].
 */
function pickBestPropertyByName(properties, hotelNameRaw) {
    if (!Array.isArray(properties) || properties.length === 0) {
        return null;
    }

    if (!hotelNameRaw) {
        return properties[0];
    }

    const normalize = (str) =>
        String(str)
            .toLowerCase()
            .normalize('NFD') // remove diacritics
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    const hotelName = normalize(hotelNameRaw);
    const limit = Math.min(5, properties.length);

    for (let i = 0; i < limit; i++) {
        const p = properties[i];
        if (!p || !p.name) continue;

        const propName = normalize(p.name);

        // "contains/matches" in both directions:
        if (propName.includes(hotelName) || hotelName.includes(propName)) {
            return p;
        }
    }

    // No match in the first 5 → fallback to the first property
    return properties[0];
}

/**
 * GET /api/serp/hotel/details
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
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const baseParams = buildParamsHotelDetails(req.query);

        // ----- First call: search -----
        const initialResp = await axios.get(SERPAPI_BASE_URL, {
            params: baseParams,
        });
        let data = initialResp.data || {};

        // If have properties[], do second call using property_token
        if (Array.isArray(data.properties) && data.properties.length > 0) {
            // Prefer property that matches hotel name (within first 5),
            // then fallback to the very first property.
            const hotelNameHint = req.query.q;
            const bestProperty = pickBestPropertyByName(
                data.properties,
                hotelNameHint
            );

            let propertyToken = bestProperty?.property_token || null;

            // Extra safety: if bestProperty has no token, fallback to first property
            if (!propertyToken) {
                const firstProperty = data.properties[0];
                propertyToken =
                    firstProperty.property_token || firstProperty.token || null;
            }

            if (propertyToken) {
                const detailsParams = {
                    ...baseParams,
                    property_token: propertyToken,
                    type: 'property_details',
                };

                const detailsResp = await axios.get(SERPAPI_BASE_URL, {
                    params: detailsParams,
                });
                data = detailsResp.data || {};
            }
            // If no propertyToken found at all, just fall back to initial `data` below.
        }

        // Extract data
        const header = extractHeaderFromHotelDetails(data);
        const amenities = extractAmenitiesFromHotelDetails(data);
        const policies = extractPoliciesFromHotelDetails(data);
        const description = extractDescriptionFromHotelDetails(data);
        const rooms = extractRoomsFromHotelDetails(data);
        const ratings_reviews = extractRatingsReviewsFromHotelDetails(data);
        const nearby_highlights = extractNearbyHighlightsFromHotelDetails(data);
        const nearby_hotels = await extractNearbyHotelsFromHotelDetails(data);

        return res.json({
            query: {
                ...req.query,
            },
            header,
            amenities,
            policies,
            description,
            rooms,
            ratings_reviews,
            nearby_highlights,
            nearby_hotels,
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

module.exports = router;
