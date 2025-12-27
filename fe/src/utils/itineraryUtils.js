export function flattenItineraryToSteps(tripDoc) {
    const itineraryRaw = tripDoc?.tripData?.Itinerary;
    if (!itineraryRaw) return [];

    const tripId = tripDoc.id;
    const steps = [];

    // Normalize: support both
    // 1) Object: { "yyyy-mm-dd": { ... }, ... }
    // 2) Array:  [ { "yyyy-mm-dd": { ... } }, ... ]
    let dayEntries = [];

    if (Array.isArray(itineraryRaw)) {
        // alternative shape: [{ "2025-12-20": {...} }, ...]
        for (const dayEntry of itineraryRaw) {
            const [dateKey, dayData] = Object.entries(dayEntry || {})[0] || [];
            if (!dateKey || !dayData) continue;
            dayEntries.push([dateKey, dayData]);
        }
    } else if (
        itineraryRaw &&
        typeof itineraryRaw === "object" &&
        !Array.isArray(itineraryRaw)
    ) {
        // current shape: { "2025-12-20": {...}, "2025-12-21": {...} }
        dayEntries = Object.entries(itineraryRaw);
    }

    const periods = ["Morning", "Lunch", "Afternoon", "Evening"];

    for (const [dateKey, dayData] of dayEntries) {
        if (!dateKey || !dayData) continue;

        for (const period of periods) {
            const periodData = dayData[period];
            if (!periodData || !Array.isArray(periodData.Activities)) continue;

            for (const activity of periodData.Activities) {
                const {
                    ActivityId,
                    ActivityType = "normal_attraction",
                    PlaceName,
                    GeoCoordinates,
                    ScheduleStart,
                    ScheduleEnd,
                    PlaceDetails,
                } = activity || {};

                if (!ActivityId || !GeoCoordinates || !ScheduleStart) continue;

                const lat = GeoCoordinates?.Latitude;
                const lng = GeoCoordinates?.Longitude;
                if (typeof lat !== "number" || typeof lng !== "number") continue;

                steps.push({
                    stepId: ActivityId,
                    tripId,
                    dateKey,
                    period,
                    activityType: ActivityType,
                    placeName: PlaceName || "",
                    placeDetails: PlaceDetails || "",
                    lat,
                    lng,
                    scheduledStart: ScheduleStart,
                    scheduledEnd: ScheduleEnd || null,
                });
            }
        }
    }

    // Sort by scheduled start-time ascending
    steps.sort((a, b) => {
        const tA = a.scheduledStart?.toMillis
            ? a.scheduledStart.toMillis()
            : new Date(a.scheduledStart).getTime();
        const tB = b.scheduledStart?.toMillis
            ? b.scheduledStart.toMillis()
            : new Date(b.scheduledStart).getTime();
        return tA - tB;
    });

    console.log('[flattenItineraryToSteps] steps for trip', tripId, steps);
    return steps;
}

// Helper to find the "current" / "next" step based on now
export function findCurrentOrNextStep(steps, now = new Date()) {
    if (!Array.isArray(steps) || steps.length === 0) return null;

    const nowMs = now.getTime();

    // 1) Prefer a step whose window includes now
    for (const step of steps) {
        const startMs = step.scheduledStart?.toMillis
            ? step.scheduledStart.toMillis()
            : new Date(step.scheduledStart).getTime();
        const endMs = step.scheduledEnd?.toMillis
            ? step.scheduledEnd.toMillis()
            : startMs + 2 * 60 * 60 * 1000; // fallback 2h after start

        if (nowMs >= startMs && nowMs <= endMs) {
            return step;
        }
    }

    // 2) Otherwise, pick the next upcoming step
    for (const step of steps) {
        const startMs = step.scheduledStart?.toMillis
            ? step.scheduledStart.toMillis()
            : new Date(step.scheduledStart).getTime();
        if (startMs > nowMs) return step;
    }

    // 3) Otherwise, last one in the past
    return steps[steps.length - 1];
}
