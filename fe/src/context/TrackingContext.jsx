import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTripTracking } from "@/hooks/useTripTracking";

const TrackingContext = createContext(null);

export function TrackingProvider({ children }) {
    const [activeTrip, setActiveTrip] = useState(null);
    const [activeSteps, setActiveSteps] = useState([]);
    const [wantsTracking, setWantsTracking] = useState(false);

    // Hook lives at app-level
    const tracking = useTripTracking(activeTrip, activeSteps);

    const startingRef = useRef(false);

    // Start engine once React state (activeTrip/activeSteps) is committed.
    useEffect(() => {
        if (!wantsTracking) return;
        if (!activeTrip?.id) return;
        if (tracking.isTracking) return;

        let cancelled = false;
        (async () => {
            try {
                await tracking.startTracking();
            } finally {
                // if startTracking fails, keep wantsTracking=true so UI can show error/status
                if (cancelled) return;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [wantsTracking, activeTrip?.id, tracking.isTracking, tracking.startTracking]);

    const startTripTracking = useCallback(
        async (trip, steps) => {
            if (!trip?.id) return;
            if (startingRef.current) return;

            startingRef.current = true;
            try {
                const nextSteps = Array.isArray(steps) ? steps : [];

                // If currently tracking another trip -> stop first (single session)
                if (tracking.isTracking && activeTrip?.id && String(activeTrip.id) !== String(trip.id)) {
                    await tracking.stopTracking();
                }

                setActiveTrip(trip);
                setActiveSteps(nextSteps);
                setWantsTracking(true);
            } finally {
                startingRef.current = false;
            }
        },
        [tracking.isTracking, tracking.stopTracking, activeTrip?.id]
    );

    const stopTripTracking = useCallback(async () => {
        setWantsTracking(false);
        await tracking.stopTracking();
        setActiveTrip(null);
        setActiveSteps([]);
    }, [tracking.stopTracking]);

    // Expose tracking fields explicitly (no spreading inside memo).
    const value = {
        // session
        activeTrip,
        activeSteps,

        // actions
        startTripTracking,
        stopTripTracking,

        // tracking engine state
        isTracking: tracking.isTracking,
        engine: tracking.engine,
        currentPosition: tracking.currentPosition,
        positionsHistory: tracking.positionsHistory,
        lastUpdate: tracking.lastUpdate,
        error: tracking.error,
        currentStep: tracking.currentStep,
        distanceToCurrentStep: tracking.distanceToCurrentStep,
        geofenceRadius: tracking.geofenceRadius,
        stepStatuses: tracking.stepStatuses,
        currentStepStatus: tracking.currentStepStatus,

        // (optional) if you want the UI to show “Trying to start…” even before isTracking=true
        wantsTracking,
    };

    return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
    const ctx = useContext(TrackingContext);
    if (!ctx) throw new Error("useTracking must be used within TrackingProvider");
    return ctx;
}
