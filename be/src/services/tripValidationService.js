const { differenceInDays } = require('date-fns');

function validateTripInput(data) {
    const { 
        location, 
        startDate, 
        endDate, 
        budgetMin, 
        budgetMax, 
        adults, 
        children, 
        childrenAges 
    } = data;

    // Check required fields
    if (!location || !startDate || !endDate) {
        return {
            isValid: false,
            error: 'Missing required fields: location, startDate, or endDate'
        };
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
            isValid: false,
            error: 'Invalid date format'
        };
    }

    if (start < new Date()) {
        return {
            isValid: false,
            error: 'Start date cannot be in the past'
        };
    }

    if (end < start) {
        return {
            isValid: false,
            error: 'End date must be after start date'
        };
    }

    const totalDays = differenceInDays(end, start) + 1;
    
    if (totalDays < 1 || totalDays > 30) {
        return {
            isValid: false,
            error: 'Trip duration must be between 1 and 30 days'
        };
    }

    // Validate budget
    if (budgetMin < 0 || budgetMax < 0 || budgetMin >= budgetMax) {
        return {
            isValid: false,
            error: 'Invalid budget range'
        };
    }

    // Validate travelers
    if (adults === 0 && children === 0) {
        return {
            isValid: false,
            error: 'At least one traveler is required'
        };
    }

    // Validate children ages
    if (children > 0) {
        if (!childrenAges || childrenAges.length !== children) {
            return {
                isValid: false,
                error: 'Please provide ages for all children'
            };
        }

        if (childrenAges.some(age => age < 0 || age > 17)) {
            return {
                isValid: false,
                error: 'Children ages must be between 0 and 17'
            };
        }
    }

    return { isValid: true };
}

module.exports = {
    validateTripInput
};