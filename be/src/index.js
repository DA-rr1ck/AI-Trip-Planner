require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { PORT = 8000, CLIENT_ORIGIN } = process.env;
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const serpRoutes = require('./routes/hotelSerp');
const placesRoutes = require('./routes/placesSerp');
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
        origin: CLIENT_ORIGIN,
        credentials: true,
    })
);

// Routes
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/serp', serpRoutes);
app.use('/api/serp', placesRoutes);
app.use('/api/serp', imagesRoutes);
app.use('/api/smart-trip', smartTripRoutes);
app.use('/api/trip', tripRoutes);
// Start
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
