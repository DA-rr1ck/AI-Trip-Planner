const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_ENDPOINT = 'https://serpapi.com/search';

function buildBaseParams(query) {
    const {
        q,
        hl,
    } = query;

    const params = {
        api_key: SERPAPI_KEY,
        engine: 'google_images_light',
        q: q,
        location: 'Vietnam',
        google_domain: 'google.com.vn',
        gl: 'vn',
        hl: 'en',
    };

    if (hl) params.hl = hl;

    return params;
}

router.get('/images/search', async (req, res) => {
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

        const baseParams = buildBaseParams(req.query);

        const serpRes = await axios.get(SERPAPI_ENDPOINT, {
            params: baseParams,
        });
        
        const imagesResults = serpRes.data?.images_results || [];

        // Take top 10 results, map to { original, thumbnail }
        const images = imagesResults.slice(0, 10).map((img) => ({
            original: img.original || null,
            thumbnail: img.thumbnail || null,
        }));

        return res.json({ images });
    } catch (err) {
        console.error(
            'Error fetching images from SerpApi:', 
            err?.response?.data || err.message
        );

        const status = err.response?.status || 500;
        return res.status(status).json({
            error: 'Failed to fetch images from SerpApi',
            details:
                err.response?.data?.error ||
                err.response?.data?.error_message ||
                err.message,
        });
    }
});

module.exports = router;
