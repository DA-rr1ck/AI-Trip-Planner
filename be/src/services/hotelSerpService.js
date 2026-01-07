const SerpApiService = require("./SerpApiService");

/**
 * Build base params from query.
 * NOTE: api_key is NOT added here (SerpApiService adds it)
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
        engine: "google_hotels",
        q,
        check_in_date,
        check_out_date,
        gl: "vn",
        hl: "en",
        currency: "USD",
    };

    if (adults) params.adults = adults;
    if (children) params.children = children;

    if (children_ages) {
        let value = children_ages;
        if (Array.isArray(value)) value = value.join(",");
        if (typeof value === "string" && value.trim() !== "") {
            params.children_ages = value;
        }
    }

    if (hl) params.hl = hl;
    if (currency) params.currency = currency;

    return params;
}

/** HEADER */
function extractHeaderFromHotelDetails(data) {
    const imagesArray = Array.isArray(data.images) ? data.images : [];
    const originalImages = imagesArray.map((img) => img.original_image);

    return {
        hotel_class: data.extracted_hotel_class || null,
        name: data.name || null,
        address: data.address || null,
        images: originalImages,
    };
}

/** AMENITIES */
function extractAmenitiesFromHotelDetails(data) {
    return data.amenities_detailed || null;
}

function extractGroupPolicy(groups, title) {
    const group = groups.find((g) => g.title === title);
    if (!group || !Array.isArray(group.list)) return null;

    const anyAvailable = group.list.some((item) => item.available === true);
    return anyAvailable ? "allowed" : "prohibited";
}

/** POLICIES */
function extractPoliciesFromHotelDetails(data) {
    const amenitiesDetailed = data.amenities_detailed || {};
    const groups = Array.isArray(amenitiesDetailed.groups)
        ? amenitiesDetailed.groups
        : [];

    return {
        check_in_time: data.check_in_time || null,
        check_out_time: data.check_out_time || null,
        children: extractGroupPolicy(groups, "Children"),
        pets: extractGroupPolicy(groups, "Pets"),
    };
}

/** DESCRIPTION */
function extractDescriptionFromHotelDetails(data) {
    return {
        phone: data.phone || null,
        link: data.link || null,
        description: data.description || null,
    };
}

/** ROOMS */
function extractRoomsFromHotelDetails(data) {
    const featuredPrices = Array.isArray(data.featured_prices)
        ? data.featured_prices
        : null;
    const prices = Array.isArray(data.prices) ? data.prices : null;

    // 1) FEATURED PRICES (rooms with images)
    if (featuredPrices && featuredPrices.length > 0) {
        const hasRoomsWithImages = (fp) =>
            Array.isArray(fp.rooms) &&
            fp.rooms.some((room) => Array.isArray(room.images) && room.images.length > 0);

        let selected =
            featuredPrices.find((fp) => fp.official && hasRoomsWithImages(fp)) ||
            featuredPrices.find(hasRoomsWithImages);

        // Fix: ensure correct find usage
        if (!selected) selected = featuredPrices.find(hasRoomsWithImages);

        if (selected && Array.isArray(selected.rooms) && selected.rooms.length > 0) {
            return selected.rooms.map((room) => ({
                name: room.name || "Room",
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
                from: "featured_prices.rooms",
                isFromPricesFallback: false,
            }));
        }
    }

    // 2) PRICES fallback
    if (prices && prices.length > 0) {
        const selectedPrice = prices.find((p) => p.official) || prices[0];
        const lowestText = selectedPrice.rate_per_night?.lowest || null;

        return [
            {
                name: "Standard Room (estimated)",
                price: lowestText,
                numGuests: selectedPrice.num_guests || null,
                images: [],
                source: selectedPrice.source || null,
                link: selectedPrice.link || null,
                logo: selectedPrice.logo || null,
                official: !!selectedPrice.official,
                from: "prices.fallback",
                isFromPricesFallback: true,
            },
        ];
    }

    return [];
}

/** RATINGS & REVIEWS */
function extractRatingsReviewsFromHotelDetails(data) {
    return {
        overall_rating: data.overall_rating ?? null,
        reviews: data.reviews ?? null,
        ratings: Array.isArray(data.ratings) ? data.ratings : [],
        user_reviews: Array.isArray(data.other_reviews) ? data.other_reviews : [],
    };
}

/** NEARBY HIGHLIGHTS + HOTEL GPS COORDINATES */
function extractNearbyHighlightsFromHotelDetails(data) {
    const nearbyPlaces = Array.isArray(data.nearby_places) ? data.nearby_places : [];
    const hotelGps = data.gps_coordinates || null;

    const result = {
        hotel_coordinates: hotelGps,
        transport: [],
        pois: [],
        dining: [],
    };

    const pushNormalized = (targetArray, place) => {
        targetArray.push({
            category: place.category || null,
            name: place.name || null,
            thumbnail: place.thumbnail || null,
            rating: place.rating ?? null,
            reviews: place.reviews ?? null,
            gps_coordinates: place.gps_coordinates || null,
            transportations: Array.isArray(place.transportations)
                ? place.transportations
                : [],
        });
    };

    for (const place of nearbyPlaces) {
        if (!place) continue;
        const category = (place.category || "").toLowerCase();

        if (
            category.includes("airport") || category.includes("sân bay") ||
            category.includes("train station") || category.includes("ga tàu") || category.includes("nhà ga") ||
            category.includes("bus station") || category.includes("trạm xe buýt")
        ) {
            pushNormalized(result.transport, place);
            continue;
        }

        if (category.includes("point of interest") || category.includes("điểm quan tâm")) {
            pushNormalized(result.pois, place);
            continue;
        }

        if (category.includes("restaurant") || category.includes("nhà hàng")) {
            pushNormalized(result.dining, place);
            continue;
        }
    }

    return result;
}

