const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        const decoded = verifyToken(token);
        req.user = decoded; // { uid, email }
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = { requireAuth };
