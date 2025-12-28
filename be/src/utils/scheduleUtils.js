// be/src/utils/scheduleUtils.js
const { Timestamp } = require('firebase-admin/firestore');

function addScheduleToItinerary(itinerary, timezone = 'Asia/Ho_Chi_Minh') {
    const result = {};

    Object.entries(itinerary).forEach(([dateKey, dayData]) => {
        result[dateKey] = {
            ...dayData,
            Morning: addScheduleToSlot(dayData.Morning, dateKey, timezone),
            Lunch: addScheduleToSlot(dayData.Lunch, dateKey, timezone),
            Afternoon: addScheduleToSlot(dayData.Afternoon, dateKey, timezone),
            Evening: addScheduleToSlot(dayData.Evening, dateKey, timezone),
        };
    });

    return result;
}

function addScheduleToSlot(slot, dateKey, timezone) {
    if (!slot) return null;

    const result = {
        ...slot,
        StartTime: slot.StartTime || '00:00',
        EndTime: slot.EndTime || '23:59',
    };

    // Process Activities array
    if (slot.Activities && Array.isArray(slot.Activities)) {
        result.Activities = slot.Activities.map((activity) => {
            // ✅ Convert ISO strings to Firestore Timestamps
            let scheduleStart = activity.ScheduleStart;
            let scheduleEnd = activity.ScheduleEnd;
            
            // If already strings (from frontend), convert to Timestamp
            if (typeof scheduleStart === 'string') {
                scheduleStart = Timestamp.fromDate(new Date(scheduleStart));
            }
            if (typeof scheduleEnd === 'string') {
                scheduleEnd = Timestamp.fromDate(new Date(scheduleEnd));
            }
            
            // If null/undefined, generate from TimeSlot
            if (!scheduleStart || !scheduleEnd) {
                const generated = activity.TimeSlot 
                    ? createScheduleTimestamps(activity.TimeSlot, dateKey, timezone)
                    : { ScheduleStart: null, ScheduleEnd: null };
                scheduleStart = generated.ScheduleStart;
                scheduleEnd = generated.ScheduleEnd;
            }
            
            return {
                ...activity,
                ScheduleStart: scheduleStart,
                ScheduleEnd: scheduleEnd
            };
        });
    }

    // Process single Activity (Lunch)
    if (slot.Activity) {
        let scheduleStart = slot.Activity.ScheduleStart;
        let scheduleEnd = slot.Activity.ScheduleEnd;
        
        // Convert strings to Timestamps
        if (typeof scheduleStart === 'string') {
            scheduleStart = Timestamp.fromDate(new Date(scheduleStart));
        }
        if (typeof scheduleEnd === 'string') {
            scheduleEnd = Timestamp.fromDate(new Date(scheduleEnd));
        }
        
        // Generate if missing
        if (!scheduleStart || !scheduleEnd) {
            const generated = slot.Activity.TimeSlot
                ? createScheduleTimestamps(slot.Activity.TimeSlot, dateKey, timezone)
                : { ScheduleStart: null, ScheduleEnd: null };
            scheduleStart = generated.ScheduleStart;
            scheduleEnd = generated.ScheduleEnd;
        }
        
        result.Activity = {
            ...slot.Activity,
            ScheduleStart: scheduleStart,
            ScheduleEnd: scheduleEnd
        };
    }

    return result;
}

function createScheduleTimestamps(timeSlot, dateKey, timezone) {
    const match = timeSlot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (!match) {
        return { ScheduleStart: null, ScheduleEnd: null };
    }

    try {
        const startTime = match[1].trim();
        const endTime = match[2].trim();
        
        const baseDate = new Date(dateKey + 'T00:00:00');
        
        const startDateTime = parseTime(startTime, baseDate, timezone);
        const endDateTime = parseTime(endTime, baseDate, timezone);
        
        // Return Firestore Timestamps
        return {
            ScheduleStart: Timestamp.fromDate(startDateTime),
            ScheduleEnd: Timestamp.fromDate(endDateTime)
        };
    } catch (error) {
        console.error('Error creating schedule timestamps:', error);
        return { ScheduleStart: null, ScheduleEnd: null };
    }
}

function parseTime(timeStr, baseDate, timezone) {
    const upper = timeStr.toUpperCase();
    const isPM = upper.includes('PM');
    const isAM = upper.includes('AM');

    const timeOnly = timeStr.replace(/\s*(AM|PM)/gi, '').trim();
    const [hoursStr, minutesStr] = timeOnly.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;

    if (isAM && hours === 12) hours = 0;
    if (isPM && hours !== 12) hours += 12;

    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
}

module.exports = {
    addScheduleToItinerary
};