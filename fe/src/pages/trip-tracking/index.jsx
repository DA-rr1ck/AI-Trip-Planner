import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

import { db } from "@/service/firebaseConfig";
import { flattenItineraryToSteps } from "@/utils/itineraryUtils";
import { useTripTracking } from "@/hooks/useTripTracking";
import TripMap from "@/components/tracking/TripMap";

const PERIODS = ["Morning", "Lunch", "Afternoon", "Evening"];

const PERIOD_LABELS = {
    Morning: "Morning",
    Lunch: "Lunch",
    Afternoon: "Afternoon",
    Evening: "Evening",
};

function inferPeriodFromTime(date) {
    const hour = date.getHours();
    if (hour < 12) return "Morning";
    if (hour < 14) return "Lunch";
    if (hour < 18) return "Afternoon";
    return "Evening";
}

function toDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function computeTemporalStatus(step, now) {
    const startDate = toDate(step?.scheduledStart);
    if (!startDate) return "upcoming";

    const startMs = startDate.getTime();
    const endDate = toDate(step?.scheduledEnd);
    const endMs = endDate ? endDate.getTime() : startMs + 2 * 60 * 60 * 1000; // fallback +2h
    const nowMs = now.getTime();

    if (nowMs < startMs) return "upcoming";
    if (nowMs > endMs) return "completed";
    return "in_progress";
}

