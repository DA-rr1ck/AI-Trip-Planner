// be/src/controllers/tripController.js
const { db } = require('../config/firebase');
const { addScheduleToItinerary } = require('../utils/scheduleUtils');

/**
 * Get trip by ID
 * GET /api/trip/:tripId
 */
async function getTripById(req, res) {
    try {
        const { tripId } = req.params;

        if (!tripId) {
            return res.status(400).json({
                success: false,
                error: 'Trip ID is required'
            });
        }

        const docRef = db.collection('AITrips').doc(tripId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        return res.json({
            success: true,
            trip: {
                id: doc.id,
                ...doc.data()
            }
        });
    } catch (error) {
        console.error('Error fetching trip:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch trip'
        });
    }
}

/**
 * Get all trips for a user
 * GET /api/trip/user/:userEmail
 */
async function getUserTrips(req, res) {
    try {
        const { userEmail } = req.params;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        // Remove orderBy to avoid composite index requirement
        const snapshot = await db.collection('AITrips')
            .where('userEmail', '==', userEmail)
            .get();

        const trips = [];
        snapshot.forEach(doc => {
            trips.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort in memory instead
        trips.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Newest first
        });

        return res.json({
            success: true,
            trips,
            count: trips.length
        });
    } catch (error) {
        console.error('Error fetching user trips:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch trips'
        });
    }
}

/**
 * Save or update trip
 * POST /api/trip/save
 */
async function saveTripToFirestore(req, res) {
    try {
        const {
            tripId,
            userEmail,
            userSelection,
            tripData,
            selectedHotels
        } = req.body;

        console.log('Saving trip for user:', userEmail);
        console.log('Trip ID received:', tripId);

        // 1. Validate required fields
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        if (!selectedHotels || selectedHotels.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please select at least one hotel'
            });
        }

        // 2. Check for empty days
        const emptyDays = Object.entries(tripData.Itinerary || {})
            .filter(([_, dayData]) => {
                const morningCount = dayData.Morning?.Activities?.length || 0;
                const lunchCount = dayData.Lunch?.Activity ? 1 : 0;
                const afternoonCount = dayData.Afternoon?.Activities?.length || 0;
                const eveningCount = dayData.Evening?.Activities?.length || 0;
                return (morningCount + lunchCount + afternoonCount + eveningCount) === 0;
            })
            .map(([dateKey]) => dateKey);

        if (emptyDays.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Please add activities to days: ${emptyDays.join(', ')}`
            });
        }

        // 3. Determine if this is a new trip or update
        const isNewTrip = !tripId || tripId.startsWith('temp_');
        const docId = isNewTrip ? Date.now().toString() : tripId;

        console.log('Is new trip:', isNewTrip);
        console.log('Document ID to use:', docId);

        // 4. If updating, check if trip exists
        if (!isNewTrip) {
            const existingDoc = await db.collection('AITrips').doc(docId).get();
            if (!existingDoc.exists) {
                return res.status(404).json({
                    success: false,
                    error: 'Trip not found'
                });
            }
        }

        // 5. Add schedules to itinerary
        const timezone = tripData.Timezone || 'Asia/Ho_Chi_Minh';
        const itineraryWithSchedules = addScheduleToItinerary(tripData.Itinerary, timezone);

        // 6. Clean itinerary (remove IDs)
        const cleanedItinerary = cleanItinerary(itineraryWithSchedules);

        // 7. Prepare document
        const tripDocument = {
            id: docId,
            userEmail,
            userSelection,
            tripData: {
                Location: tripData.Location,
                Duration: tripData.Duration,
                Budget: tripData.Budget,
                Travelers: tripData.Travelers,
                TotalTravelers: tripData.TotalTravelers,
                Timezone: timezone,
                Hotels: selectedHotels,
                Itinerary: cleanedItinerary
            },
            updatedAt: new Date().toISOString(),
            generationMethod: tripData.generationMethod || 'ai'
        };

        // Add createdAt only for new trips
        if (isNewTrip) {
            tripDocument.createdAt = new Date().toISOString();
        }

        // 8. Save to Firestore
        await db.collection('AITrips').doc(docId).set(tripDocument, { merge: !isNewTrip });

        console.log(`Trip ${isNewTrip ? 'created' : 'updated'} successfully:`, docId);

        return res.json({
            success: true,
            tripId: docId,
            message: isNewTrip ? 'Trip saved successfully!' : 'Trip updated successfully!'
        });

    } catch (error) {
        console.error('Error saving trip:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to save trip'
        });
    }
}

/**
 * Delete trip by ID
 * DELETE /api/trip/:tripId
 */
async function deleteTrip(req, res) {
    try {
        const { tripId } = req.params;

        if (!tripId) {
            return res.status(400).json({
                success: false,
                error: 'Trip ID is required'
            });
        }

        // Check if trip exists
        const docRef = db.collection('AITrips').doc(tripId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        // Delete the trip
        await docRef.delete();

        return res.json({
            success: true,
            message: 'Trip deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting trip:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete trip'
        });
    }
}

/**
 * Helper function to clean itinerary (remove temporary IDs)
 */
function cleanItinerary(itinerary) {
    const cleaned = {};

    Object.entries(itinerary).forEach(([dateKey, dayData]) => {
        const cleanedDay = {
            Theme: dayData.Theme
        };

        // Clean Morning
        if (dayData.Morning?.Activities && dayData.Morning.Activities.length > 0) {
            cleanedDay.Morning = {
                StartTime: dayData.Morning.StartTime,
                EndTime: dayData.Morning.EndTime,
                Activities: dayData.Morning.Activities.map(({ id, ...activity }) => activity)
            };
        }

        // Clean Lunch
        if (dayData.Lunch?.Activity) {
            cleanedDay.Lunch = {
                StartTime: dayData.Lunch.StartTime,
                EndTime: dayData.Lunch.EndTime,
                Activity: (({ id, ...activity }) => activity)(dayData.Lunch.Activity)
            };
        }

        // Clean Afternoon
        if (dayData.Afternoon?.Activities && dayData.Afternoon.Activities.length > 0) {
            cleanedDay.Afternoon = {
                StartTime: dayData.Afternoon.StartTime,
                EndTime: dayData.Afternoon.EndTime,
                Activities: dayData.Afternoon.Activities.map(({ id, ...activity }) => activity)
            };
        }

        // Clean Evening
        if (dayData.Evening?.Activities && dayData.Evening.Activities.length > 0) {
            cleanedDay.Evening = {
                StartTime: dayData.Evening.StartTime,
                EndTime: dayData.Evening.EndTime,
                Activities: dayData.Evening.Activities.map(({ id, ...activity }) => activity)
            };
        }

        cleaned[dateKey] = cleanedDay;
    });

    return cleaned;
}

module.exports = {
    getTripById,
    getUserTrips,
    saveTripToFirestore,
    deleteTrip
};