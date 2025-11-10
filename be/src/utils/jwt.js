const jwt = require('jsonwebtoken');

const { JWT_SECRET, AUTH_EXPIRATION } = process.env;

function getJwtExpiresInSeconds() {
  const n = Number(AUTH_EXPIRATION);
  return Number.isFinite(n) && n > 0 ? n : 3600; // default 1h
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: getJwtExpiresInSeconds() });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
