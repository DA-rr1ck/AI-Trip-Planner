const BE_ENV = process.env.BE_ENV || 'development';

// Map env → allowed origins array
const ALLOWED_ORIGINS_BY_ENV = {
    development: [
        process.env.CLIENT_ORIGIN_DEV_WEB,
        process.env.CLIENT_ORIGIN_DEV_MOBILE,
    ],
    production: [process.env.CLIENT_ORIGIN_PROD],
};

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_BY_ENV[BE_ENV];

module.exports = { ALLOWED_ORIGINS };
