import { db } from "@/service/firebaseConfig";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";

/**
 * Save one GPS point for a trip.
 */
export async function saveTripLocation({
    tripId,
    userEmail,
    stepId,
    activityType,
    placeName,
    latitude,
    longitude,
    accuracy,
    source = "gps",
    timestamp,
}) {
    if (!tripId || typeof latitude !== "number" || typeof longitude !== "number") return;

    try {
        const colRef = collection(db, "TripLocations");

        const ts =
            timestamp instanceof Date ? timestamp : timestamp ? new Date(timestamp) : new Date();

        await addDoc(colRef, {
            tripId,
            userEmail: userEmail || null,
            stepId: stepId || null,
            activityType: activityType || null,
            placeName: placeName || null,
            latitude,
            longitude,
            accuracy: typeof accuracy === "number" ? accuracy : null,
            source,
            timestamp: ts,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("[Firestore] Failed to save trip location", error);
    }
}

/**
 * Upsert status for one itinerary step.
 */
export async function saveStepStatus({
    tripId,
    userEmail,
    stepId,
    activityType,
    placeName,

    status,
    deltaMinutes,
    actualArrivalTime,

    // New fields for notifications
    phase, // "before_start" | "in_progress" | "completed"
    performing, // boolean
}) {
    if (!tripId || !stepId || !status) return;

    try {
        const docId = `${tripId}_${stepId}`;
        const ref = doc(db, "TripStepStatuses", docId);

        const arrival =
            actualArrivalTime instanceof Date
                ? actualArrivalTime
                : actualArrivalTime
                    ? new Date(actualArrivalTime)
                    : null;

        await setDoc(
            ref,
            {
                tripId,
                stepId,
                userEmail: userEmail || null,
                activityType: activityType || null,
                placeName: placeName || null,

                status,
                deltaMinutes: typeof deltaMinutes === "number" ? deltaMinutes : null,
                actualArrivalTime: arrival,

                // for notifications
                phase: phase || null,
                performing: typeof performing === "boolean" ? performing : null,

                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (error) {
        console.error("[Firestore] Failed to save step status", error);
    }
}
