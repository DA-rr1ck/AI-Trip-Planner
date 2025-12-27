import { useEffect, useMemo, useRef } from "react";
import { notifyOnce } from "@/service/localNotifications";

function formatLateEarly(status, deltaMinutes) {
    if (status === "on_time") return "On time";
    if (typeof deltaMinutes !== "number") return status;
    const m = Math.abs(Math.round(deltaMinutes));
    if (status === "late") return `Late +${m}m`;
    if (status === "early") return `Early -${m}m`;
    return status;
}

export function useTripNotifications({
    enabled,
    tripId,
    steps = [],
    stepStatuses = {},
}) {
    const prevRef = useRef({}); // stepId -> previous snapshot

    const stepById = useMemo(() => {
        const m = new Map();
        (steps || []).forEach((s) => m.set(s.stepId, s));
        return m;
    }, [steps]);

    useEffect(() => {
        if (!enabled) return;
        if (!tripId) return;

        const prevMap = prevRef.current || {};
        const nextMap = stepStatuses || {};

        const nextPrev = { ...prevMap };

        for (const [stepId, next] of Object.entries(nextMap)) {
            if (!next) continue;

            const prev = prevMap[stepId];
            const step = stepById.get(stepId);

            const placeName = step?.placeName || "activity";

            const prevArrived = Boolean(prev?.actualArrivalTime);
            const nextArrived = Boolean(next?.actualArrivalTime);

            // 1) Became late (not arrived yet)
            if (
                next.status === "late" &&
                !nextArrived &&
                prev?.status !== "late"
            ) {
                notifyOnce({
                    key: `${tripId}:${stepId}:late_not_arrived`,
                    title: "You’re running late",
                    body: `You’re late for ${placeName}.`,
                    extra: { tripId, stepId, scenario: "late_not_arrived" },
                });
            }

            // 2) Arrived (entered geofence for the first time)
            if (!prevArrived && nextArrived) {
                notifyOnce({
                    key: `${tripId}:${stepId}:arrived`,
                    title: "Arrived",
                    body: `${placeName} — ${formatLateEarly(next.status, next.deltaMinutes)}.`,
                    extra: { tripId, stepId, scenario: "arrived" },
                });
            }

            // 3) Activity started AND user is inside geofence => in progress
            if (next.performing && !prev?.performing) {
                notifyOnce({
                    key: `${tripId}:${stepId}:in_progress`,
                    title: "Activity started",
                    body: `${placeName} is in progress.`,
                    extra: { tripId, stepId, scenario: "in_progress" },
                });
            }

            // 4) Activity completed
            if (next.phase === "completed" && prev?.phase !== "completed") {
                notifyOnce({
                    key: `${tripId}:${stepId}:completed`,
                    title: "Activity finished",
                    body: `${placeName} has ended.`,
                    extra: { tripId, stepId, scenario: "completed" },
                });
            }

            nextPrev[stepId] = next;
        }

        prevRef.current = nextPrev;
    }, [enabled, tripId, stepById, stepStatuses]);
}
