const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_ENDPOINT = 'https://serpapi.com/search';

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

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_hotels',
    };

    if (q) params.q = q;
    if (check_in_date) params.check_in_date = check_in_date;
    if (check_out_date) params.check_out_date = check_out_date;
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
