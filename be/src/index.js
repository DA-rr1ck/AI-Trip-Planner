require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { PORT = 8000 } = process.env;
const { ALLOWED_ORIGINS } = require('./utils/clientOrigin');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const serpHotelRoutes = require('./routes/hotelSerp');
const placesRoutes = require('./routes/placesSerp');
const serpAttractionRoutes = require('./routes/attractionSerp');
const imagesRoutes = require('./routes/images');
const smartTripRoutes = require('./routes/smartTripRoutes');
const tripRoutes = require('./routes/tripRoutes')
const app = express();

// Security & parsers
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(cookieParser());

// CORS (allow FE to send/receive cookies)
app.use(
    cors({
        origin(origin, cb) {
            // Allow tools without an Origin header (Postman, curl)
            if (!origin) return cb(null, true);

            if (ALLOWED_ORIGINS.includes(origin)) {
                return cb(null, true);
            }

            console.log('[CORS] Blocked origin:', origin);
            return cb(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);

// Routes
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/serp', serpHotelRoutes);
app.use('/api/serp', serpAttractionRoutes);
app.use('/api/serp', placesRoutes);
app.use('/api/serp', imagesRoutes);
app.use('/api/smart-trip', smartTripRoutes);
app.use('/api/trip', tripRoutes);
// Start
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
