require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { PORT = 8000, CLIENT_ORIGIN } = process.env;
const authRoutes = require('./routes/auth');

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
// app.use('/api/auth/google', googleRoutes);

// Start
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
