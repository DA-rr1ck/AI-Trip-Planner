// be/src/utils/scheduleUtils.js
const { toZonedTime, format: formatTZ } = require('date-fns-tz');

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

    const startTime = slot.StartTime || '00:00';
    const endTime = slot.EndTime || '23:59';

    const result = {
        ...slot,
        StartTime: startTime,
        EndTime: endTime,
    };

    // Add schedule to activities
    if (slot.Activities && Array.isArray(slot.Activities)) {
        result.Activities = slot.Activities.map((activity) => ({
            ...activity,
            Schedule: activity.TimeSlot 
                ? createScheduleFromTimeSlot(activity.TimeSlot, dateKey, timezone)
                : null,
        }));
    }

    // Add schedule to single activity (Lunch)
    if (slot.Activity) {
        result.Activity = {
            ...slot.Activity,
            Schedule: slot.Activity.TimeSlot
                ? createScheduleFromTimeSlot(slot.Activity.TimeSlot, dateKey, timezone)
                : null,
        };
    }

    return result;
}

function createScheduleFromTimeSlot(timeSlot, dateKey, timezone) {
    const match = timeSlot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (!match) return null;

    try {
        const startTime = match[1].trim();
        const endTime = match[2].trim();

        const baseDate = new Date(dateKey + 'T00:00:00');
        const zonedDate = toZonedTime(baseDate, timezone);

        const startDateTime = parseTime(startTime, zonedDate, timezone);
        const endDateTime = parseTime(endTime, zonedDate, timezone);

        return {
            StartDateTime: formatTZ(startDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: timezone }),
            EndDateTime: formatTZ(endDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: timezone }),
            Timezone: timezone,
        };
    } catch (error) {
        console.error('Error creating schedule:', error);
        return null;
    }
}

function parseTime(timeStr, baseDate, timezone) {
    const upper = timeStr.toUpperCase();
    const isPM = upper.includes('PM');
    const isAM = upper.includes('AM');

    const timeOnly = timeStr.replace(/\s*(AM|PM)/gi, '').trim();
    const [hoursStr, minutesStr] = timeOnly.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isAM && hours === 12) hours = 0;
    if (isPM && hours !== 12) hours += 12;

    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    
    return toZonedTime(result, timezone);
}

module.exports = {
    addScheduleToItinerary
};