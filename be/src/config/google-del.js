const { OAuth2Client } = require('google-auth-library');

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI = `${process.env.SERVER_BASE_URL}/api/auth/google/callback`
} = process.env;

function getOAuthClient() {
    return new OAuth2Client({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri: GOOGLE_REDIRECT_URI
    });
}

module.exports = { getOAuthClient };
