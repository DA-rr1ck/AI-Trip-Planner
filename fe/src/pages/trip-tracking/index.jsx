import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

import { db } from "@/service/firebaseConfig";
import { flattenItineraryToSteps } from "@/utils/itineraryUtils";
import { useTripTracking } from "@/hooks/useTripTracking";
import { useTripNotifications } from "@/hooks/useTripNotifications";
import TripMap from "@/components/tracking/TripMap";
import { notifyLocal } from "@/service/localNotifications";

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

/**
 * Temporal status purely based on schedule times.
 * - upcoming: now < start
 * - in_progress: start <= now <= end
 * - completed: now > end
 *
 * If no scheduledStart -> treat as upcoming (safe default).
 * If no scheduledEnd -> fallback end = start + 2h (matches hook behavior).
 */
function computeTemporalStatus(step, now) {
    const startDate = toDate(step?.scheduledStart);
    if (!startDate) return "upcoming";

    const startMs = startDate.getTime();
    const endDate = toDate(step?.scheduledEnd);
    const endMs = endDate ? endDate.getTime() : startMs + 2 * 60 * 60 * 1000;
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

function formatDistanceFriendly(meters) {
    if (typeof meters !== "number" || !Number.isFinite(meters)) return "";
    const m = Math.max(0, Math.round(meters));

    if (m < 1000) return `${m} m`;
    const km = m / 1000;

    if (km < 10) return `${km.toFixed(1)} km`;
    if (km < 100) return `${Math.round(km)} km`;
    return `${Math.round(km)} km`;
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
    return "";
}

function fallbackStatusMessage(stepStatus) {
    if (!stepStatus) return "Status is updating…";

    const { status, deltaMinutes, phase, performing } = stepStatus;

    if (performing) return "You're doing this activity now — enjoy!";
    if (phase === "in_progress") return "This activity is happening now.";

    if (typeof stepStatus?.message === "string" && stepStatus.message.trim()) {
        return stepStatus.message;
    }

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
                badge: "bg-red-600 text-white",
                pill: "bg-red-50 text-red-800 border-red-200",
                label: "Error",
            };
        case "success":
            return {
                badge: "bg-green-600 text-white",
                pill: "bg-green-50 text-green-800 border-green-200",
                label: "Good",
            };
        case "warning":
            return {
                badge: "bg-amber-600 text-white",
                pill: "bg-amber-50 text-amber-800 border-amber-200",
                label: "Heads up",
            };
        case "info":
        default:
            return {
                badge: "bg-blue-600 text-white",
                pill: "bg-blue-50 text-blue-800 border-blue-200",
                label: "Info",
            };
    }
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function TripTracking() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState(null);

    // Day/period selection for itinerary (inside bottom-sheet)
    const [selectedDayKey, setSelectedDayKey] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);

    // Re-render periodically so "Up next" -> "Current activity" flips even if GPS isn't updating
    const [uiNowTick, setUiNowTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setUiNowTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    // Mobile-only guard
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isMobile = window.innerWidth < 768;
        if (!isMobile) navigate("/my-trips", { replace: true });
    }, [navigate]);

    // Lock page scroll => map + sheet feels native
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Load trip
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

    const startClickNotifRef = useRef(false);

    const hasGpsFix =
        !!currentPosition &&
        typeof currentPosition.latitude === "number" &&
        typeof currentPosition.longitude === "number";

    const trackingStartAtRef = useRef(0);
    const lastGpsUpdateAtRef = useRef(0);

    useEffect(() => {
        if (
            currentPosition &&
            typeof currentPosition.latitude === "number" &&
            typeof currentPosition.longitude === "number"
        ) {
            lastGpsUpdateAtRef.current = Date.now();
        }
    }, [currentPosition?.latitude, currentPosition?.longitude]);

    const hasGpsFixSinceStart =
        hasGpsFix && lastGpsUpdateAtRef.current >= trackingStartAtRef.current;

    // --- Local push notifications for tracking status changes ---
    useTripNotifications({
        enabled: isTracking,
        tripId: trip?.id || tripId,
        steps,
        stepStatuses,
    });

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

    // Auto period from currentStep OR time-of-day
    const autoPeriod = useMemo(() => {
        const now = new Date();
        return (currentStep && currentStep.period) || inferPeriodFromTime(now);
    }, [currentStep]);

    useEffect(() => {
        if (!selectedPeriod) setSelectedPeriod(autoPeriod);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPeriod]);

    // Build day keys from itinerary
    const dayKeys = useMemo(() => {
        const set = new Set();
        steps.forEach((s) => {
            if (s?.dateKey) set.add(s.dateKey);
        });
        return Array.from(set).sort();
    }, [steps]);

    // Default selected day: today if exists, otherwise first day
    useEffect(() => {
        if (selectedDayKey) return;
        const todayKey = format(new Date(), "yyyy-MM-dd");
        if (dayKeys.includes(todayKey)) setSelectedDayKey(todayKey);
        else if (dayKeys.length > 0) setSelectedDayKey(dayKeys[0]);
    }, [dayKeys, selectedDayKey]);

    // --- Footer summary logic (Up next vs Current activity) ---

    const sortedStepsByTime = useMemo(() => {
        return [...steps].sort((a, b) => {
            const aMs = toDate(a?.scheduledStart)?.getTime() ?? Number.POSITIVE_INFINITY;
            const bMs = toDate(b?.scheduledStart)?.getTime() ?? Number.POSITIVE_INFINITY;
            return aMs - bMs;
        });
    }, [steps]);

    // A time-only next step fallback (does NOT require coords)
    const timeBasedNextStep = useMemo(() => {
        if (!steps || steps.length === 0) return null;

        const now = new Date();
        const nowMs = now.getTime();

        // pick first step that hasn't ended yet (or missing end -> use +2h fallback)
        const next = sortedStepsByTime.find((s) => {
            const start = toDate(s?.scheduledStart);
            if (!start) return true; // no time => still show as next
            const startMs = start.getTime();
            const end = toDate(s?.scheduledEnd);
            const endMs = end ? end.getTime() : startMs + 2 * 60 * 60 * 1000;
            return endMs >= nowMs;
        });

        return next || null;
    }, [steps, sortedStepsByTime, uiNowTick]);

    const shortStatusMessage =
        (statusMessage && statusMessage.trim()) ||
        fallbackStatusMessage(currentStepStatus) ||
        "Status is updating…";

    const isIdleGapPeriod = /^No activity at the moment/i.test(shortStatusMessage);

    // After user taps Start tracking, send a push notification
    useEffect(() => {
        if (!startClickNotifRef.current) return;

        if (isStartingTracking) return;
        if (!isTracking) return;

        const tId = trip?.id || tripId;
        if (!tId) return;

        const msg =
            (typeof shortStatusMessage === "string" && shortStatusMessage.trim())
                ? shortStatusMessage.trim()
                : "";

        const isPlaceholder =
            !msg ||
            /calculating\s+status/i.test(msg) ||
            /status\s+is\s+updating/i.test(msg);

        if (isPlaceholder) return;

        const timer = setTimeout(() => {
            notifyLocal({
                title: "Trip tracking",
                body: msg,
                extra: { tripId: tId, scenario: "start_tracking" },
            });
            startClickNotifRef.current = false;
        }, 600);

        return () => clearTimeout(timer);
    }, [isStartingTracking, isTracking, shortStatusMessage, trip?.id, tripId]);

    const footerSummary = useMemo(() => {
        const now = new Date();

        if (!steps || steps.length === 0) {
            return {
                title: "Trip status",
                subtitle: shortStatusMessage,
                meta: "",
                step: null,
                temporal: "none",
            };
        }

        // Prefer hook's selection; fallback to time-based selection
        const step = currentStep || timeBasedNextStep;
        if (!step) {
            return {
                title: "Trip status",
                subtitle: "No upcoming activity was found.",
                meta: shortStatusMessage,
                step: null,
                temporal: "none",
            };
        }

        let temporal = computeTemporalStatus(step, now);

        // If everything completed, show trip completed
        if (temporal === "completed") {
            const anyNotCompleted = sortedStepsByTime.some((s) => computeTemporalStatus(s, now) !== "completed");
            if (!anyNotCompleted) {
                return {
                    title: "Trip status",
                    subtitle: "All activities completed 🎉",
                    meta: shortStatusMessage,
                    step: null,
                    temporal: "completed",
                };
            }

            // Otherwise, find next not-completed
            const next = sortedStepsByTime.find((s) => computeTemporalStatus(s, now) !== "completed");
            if (next) {
                const nextTemporal = computeTemporalStatus(next, now);
                const title = nextTemporal === "in_progress" ? "Current activity" : "Up next";
                const name = next?.placeName || next?.activityType || "Activity";
                const timeRange = formatTimeRange(next);
                const subtitle = timeRange ? `${name} · ${timeRange}` : name;
                const meta = "";

                return { title, subtitle, meta, step: next, temporal: nextTemporal };
            }

            return {
                title: "Trip status",
                subtitle: "All activities completed 🎉",
                meta: shortStatusMessage,
                step: null,
                temporal: "completed",
            };
        }

        const title = temporal === "in_progress" ? "Current activity" : "Up next";
        const name = step?.placeName || step?.activityType || "Activity";

        const timeRange = formatTimeRange(step);
        const subtitle = timeRange ? `${name} · ${timeRange}` : name;
        const meta = "";

        return { title, subtitle, meta, step, temporal };
    }, [steps, currentStep, timeBasedNextStep, sortedStepsByTime, shortStatusMessage, uiNowTick]);

    // Bottom Sheet (Footer)
    const SHEET_PEEK = 145; // px visible when collapsed
    const [sheetHeight, setSheetHeight] = useState(0);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetY, setSheetY] = useState(0);
    const [isDraggingSheet, setIsDraggingSheet] = useState(false);

    const dragStartClientY = useRef(0);
    const dragStartSheetY = useRef(0);

    useEffect(() => {
        function updateSheetHeight() {
            const h = window.innerHeight || 0;
            const next = Math.max(260, Math.round(h * 0.78));
            setSheetHeight(next);
        }
        updateSheetHeight();
        window.addEventListener("resize", updateSheetHeight);
        return () => window.removeEventListener("resize", updateSheetHeight);
    }, []);

    const collapsedY = useMemo(() => {
        if (!sheetHeight) return 0;
        return Math.max(sheetHeight - SHEET_PEEK, 0);
    }, [sheetHeight]);

    // Snap sheet when open/close changes (but don’t fight while dragging)
    useEffect(() => {
        if (!sheetHeight) return;
        if (isDraggingSheet) return;
        setSheetY(sheetOpen ? 0 : collapsedY);
    }, [sheetOpen, collapsedY, isDraggingSheet, sheetHeight]);

    // Init position once we know height
    useEffect(() => {
        if (!sheetHeight) return;
        setSheetY(collapsedY);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheetHeight]);

    const onSheetPointerDown = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        setIsDraggingSheet(true);
        dragStartClientY.current = e.clientY;
        dragStartSheetY.current = sheetY;

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const onSheetPointerMove = (e) => {
        if (!isDraggingSheet) return;
        e.preventDefault();

        const dy = e.clientY - dragStartClientY.current;
        const next = clamp(dragStartSheetY.current + dy, 0, collapsedY);
        setSheetY(next);
    };

    const onSheetPointerUp = () => {
        if (!isDraggingSheet) return;
        setIsDraggingSheet(false);

        const shouldOpen = sheetY < collapsedY * 0.5;
        setSheetOpen(shouldOpen);
    };

    const statusUi = getStatusUi(statusLevel);

    const trackingTitle = isStartingTracking
        ? "Starting…"
        : isTracking
            ? "Tracking ON"
            : "Tracking OFF";

    const lastUpdateText = (() => {
        if (lastUpdate) {
            const label = isTracking || isStartingTracking ? "Updated" : "Last known";
            return `${label}: ${lastUpdate.toLocaleTimeString()}`;
        }
        if (isTracking || isStartingTracking) return "Waiting for GPS…";
        return "No location yet";
    })();

    const primaryBtnLabel = isStartingTracking ? "Starting…" : isTracking ? "Stop" : "Start tracking";
    const primaryBtnDisabled = isStartingTracking;

    const primaryBtnClasses =
        "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition " +
        (primaryBtnDisabled
            ? "bg-gray-200 text-gray-600 cursor-not-allowed"
            : isTracking
                ? "bg-red-600 text-white active:scale-[0.99]"
                : "bg-black text-white active:scale-[0.99]");

    // Itinerary for selected day/period (expanded sheet)
    const selectedDaySteps = useMemo(() => {
        if (!selectedDayKey) return [];
        return steps.filter((s) => s.dateKey === selectedDayKey);
    }, [steps, selectedDayKey]);

    const period = selectedPeriod || autoPeriod;
    const periodSteps = useMemo(() => {
        return selectedDaySteps.filter((s) => s.period === period);
    }, [selectedDaySteps, period]);

    const dayLabel = useMemo(() => {
        if (!selectedDayKey) return "";
        try {
            const d = new Date(selectedDayKey);
            return format(d, "EEEE, MMM d");
        } catch {
            return selectedDayKey;
        }
    }, [selectedDayKey]);

    // Loading/Error full-screen
    if (loading) {
        return (
            <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
                <div className="rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur">
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <p className="text-sm font-medium">Loading trip…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[100dvh] w-full bg-black flex items-center justify-center px-4">
                <div className="w-full max-w-sm rounded-2xl bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">Trip Tracking</p>
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                    <button
                        type="button"
                        onClick={() => navigate("/my-trips")}
                        className="mt-4 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                        Back to My Trips
                    </button>
                </div>
            </div>
        );
    }

    // Destination step for the map (coords-based): use footerSummary.step as the best "current/next" choice
    const destinationForMap = footerSummary?.step || currentStep || timeBasedNextStep || null;

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
            {/* FULLSCREEN MAP */}
            <div className="absolute inset-0 z-0">
                <TripMap
                    isTracking={isTracking}
                    currentPosition={currentPosition}
                    currentStep={currentStep}
                    destinationStep={destinationForMap}
                    positionsHistory={positionsHistory}
                    geofenceRadius={geofenceRadius}
                />
            </div>

            {/* TOP HEADER (fixed) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
                <div className="pointer-events-auto mx-3 mt-3 rounded-2xl bg-black/45 px-3 py-3 text-white shadow-lg backdrop-blur-lg">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/my-trips")}
                            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition duration-150 active:bg-black"
                        >
                            ← My trips
                        </button>

                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${statusUi.pill}`}>
                            {trackingTitle}
                        </span>
                    </div>

                    <div className="mt-2">
                        <p className="text-sm font-semibold truncate">
                            {(!isTracking && !isStartingTracking)
                                ? (tripLocation || "Your trip")
                                : (!hasGpsFixSinceStart
                                    ? (tripLocation || "Your trip")
                                    : (isIdleGapPeriod
                                        ? (tripLocation || "Your trip")
                                        : (footerSummary?.step?.placeName || tripLocation || "Your trip")))}
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/80 line-clamp-1">
                            {shortStatusMessage}
                        </p>
                        {dateRange && (
                            <p className="mt-0.5 text-[11px] text-white/60">
                                📅 {dateRange}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM SHEET FOOTER (fixed + draggable) */}
            {sheetHeight > 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
                    <div
                        className={
                            "pointer-events-auto mx-0 rounded-t-3xl border border-gray-200 bg-white shadow-2xl " +
                            (isDraggingSheet ? "" : "transition-transform duration-300")
                        }
                        style={{
                            height: sheetHeight,
                            transform: `translateY(${sheetY}px)`,
                        }}
                    >
                        <div className="flex h-full flex-col">
                            {/* Drag Handle */}
                            <div
                                className="px-4 pt-3 pb-2"
                                style={{ touchAction: "none" }}
                                onPointerDown={onSheetPointerDown}
                                onPointerMove={onSheetPointerMove}
                                onPointerUp={onSheetPointerUp}
                                onPointerCancel={onSheetPointerUp}
                                onDoubleClick={() => setSheetOpen((v) => !v)}
                            >
                                <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
                            </div>

                            {/* Footer summary row (always visible) */}
                            <div className="px-4 pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {footerSummary.title}
                                        </p>

                                        <p className="mt-0.5 text-[12px] text-gray-600 line-clamp-1">
                                            {footerSummary.subtitle}
                                        </p>

                                        {footerSummary.meta ? (
                                            <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-1">
                                                {footerSummary.meta}
                                            </p>
                                        ) : null}

                                        <p className="mt-0.5 text-[11px] text-gray-500">
                                            {lastUpdateText}
                                            {isTracking && currentStep ? (
                                                <span>
                                                    {typeof distanceToCurrentStep === "number" && !isIdleGapPeriod ? (
                                                        <> · {formatDistanceFriendly(distanceToCurrentStep)}</>
                                                    ) : null}
                                                </span>
                                            ) : null}
                                        </p>

                                        {/* show permission/GPS error even when collapsed */}
                                        {trackingError && !isStartingTracking && (
                                            <p className="mt-1 text-[11px] text-red-600 line-clamp-2">
                                                {trackingError}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={primaryBtnDisabled}
                                        onClick={() => {
                                            if (primaryBtnDisabled) return;
                                            if (isTracking) {
                                                stopTracking();
                                                startClickNotifRef.current = false;
                                                return;
                                            }

                                            trackingStartAtRef.current = Date.now();
                                            startClickNotifRef.current = true;
                                            startTracking();
                                        }}
                                        className={primaryBtnClasses}
                                    >
                                        {primaryBtnLabel}
                                    </button>
                                </div>

                                {/* Tap area to expand */}
                                <button
                                    type="button"
                                    onClick={() => setSheetOpen(true)}
                                    className="mt-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-semibold text-gray-700 transition duration-150 active:bg-gray-400"
                                >
                                    View itinerary
                                </button>
                            </div>

                            {/* Expanded content */}
                            <div className="border-t border-gray-100" />

                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {/* Day selector */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Itinerary</p>
                                        <p className="mt-0.5 text-[12px] text-gray-500">{dayLabel}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSheetOpen(false)}
                                        className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-semibold text-gray-700 transition duration-150 active:bg-gray-400"
                                    >
                                        Collapse
                                    </button>
                                </div>

                                {dayKeys.length > 0 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                        {dayKeys.map((k) => {
                                            const active = k === selectedDayKey;
                                            let label = k;
                                            try {
                                                label = format(new Date(k), "MMM d");
                                            } catch {
                                                // ignore
                                            }
                                            return (
                                                <button
                                                    key={k}
                                                    type="button"
                                                    onClick={() => setSelectedDayKey(k)}
                                                    className={
                                                        "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold border " +
                                                        (active
                                                            ? "bg-black text-white border-black"
                                                            : "bg-white text-gray-700 border-gray-200")
                                                    }
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

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
                                                    "rounded-xl px-2 py-2 text-[11px] font-semibold " +
                                                    (active ? "bg-black text-white" : "bg-gray-100 text-gray-700")
                                                }
                                            >
                                                {PERIOD_LABELS[p]}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Steps list */}
                                {selectedDaySteps.length === 0 && (
                                    <p className="mt-4 text-xs text-gray-500">
                                        No activities scheduled for this day.
                                    </p>
                                )}

                                {selectedDaySteps.length > 0 && periodSteps.length === 0 && (
                                    <p className="mt-4 text-xs text-gray-500">
                                        No activities in this period. Try another time of day.
                                    </p>
                                )}

                                {periodSteps.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {periodSteps.map((step) => {
                                            const now = new Date();
                                            const isCurrent = currentStep && step.stepId === currentStep.stepId;
                                            const temporalStatus = computeTemporalStatus(step, now);

                                            const punctual = stepStatuses?.[step.stepId];
                                            const punctualLabel = buildPunctualLabel(punctual?.status, punctual?.deltaMinutes);

                                            const timeRange = formatTimeRange(step);

                                            let badgeText = "";
                                            if (isCurrent) {
                                                if (temporalStatus === "in_progress") badgeText = currentStepStatus?.performing ? "In progress" : "Now";
                                                else if (temporalStatus === "upcoming") badgeText = "Up next";
                                                else badgeText = "Done";
                                            } else if (temporalStatus === "completed") badgeText = "Done";
                                            else if (temporalStatus === "upcoming") badgeText = "Upcoming";

                                            return (
                                                <div
                                                    key={step.stepId}
                                                    className={
                                                        "rounded-2xl border p-3 transition " +
                                                        (isCurrent
                                                            ? "border-blue-300 bg-blue-50"
                                                            : temporalStatus === "completed"
                                                                ? "border-gray-200 bg-gray-50 opacity-80"
                                                                : "border-gray-200 bg-white")
                                                    }
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {step.placeName}
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] text-gray-500">
                                                                {timeRange ? `${timeRange} · ` : ""}
                                                                {step.activityType}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1">
                                                            {badgeText && (
                                                                <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                                    {badgeText}
                                                                </span>
                                                            )}
                                                            {punctualLabel && (
                                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
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

                                                    {/* Current activity info */}
                                                    {isTracking && isCurrent && currentStepStatus && !isIdleGapPeriod && (
                                                        <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2">
                                                            {typeof distanceToCurrentStep === "number" && (
                                                                <p className="text-[11px] text-blue-900">
                                                                    <span className="font-semibold">Distance:</span> {formatDistanceFriendly(distanceToCurrentStep)}
                                                                </p>
                                                            )}
                                                            <p className="mt-1 text-[12px] text-blue-900">
                                                                {currentStepStatus?.message?.trim?.() || fallbackStatusMessage(currentStepStatus)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint overlay */}
            {!currentPosition && !currentStep && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="rounded-2xl bg-black/40 px-4 py-3 text-white/90 backdrop-blur">
                        <p className="text-sm font-semibold">Preparing map…</p>
                        <p className="mt-0.5 text-[12px] text-white/70">Start tracking to get your live location.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TripTracking;
