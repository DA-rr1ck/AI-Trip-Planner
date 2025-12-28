// fe/src/service/tripService.js
import { api } from '../lib/api';

/**
 * Generate AI trip using backend API
 */
export async function generateAITrip(formData) {
    try {
        console.log('=== Calling /trip/generate-ai ===');
        console.log('Form data:', formData);

        const response = await api.post('/trip/generate-ai', formData);

        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error generating AI trip:', error);
        
        // Extract error message from axios error
        const errorMessage = error.response?.data?.error || error.message || 'Failed to generate trip';
        throw new Error(errorMessage);
    }
}

/**
 * Save trip to Firestore
 */
export async function saveTripToFirestore(tripData) {
    try {
        console.log('=== Calling /trip/save ===');
        console.log('Trip data:', tripData);

        const response = await api.post('/trip/save', tripData);

        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error saving trip:', error);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to save trip';
        throw new Error(errorMessage);
    }
}

/**
 * Get trip by ID
 */
export async function getTripById(tripId) {
    try {
        const response = await api.get(`/trip/${tripId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching trip:', error);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch trip';
        throw new Error(errorMessage);
    }
}

/**
 * Get all trips for a user
 */
export async function getUserTrips(userEmail) {
    try {
        console.log('Fetching trips for:', userEmail);
        
        const response = await api.get(`/trip/user/${userEmail}`);
        
        console.log('User trips response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching user trips:', error);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch trips';
        throw new Error(errorMessage);
    }
}

/**
 * Delete trip
 */
export async function deleteTrip(tripId) {
    try {
        const response = await api.delete(`/trip/${tripId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting trip:', error);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to delete trip';
        throw new Error(errorMessage);
    }
}