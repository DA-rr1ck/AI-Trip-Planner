
export async function generateSmartTrip(formData) {
    try {
        const response = await fetch('/api/smart-trip/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location: formData.location,
                startDate: formData.startDate,
                endDate: formData.endDate,
                budgetMin: formData.budgetMin,
                budgetMax: formData.budgetMax,
                adults: formData.adults,
                children: formData.children,
                childrenAges: formData.childrenAges || []
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate trip');
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('Error generating smart trip:', error);
        throw error;
    }
}

/**
 * Get available locations from database
 */
export async function getAvailableLocations() {
    try {
        const response = await fetch('/api/smart-trip/locations');
        
        if (!response.ok) {
            throw new Error('Failed to fetch locations');
        }

        const result = await response.json();
        return result.locations || [];
    } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
}