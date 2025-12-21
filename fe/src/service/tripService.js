export async function generateAITrip(formData) {
    try {
        const response = await fetch('/api/trip/generate-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate trip');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error generating AI trip:', error);
        throw error;
    }
}

export async function saveTripToFirestore(tripData) {
    try {
        const response = await fetch('/api/trip/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tripData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save trip');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error saving trip:', error);
        throw error;
    }
}


export async function getTripById(tripId) {
    try {
        const response = await fetch(`/api/trip/${tripId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load trip');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching trip:', error);
        throw error;
    }
}

/**
 * Get all trips for a user using backend API
 */
export async function getUserTrips(userEmail) {
    try {
        const response = await fetch(`/api/trip/user/${userEmail}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load trips');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching user trips:', error);
        throw error;
    }
}

/**
 * Delete trip using backend API
 */
export async function deleteTrip(tripId) {
    try {
        const response = await fetch(`/api/trip/${tripId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete trip');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error deleting trip:', error);
        throw error;
    }
}

/**
 * Update trip using backend API
 */
export async function updateTrip(tripId, updateData) {
    try {
        const response = await fetch(`/api/trip/${tripId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update trip');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error updating trip:', error);
        throw error;
    }
}

