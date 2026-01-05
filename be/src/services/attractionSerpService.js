const SerpApiService = require("./SerpApiService");

/**
 * Build base params for Google Maps Place Results.
 * NOTE: api_key is NOT included here (SerpApiService adds it)
 */
function buildBasePlaceParams(query) {
    const { q, hl } = query;

    return {
        engine: "google_maps",
        google_domain: "google.com",
        q,
        gl: "vn",
        hl: hl || "en",
        type: "search",
    };
}

/**
 * Fetch place_results
 */
async function fetchPlaceResults(query) {
    const params = buildBasePlaceParams(query);
    const data = await SerpApiService.get(params);
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
        engine: "google_images_light",
        google_domain: "google.com.vn",
        q: searchQuery,
        location: "Vietnam",
        gl: "vn",
        hl: "en",
    };

    if (query.hl) params.hl = query.hl;

    try {
        const data = await SerpApiService.get(params);
        const imagesResults = data?.images_results || [];

        return imagesResults
            .slice(0, 8)
            .map((img) => img?.original)
            .filter(Boolean);
    } catch (err) {
        console.error(
            "Error fetching attraction images from SerpApi:",
            err?.response?.data || err?.message
        );
        return [];
    }
}

/**
 * HEADER
 */
function extractHeaderFromAttractionDetails(place, images) {
    if (!place || typeof place !== "object") {
        return {
            name: null,
            address: null,
            operating_time: null,
            visiting_hours_recommendation: null,
            contacts: { phone: null, website: null },
            images: [],
            gps_coordinates: null,
        };
    }

    const hours = place.hours;
    let operatingTime = null;

    if (Array.isArray(hours)) {
        const mondayEntry = hours.find((h) => h && (h.monday || h.Monday));
        if (mondayEntry) operatingTime = mondayEntry.monday || mondayEntry.Monday;
        else operatingTime = hours;
    } else if (hours && typeof hours === "object") {
        operatingTime = hours.monday || hours.Monday || hours;
    } else if (hours) {
        operatingTime = hours;
    }

    const visitingHoursRecommendation =
        place.popular_times?.live_hash?.time_spent || null;

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
 * DESCRIPTION
 */
function extractDescriptionFromAttractionDetails(place) {
    return place?.description || null;
}

/**
 * TICKETS/PASSES
 */
function extractTicketsPassesFromAttractionDetails(place) {
    return Array.isArray(place?.experiences) ? place.experiences.slice(0, 5) : [];
}

/**
 * RATINGS/REVIEWS
 */
function extractRatingsReviewsFromAttractionDetails(place) {
    const userReviews =
        place?.user_reviews && Array.isArray(place.user_reviews.most_relevant)
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

function normalizeString(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Fetch NearbyPlaces:
 * - Uses place_results.gps_coordinates
 * - For each q in ["Hotels", "Attractions", "Restaurants"]
 * - google_maps engine, type=search → local_results
 */
async function fetchNearbyPlaces(place, query) {
    if (!place) {
        return { hotels: [], attractions: [], restaurants: [] };
    }

    const gps = place.gps_coordinates || {};
    const lat = gps.latitude ?? gps.lat;
    const lon = gps.longitude ?? gps.lng ?? gps.lon;

    if (lat == null || lon == null) {
        return { hotels: [], attractions: [], restaurants: [] };
    }

    const hl = query.hl || "en";
    const currentAttractionTitle = normalizeString(query?.q);

    const categories = [
        { key: "hotels", q: "Hotels" },
        { key: "attractions", q: "Attractions" },
        { key: "restaurants", q: "Restaurants" },
    ];

    const result = { hotels: [], attractions: [], restaurants: [] };

    await Promise.all(
        categories.map(async (cat) => {
            const params = {
                engine: "google_maps",
                google_domain: "google.com",
                q: `${cat.q} near ${place.title}`,
                ll: `@${lat},${lon},15z`,
                gl: "vn",
                hl,
                type: "search",
            };

            try {
                const data = await SerpApiService.get(params);
                const localResults = Array.isArray(data?.local_results)
                    ? data.local_results
                    : [];

                let normalized = localResults
                    .map((item) => normalizeNearbyPlace(item, cat.q))
                    .filter(Boolean);

                // Exclude the current queried attraction from the attractions array
                if (cat.key === "attractions" && currentAttractionTitle) {
                    normalized = normalized.filter(
                        (item) => normalizeString(item.title) !== currentAttractionTitle
                    );
                }

                result[cat.key] = normalized;
            } catch (err) {
                console.error(
                    `Error fetching nearby ${cat.q} from SerpApi:`,
                    err?.response?.data || err?.message
                );
                result[cat.key] = [];
            }
        })
    );

    return result;
}

/**
 * Group extraction into one function (matches your diagram idea: extractDetailsFromResponse)
 */
function extractDetailsFromResponse(place, images, nearby_places) {
    return {
        header: extractHeaderFromAttractionDetails(place, images),
        description: extractDescriptionFromAttractionDetails(place),
        tickets_passes: extractTicketsPassesFromAttractionDetails(place),
        ratings_reviews: extractRatingsReviewsFromAttractionDetails(place),
        nearby_places,
    };
}

/**
 * Main use-case service: get attraction details
 */
async function getAttractionDetails(query) {
    const place = await fetchPlaceResults(query);

    if (!place) {
        const err = new Error("No place_results found for this attraction");
        err.statusCode = 404;
        throw err;
    }

    // Fetch images + nearby in parallel
    const [images, nearby_places] = await Promise.all([
        fetchAttractionImages(place, query),
        fetchNearbyPlaces(place, query),
    ]);

    return extractDetailsFromResponse(place, images, nearby_places);
}

module.exports = { getAttractionDetails };
