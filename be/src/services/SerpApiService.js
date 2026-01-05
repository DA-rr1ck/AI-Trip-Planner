const axios = require("axios");

const SERPAPI_BASE_URL = "https://serpapi.com/search";

function ensureSerpApiKey() {
    const key = process.env.SERPAPI_KEY;
    if (!key) {
        const err = new Error("Missing SERPAPI_KEY");
        err.statusCode = 500;
        throw err;
    }
    return key;
}

async function get(params) {
    const api_key = ensureSerpApiKey();

    const resp = await axios.get(SERPAPI_BASE_URL, {
        params: {
            api_key,
            ...params,
        },
    });

    return resp.data || {};
}

module.exports = { get };
