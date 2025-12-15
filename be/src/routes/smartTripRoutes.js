// be/src/routes/smartTripRoutes.js
const express = require('express');
const router = express.Router();
const { 
    generateSmartTripController, 
    getAvailableLocations 
} = require('../controllers/smartTripController');

/**
 * POST /api/smart-trip/generate
 * Generate trip using database + AI
 */
router.post('/generate', generateSmartTripController);

/**
 * GET /api/smart-trip/locations
 * Get available locations
 */
router.get('/locations', getAvailableLocations);

module.exports = router;