const { db } = require('../config/firebase');
const { verifyToken } = require('./jwt');

async function getUserById(id) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Reads auth from:
 *   1) Cookie: req.cookies.token (web)
 *   2) Authorization header: "Bearer <token>" (mobile)
 *
 * Returns user document or null.
 */
async function getAuthUserFromRequest(req) {
    try {
        const cookieToken = req.cookies?.token;
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];

        let token = null;

        if (cookieToken) {
            token = cookieToken;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        } else {
            return null;
        }

        if (!token) return null;

        const decoded = verifyToken(token);
        if (!decoded?.uid) return null;

        const user = await getUserById(decoded.uid);
        return user || null;
    } catch (err) {
        console.error('getAuthUserFromRequest error:', err);
        return null;
    }
}

module.exports = {
    getUserById,
    getAuthUserFromRequest,
};
