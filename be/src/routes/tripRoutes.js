const express = require('express');
const router = express.Router();
const { generateAITrip } = require('../controllers/aiTripController');
const { getTripById, getUserTrips, deleteTrip, saveTripToFirestore } = require('../controllers/tripController');

/**
 * POST /api/trip/generate-ai
 * Generate trip using AI (Gemini)
 */
router.post('/generate-ai', generateAITrip);

/**
 * POST /api/trip/save
 * Save AI-generated trip to Firestore
 */
router.post('/save', saveTripToFirestore);

/**
 * GET /api/trip/:tripId
 * Get trip by ID
 */
router.get('/:tripId', getTripById);

/**
 * GET /api/trip/user/:userEmail
 * Get all trips for a user
 */
router.get('/user/:userEmail', getUserTrips);



/**
 * DELETE /api/trip/:tripId
 * Delete trip
 */
router.delete('/:tripId', deleteTrip);


module.exports = router;