const { getAuthUserFromRequest } = require("../utils/authUser");
const attractionSerpService = require("../services/attractionSerpService");

const getDetails = async (req, res) => {
    if (!process.env.SERPAPI_KEY) {
        return res
            .status(500)
            .json({ error: "Missing SERPAPI_KEY in environment variables" });
    }

    if (!req.query.q) {
        return res
            .status(400)
            .json({ error: 'Query parameter "q" (search query) is required' });
    }

    try {
        const me = await getAuthUserFromRequest(req);
        if (!me) return res.status(401).json({ message: "Unauthorized" });

        const result = await attractionSerpService.getAttractionDetails(req.query);

        return res.json({
            query: { ...req.query },
            ...result,
        });
    } catch (err) {
        console.error(
            "Error fetching attraction details from SerpApi:",
            err?.response?.data || err?.message
        );

        const status = err?.response?.status || err?.statusCode || 500;
        return res.status(status).json({
            error: "Failed to fetch attraction details from SerpApi",
            details:
                err?.response?.data?.error ||
                err?.response?.data?.error_message ||
                err?.message,
        });
    }
};

module.exports = { getDetails };
