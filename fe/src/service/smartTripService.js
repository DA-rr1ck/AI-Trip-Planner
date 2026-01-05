
import { api } from '@/lib/api'


export async function generateSmartTrip(formData) {
    try {
        console.log('=== Calling /smart-trip/generate ===')
        console.log('Form data:', formData)

        const response = await api.post('/smart-trip/generate', formData)

        console.log('Response:', response.data)
        return response.data
    } catch (error) {
        console.error('Error generating smart trip:', error)
        
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to generate smart trip'
        throw new Error(errorMessage)
    }
}


export async function getAvailableLocations() {
    try {
        const response = await api.get('/smart-trip/locations')
        return response.data
    } catch (error) {
        console.error('Error fetching locations:', error)
        throw new Error(error.response?.data?.error || 'Failed to fetch locations')
    }
}