function formatTimeRange(step) {
    const start = toDate(step?.scheduledStart);
    const end = toDate(step?.scheduledEnd);

    if (!start) return "";
    if (!end) return format(start, "HH:mm");
    return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

function formatMinutesFriendly(minutes) {
    const abs = Math.abs(Math.round(minutes));
    if (!Number.isFinite(abs)) return "";
    if (abs < 60) return `${abs} min`;
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildPunctualLabel(punctualStatus, punctualDelta) {
    if (!punctualStatus) return "";

    if (punctualStatus === "early") {
        if (punctualDelta != null) return `Early · ${formatMinutesFriendly(punctualDelta)}`;
        return "Early";
    }

    if (punctualStatus === "on_time") return "On time";

    if (punctualStatus === "late") {
        if (punctualDelta != null) return `Late · ${formatMinutesFriendly(punctualDelta)}`;
        return "Late";
    }

    // For upcoming / en_route etc, we don’t show punctual label (keeps UI clean)
    return "";
}

function fallbackStatusMessage(stepStatus) {
    if (!stepStatus) return "Status is updating…";

    const { status, deltaMinutes, phase, performing } = stepStatus;

    // “Performing” during the scheduled window
    if (performing) return "You're doing this activity now — enjoy!";
    if (phase === "in_progress") return "This activity is happening now.";

    if (typeof stepStatus?.message === "string" && stepStatus.message.trim()) {
        return stepStatus.message;
    }

    // Fallbacks if message isn’t provided by the hook yet
    if (status === "upcoming") return "Your next activity is coming up soon.";
    if (status === "en_route") return "You're on the way to the activity.";
    if (status === "early") return "Nice — you arrived early.";
    if (status === "on_time") return "Great — you arrived on time.";
    if (status === "late") {
        if (deltaMinutes != null) return `You're running late — about ${Math.abs(Math.round(deltaMinutes))} min.`;
        return "You're running late. Head there when you can.";
    }

    return "Status is updating…";
}

function getStatusUi(level) {
    switch (level) {
        case "error":
            return {
                container: "border-red-200 bg-red-50",
                badge: "bg-red-600 text-white",
                title: "text-red-900",
                message: "text-red-900",
                subtle: "text-red-700",
                label: "Error",
            };
        case "success":
            return {
                container: "border-green-200 bg-green-50",
                badge: "bg-green-600 text-white",
                title: "text-green-900",
                message: "text-green-900",
                subtle: "text-green-700",
                label: "Good",
            };
        case "warning":
            return {
                container: "border-amber-200 bg-amber-50",
                badge: "bg-amber-600 text-white",
                title: "text-amber-900",
                message: "text-amber-900",
                subtle: "text-amber-700",
                label: "Heads up",
            };
        case "info":
        default:
            return {
                container: "border-blue-200 bg-blue-50",
                badge: "bg-blue-600 text-white",
                title: "text-blue-900",
                message: "text-blue-900",
                subtle: "text-blue-700",
                label: "Info",
            };
    }
}

/**
 * Used inside the activity list when isCurrent === true
 */
function renderCurrentActivityCard({
    step,
    currentStepStatus,
    distanceToCurrentStep,
}) {
    const message =
        currentStepStatus?.message?.trim?.() ||
        fallbackStatusMessage(currentStepStatus);

    return (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
            {typeof distanceToCurrentStep === "number" && (
                <p className="text-[11px] text-blue-900">
                    <span className="font-semibold">Distance:</span> {distanceToCurrentStep} m
                </p>
            )}
            <p className="mt-1 text-[12px] text-blue-900">{message}</p>
        </div>
    );
}

function TripTracking() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState(null);

    // Allow user to switch time-of-day manually (still defaults to auto)
    const [selectedPeriod, setSelectedPeriod] = useState(null);

    // Mobile-only guard
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isMobile = window.innerWidth < 768;
        if (!isMobile) navigate("/my-trips", { replace: true });
    }, [navigate]);

    // Load trip from Firestore
    useEffect(() => {
        if (!tripId) return;

        (async () => {
            setLoading(true);
            setError(null);

            try {
                const ref = doc(db, "AITrips", tripId);
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    setError("Trip not found");
                    setTrip(null);
                } else {
                    setTrip({ id: snap.id, ...snap.data() });
                }
            } catch (e) {
                console.error("[TripTracking] load error:", e);
                setError("Failed to load trip");
                setTrip(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [tripId]);

    const steps = useMemo(() => {
        if (!trip) return [];
        return flattenItineraryToSteps(trip);
    }, [trip]);

    const {
        isTracking,
        isStartingTracking,
        statusMessage,
        statusLevel,

        currentPosition,
        positionsHistory,
        lastUpdate,
        error: trackingError,

        currentStep,
        distanceToCurrentStep,
        geofenceRadius,
        stepStatuses,
        currentStepStatus,

        startTracking,
        stopTracking,
    } = useTripTracking(trip, steps);

    const tripLocation = trip?.userSelection?.location || trip?.tripData?.Location;
    const startDateStr = trip?.userSelection?.startDate;
    const endDateStr = trip?.userSelection?.endDate;

    const dateRange = useMemo(() => {
        if (!startDateStr || !endDateStr) return null;
        try {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
        } catch {
            return null;
        }
    }, [startDateStr, endDateStr]);

    // Auto period = current step’s period OR inferred time-of-day
    const autoPeriod = useMemo(() => {
        const now = new Date();
        return (currentStep && currentStep.period) || inferPeriodFromTime(now);
    }, [currentStep]);

    // Keep selectedPeriod aligned with autoPeriod (simple + predictable)
    useEffect(() => {
        if (!selectedPeriod) setSelectedPeriod(autoPeriod);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPeriod]);

    if (loading) {
        return (
            <div className="px-4 pt-6 pb-20">
                <h1 className="text-2xl font-semibold mb-4">Start trip</h1>
                <div className="mt-10 flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 pt-6 pb-20">
                <h1 className="text-2xl font-semibold mb-2">Start trip</h1>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate("/my-trips")}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                >
                    Back to My Trips
                </button>
            </div>
        );
    }

    const statusUi = getStatusUi(statusLevel);
    const trackingTitle = isStartingTracking
        ? "Starting tracking…"
        : isTracking
            ? "Tracking is active"
            : "Tracking is off";

    const lastUpdateText = (() => {
        if (lastUpdate) {
            const label = isTracking || isStartingTracking ? "Last update" : "Last known update";
            return `${label}: ${lastUpdate.toLocaleTimeString()}`;
        }
        if (isTracking || isStartingTracking) return "Waiting for first GPS fix…";
        return "No location recorded yet";
    })();

    const primaryBtnLabel = isStartingTracking
        ? "Starting…"
        : isTracking
            ? "Stop tracking"
            : "Start tracking";

    const primaryBtnDisabled = isStartingTracking;

    const primaryBtnClasses =
        "rounded-lg px-4 py-2 text-sm font-medium shadow-sm " +
        (primaryBtnDisabled
            ? "bg-gray-200 text-gray-600 cursor-not-allowed"
            : isTracking
                ? "bg-red-600 text-white"
                : "bg-black text-white");

    const shouldShowStatusCard = isTracking || isStartingTracking;

    return (
        <div className="px-4 pt-6 pb-20">
            <header className="mb-4">
                <h1 className="text-2xl font-semibold">Start trip</h1>
                {tripLocation && <p className="text-sm text-gray-600 mt-1">{tripLocation}</p>}
                {dateRange && <p className="text-xs text-gray-500 mt-0.5">📅 {dateRange}</p>}
            </header>

            {/* Tracking control card */}
            <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium">{trackingTitle}</p>
                        <p className="mt-1 text-xs text-gray-500">{lastUpdateText}</p>
                    </div>

                    <button
                        type="button"
                        disabled={primaryBtnDisabled}
                        onClick={() => {
                            if (primaryBtnDisabled) return;
                            if (isTracking) stopTracking();
                            else startTracking();
                        }}
                        className={primaryBtnClasses}
                    >
                        {primaryBtnLabel}
                    </button>
                </div>

                {/* When NOT actively tracking, errors still need to be visible (e.g., native-only / permission denied) */}
                {trackingError && !shouldShowStatusCard && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-700">{trackingError}</p>
                    </div>
                )}

                {currentPosition && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        <p>
                            <span className="font-semibold">Current position:</span>{" "}
                            {currentPosition.latitude.toFixed(5)}, {currentPosition.longitude.toFixed(5)}
                        </p>
                        {typeof currentPosition.accuracy === "number" && (
                            <p>Accuracy: ~{Math.round(currentPosition.accuracy)} m</p>
                        )}
                    </div>
                )}
            </section>

            {/* Status (always shown while tracking is on, even if currentStep is null) */}
            {shouldShowStatusCard && (
                <section className={`mb-4 rounded-xl border p-4 shadow-sm ${statusUi.container}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className={`text-xs font-semibold ${statusUi.title}`}>Status</p>

                            {currentStep ? (
                                <p className={`mt-1 text-[11px] ${statusUi.subtle} truncate`}>
                                    {currentStep.placeName || "Current activity"}
                                </p>
                            ) : (
                                <p className={`mt-1 text-[11px] ${statusUi.subtle}`}>
                                    No current activity
                                </p>
                            )}
                        </div>

                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusUi.badge}`}>
                            {statusUi.label}
                        </span>
                    </div>

                    {/* If trackingError exists while tracking, the hook already prioritizes it into statusMessage (no contradiction). */}
                    <p className={`mt-2 text-sm ${statusUi.message}`}>{statusMessage}</p>

                    {isTracking && currentStep && typeof distanceToCurrentStep === "number" && (
                        <p className={`mt-1 text-[11px] ${statusUi.subtle}`}>
                            Distance to activity: {distanceToCurrentStep} m · Geofence: {geofenceRadius} m
                        </p>
                    )}

                    {!isTracking && isStartingTracking && (
                        <p className={`mt-1 text-[11px] ${statusUi.subtle}`}>
                            Tip: If it takes too long, try moving outdoors or enabling Location services.
                        </p>
                    )}
                </section>
            )}

            {/* Map */}
            {(currentStep || currentPosition) && (
                <TripMap
                    currentPosition={currentPosition}
                    currentStep={currentStep}
                    positionsHistory={positionsHistory}
                    geofenceRadius={geofenceRadius}
                />
            )}

            {/* Today's activities */}
            <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
                {(() => {
                    const now = new Date();
                    const todayKey = format(now, "yyyy-MM-dd");

                    const todaySteps = steps.filter((s) => s.dateKey === todayKey);
                    const period = selectedPeriod || autoPeriod;

                    const periodSteps = todaySteps.filter((s) => s.period === period);

                    return (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">Today</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{format(now, "EEEE, MMM d")}</p>
                                </div>

                                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-700">
                                    {PERIOD_LABELS[period] || period}
                                </span>
                            </div>

                            {/* Period selector */}
                            <div className="mt-3 grid grid-cols-4 gap-2">
                                {PERIODS.map((p) => {
                                    const active = p === period;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setSelectedPeriod(p)}
                                            className={
                                                "rounded-lg px-2 py-2 text-[11px] font-medium " +
                                                (active ? "bg-black text-white" : "bg-gray-100 text-gray-700")
                                            }
                                        >
                                            {PERIOD_LABELS[p]}
                                        </button>
                                    );
                                })}
                            </div>

                            {todaySteps.length === 0 && (
                                <p className="mt-3 text-xs text-gray-500">
                                    This trip doesn&apos;t have any activities scheduled for today.
                                </p>
                            )}

                            {todaySteps.length > 0 && periodSteps.length === 0 && (
                                <p className="mt-3 text-xs text-gray-500">
                                    No activities at this time of day. Check other periods.
                                </p>
                            )}

                            {periodSteps.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {periodSteps.map((step) => {
                                        const isCurrent = currentStep && step.stepId === currentStep.stepId;
                                        const temporalStatus = computeTemporalStatus(step, now);

                                        const punctual = stepStatuses?.[step.stepId];
                                        const punctualStatus = punctual?.status; // early / on_time / late
                                        const punctualDelta = punctual?.deltaMinutes;

                                        const timeRange = formatTimeRange(step);

                                        // Badge priority:
                                        let badgeText = "";
                                        if (isCurrent) {
                                            if (temporalStatus === "in_progress") {
                                                // If performing, show combined badge with punctuality
                                                if (currentStepStatus?.performing) {
                                                    badgeText = "In progress";
                                                } else {
                                                    badgeText = "Now";
                                                }
                                            } else if (temporalStatus === "upcoming") {
                                                // currentStep can be the NEXT step (not started yet)
                                                badgeText = "Up next";
                                            } else if (temporalStatus === "completed") {
                                                badgeText = "Done";
                                            }
                                        } else if (temporalStatus === "completed") {
                                            badgeText = "Done";
                                        } else if (temporalStatus === "upcoming") {
                                            badgeText = "Upcoming";
                                        }

                                        const punctualLabel = buildPunctualLabel(punctualStatus, punctualDelta);

                                        const baseClasses =
                                            "rounded-xl border p-3 transition";
                                        const variantClasses = isCurrent
                                            ? "border-blue-300 bg-blue-50 shadow-sm"
                                            : temporalStatus === "completed"
                                                ? "border-gray-200 bg-gray-50 opacity-70"
                                                : "border-gray-200 bg-white";

                                        return (
                                            <div key={step.stepId} className={`${baseClasses} ${variantClasses}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{step.placeName}</p>
                                                        <p className="mt-0.5 text-[11px] text-gray-500">
                                                            {timeRange ? `${timeRange} · ` : ""}
                                                            {step.activityType}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        {badgeText && (
                                                            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">
                                                                {badgeText}
                                                            </span>
                                                        )}
                                                        {punctualLabel && (
                                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                                                {punctualLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {step.placeDetails && (
                                                    <p className="mt-2 text-[11px] text-gray-600 line-clamp-2">
                                                        {step.placeDetails}
                                                    </p>
                                                )}

                                                {/* Current activity card extracted */}
                                                {isCurrent && currentStepStatus && (
                                                    renderCurrentActivityCard({
                                                        step,
                                                        currentStepStatus,
                                                        distanceToCurrentStep,
                                                    })
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    );
                })()}
            </section>
        </div>
    );
}

export default TripTracking;