/**
 * Nearby hotels: call SerpApi again, return up to 12 hotels
 */
async function extractNearbyHotelsFromHotelDetails(data) {
    const searchParams = data.search_parameters || {};
    const hotelName = data.name || searchParams.q || null;
    if (!hotelName) return [];

    const currentPropertyToken =
        searchParams.property_token || data.property_token || null;

    const normalizeName = (str) =>
        String(str || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const normalizedCurrentName = normalizeName(hotelName);

    const baseFromSearchParams = { ...searchParams };
    delete baseFromSearchParams.property_token;
    delete baseFromSearchParams.type;

    const params = {
        engine: baseFromSearchParams.engine || "google_hotels",
        ...baseFromSearchParams,
        q: `Hotels near "${hotelName}"`,
    };

    try {
        const resData = await SerpApiService.get(params);
        const properties = Array.isArray(resData.properties) ? resData.properties : [];

        const nearby = [];
        for (const prop of properties) {
            if (!prop || prop.type !== "hotel") continue;
            if (nearby.length >= 12) break;

            const propToken = prop.property_token || prop.token || null;

            if (currentPropertyToken && propToken && propToken === currentPropertyToken)
                continue;

            const normalizedPropName = normalizeName(prop.name);
            if (normalizedCurrentName && normalizedPropName === normalizedCurrentName)
                continue;

            nearby.push({
                property_token: propToken,
                name: prop.name || null,
                thumbnail:
                    (Array.isArray(prop.images) &&
                        prop.images.length > 0 &&
                        prop.images[0].thumbnail) ||
                    null,
                hotel_class: prop.extracted_hotel_class || null,
                overall_rating:
                    prop.overall_rating != null ? Number(prop.overall_rating) : null,
                reviews: prop.reviews != null ? Number(prop.reviews) : null,
                price: prop.rate_per_night?.lowest || prop.price || null,
            });
        }

        return nearby;
    } catch (err) {
        console.error(
            "Error fetching nearby hotels from SerpApi:",
            err?.response?.data || err.message
        );
        return [];
    }
}

/** Group all extraction into one function */
async function extractDetailsFromResponse(data) {
    const header = extractHeaderFromHotelDetails(data);
    const amenities = extractAmenitiesFromHotelDetails(data);
    const policies = extractPoliciesFromHotelDetails(data);
    const description = extractDescriptionFromHotelDetails(data);
    const rooms = extractRoomsFromHotelDetails(data);
    const ratings_reviews = extractRatingsReviewsFromHotelDetails(data);
    const nearby_highlights = extractNearbyHighlightsFromHotelDetails(data);
    const nearby_hotels = await extractNearbyHotelsFromHotelDetails(data);

    return {
        header,
        amenities,
        policies,
        description,
        rooms,
        ratings_reviews,
        nearby_highlights,
        nearby_hotels,
    };
}

/**
 * Pick best property based on hotel name
 */
function pickBestPropertyByName(properties, hotelNameRaw) {
    if (!Array.isArray(properties) || properties.length === 0) return null;
    if (!hotelNameRaw) return properties[0];

    const normalize = (str) =>
        String(str)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const hotelName = normalize(hotelNameRaw);
    const limit = Math.min(5, properties.length);

    for (let i = 0; i < limit; i++) {
        const p = properties[i];
        if (!p || !p.name) continue;
        const propName = normalize(p.name);

        if (propName.includes(hotelName) || hotelName.includes(propName)) return p;
    }

    return properties[0];
}

/**
 * Main use-case service: get hotel details
 * - 1st call: search
 * - 2nd call: property_details (if property_token found)
 * - extract fields via extractDetailsFromResponse()
 */
async function getHotelDetails(query) {
    const baseParams = buildParamsHotelDetails(query);

    // ---- First call: search ----
    let data = await SerpApiService.get(baseParams);

    // ---- Second call: property_details ----
    if (Array.isArray(data.properties) && data.properties.length > 0) {
        const hotelNameHint = query.q;

        const bestProperty = pickBestPropertyByName(data.properties, hotelNameHint);

        let propertyToken = bestProperty?.property_token || null;

        if (!propertyToken) {
            const firstProperty = data.properties[0];
            propertyToken = firstProperty.property_token || firstProperty.token || null;
        }

        if (propertyToken) {
            const detailsParams = {
                ...baseParams,
                property_token: propertyToken,
                type: "property_details",
            };

            data = await SerpApiService.get(detailsParams);
        }
    }

    // One place to extract everything
    return await extractDetailsFromResponse(data);
}

module.exports = { getHotelDetails };
