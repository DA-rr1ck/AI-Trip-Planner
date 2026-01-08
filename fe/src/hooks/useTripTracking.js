import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { findCurrentOrNextStep } from "@/utils/itineraryUtils";
import { saveTripLocation, saveStepStatus } from "@/service/trackingFirestore";
import { clearTripNotificationFlags } from "@/service/localNotifications";

const DEFAULT_GEOFENCE_RADIUS_METERS = 150;

// Thresholds (+5 mins bigger)
// Pre-arrival (outside geofence, not arrived yet):
//   upcoming : delta < -10
//   en_route : -10 <= delta <= +15
//   late     : delta > +15  (still not arrived)
//
// Arrival (first time entering geofence):
//   early    : delta <= -15
//   on_time  : -15 < delta <= +10      // so -8 becomes on_time
//   late     : delta > +10
const UPCOMING_WINDOW_MINUTES = 10;
const PRE_ARRIVAL_LATE_THRESHOLD_MINUTES = 15;
const EARLY_THRESHOLD_MINUTES = 15;
const ARRIVAL_ON_TIME_LATE_WINDOW_MINUTES = 10;

// Throttling constants for saving to Firestore
const MIN_DISTANCE_TO_SAVE_METERS = 50;
const MIN_INTERVAL_TO_SAVE_MS = 60_000;

const COMPLETION_FLASH_MS = 5000;

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toMs(value) {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
}

function getStepEndMs(step) {
    const startMs = toMs(step?.scheduledStart);
    const endMs = toMs(step?.scheduledEnd);
    if (endMs != null) return endMs;
    if (startMs == null) return null;
    return startMs + 2 * 60 * 60 * 1000; // fallback +2h
}

function formatDurationHMS(totalSeconds) {
  if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds)) return "";

  const s = Math.max(0, Math.round(Math.abs(totalSeconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  // >= 1h: show hours + minutes, hide seconds
  // < 1h: show minutes + seconds, hide hours
  // if < 1m, just show seconds
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  if (m > 0) {
    return `${m}m ${String(sec).padStart(2, "0")}s`;
  }

  return `${sec}s`;
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

function buildStatusMessage({
    phase,
    inside,
    status,
    deltaSeconds,
    timeToStartSeconds,
    distanceMeters,
    showIdleGapMessage = false,
}) {
    const distText = typeof distanceMeters === "number" ? formatDistanceFriendly(distanceMeters) : "";

    if (phase === "completed") return "This activity window has ended. You can move on to the next one.";

    if (phase === "in_progress") {
        if (inside) {
            // UX: don't show "late/early" in the main message while user is already there.
            return "In progress — enjoy your time!";
        }
        return distText
            ? `This activity is happening now. You're about ${distText} away — head there when you can.`
            : "This activity is happening now. Head there when you can.";
    }

    // before_start
    // Long free gap between activities: keep it calm until 15 mins before the next activity.
    if (showIdleGapMessage && !inside) {
        return "No activity at the moment — feel free to do whatever you like.";
    }

    const timeToStart =
        typeof timeToStartSeconds === "number" && timeToStartSeconds > 0
            ? formatDurationHMS(timeToStartSeconds)
            : "";

    const pastStart =
        typeof deltaSeconds === "number" && deltaSeconds > 0
            ? formatDurationHMS(deltaSeconds)
            : "";

    if (inside) {
        if (timeToStart) return `You're already here. Starts in ${timeToStart}.`;
        return "You're already here. Hang back and wait for the activity to start.";
    }

    if (status === "upcoming") {
        if (timeToStart) return `Your next activity starts in ${timeToStart}. Better get going!`;
        return "Your next activity is coming up soon. Get ready to head out.";
    }

    if (status === "en_route") {
        if (typeof deltaSeconds === "number") {
            if (deltaSeconds <= 0 && timeToStart) return `You're on the way. Starts in ${timeToStart}.`;
            if (pastStart) return `You're on the way. About ${pastStart} past the scheduled start.`;
        }
        return "You're on the way to the activity.";
    }

    if (status === "early") {
        if (typeof deltaSeconds === "number" && deltaSeconds < 0) {
            return `Nice — you arrived about ${formatDurationHMS(-deltaSeconds)} early.`;
        }
        return "Nice — you arrived early.";
    }

    if (status === "on_time") return "Great — you arrived on time.";

    if (status === "late") {
        if (pastStart) {
            return `You're running late — about ${pastStart} past the start. Head there as soon as you can.`;
        }
        return "You're running late. Head there as soon as you can.";
    }

    return "Status is updating…";
}

function getPermissionValues(obj) {
    return Object.values(obj || {}).filter((v) => typeof v === "string");
}

function hasGrantedPermission(permissionObj) {
    const values = getPermissionValues(permissionObj);
    return values.includes("granted");
}

function toFriendlyLocationError(err, { includeRetryHint = false } = {}) {
    const code = typeof err?.code === "number" ? err.code : null;
    const raw = String(err?.message || err || "").trim();
    const msg = raw.toLowerCase();

    // Standard geolocation codes:
    // 1: PERMISSION_DENIED, 2: POSITION_UNAVAILABLE, 3: TIMEOUT
    const isPermissionDenied =
        code === 1 ||
        msg.includes("permission denied") ||
        msg.includes("denied") ||
        msg.includes("not authorized") ||
        msg.includes("unauthorized");

    if (isPermissionDenied) {
        return {
            message: "Location permission denied. Enable it in Settings to use tracking.",
            fatal: true,
        };
    }

    const isTimeout = code === 3 || msg.includes("timeout") || msg.includes("timed out");
    const isUnavailable =
        code === 2 ||
        msg.includes("position unavailable") ||
        msg.includes("unavailable") ||
        msg.includes("no location") ||
        msg.includes("location unavailable");

    const isProviderOff =
        msg.includes("location services") ||
        (msg.includes("gps") && msg.includes("off")) ||
        (msg.includes("provider") && msg.includes("disabled"));

    if (isTimeout || isUnavailable || isProviderOff) {
        return {
            message:
                "Can’t get GPS signal. Try moving outdoors or enabling Location services." +
                (includeRetryHint ? " Trying again…" : ""),
            fatal: false,
        };
    }

    // Fallback
    return {
        message: (raw || "Location error.") + (includeRetryHint ? " Trying again…" : ""),
        fatal: false,
    };
}

function deriveStatusLevelFromStepStatus(stepStatus) {
    if (!stepStatus) return "info";
    if (stepStatus.phase === "completed") return "success";
    if (stepStatus.status === "late") return "warning";
    if (stepStatus.status === "early" || stepStatus.status === "on_time") return "success";
    return "info";
}

export function useTripTracking(trip, steps) {
    const [isTracking, setIsTracking] = useState(false);
    const [isStartingTracking, setIsStartingTracking] = useState(false);

    const [watchId, setWatchId] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [positionsHistory, setPositionsHistory] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const [currentStep, setCurrentStep] = useState(null);
    const [distanceToCurrentStep, setDistanceToCurrentStep] = useState(null);
    const [stepStatuses, setStepStatuses] = useState({});

    const [completionFlash, setCompletionFlash] = useState(null);

    // A small ticker so step selection/status can update even if GPS doesn't emit new points (e.g., user stationary).
    const [nowTick, setNowTick] = useState(0);


    const stepsByTime = useMemo(() => {
        const arr = Array.isArray(steps) ? [...steps] : [];
        arr.sort((a, b) => {
            const aMs = toMs(a?.scheduledStart) ?? Number.POSITIVE_INFINITY;
            const bMs = toMs(b?.scheduledStart) ?? Number.POSITIVE_INFINITY;
            return aMs - bMs;
        });
        return arr;
    }, [steps]);


    const isNative = Capacitor.isNativePlatform();
    const lastInsideRef = useRef({});
    const lastPersistedLocationRef = useRef(null);
    const hadFirstFixRef = useRef(false);

    // used to dedupe Firestore writes per step
    const statusSyncRef = useRef({});
    // used to mark previous step as completed when we switch to the next step
    const lastCurrentStepRef = useRef(null);

    const completionFlashTimerRef = useRef(null);

    const tripId = trip?.id || null;
    const tripOwnerEmail = trip?.userEmail || null;

    // Tick periodically while tracking (or starting) so time-based step switching works reliably.
    useEffect(() => {
        if (!isTracking && !isStartingTracking) return undefined;

        const id = setInterval(() => {
            setNowTick((t) => t + 1);
        }, 30_000);

        return () => clearInterval(id);
    }, [isTracking, isStartingTracking]);

    const clearWatchSafely = useCallback(async (id) => {
        if (id == null) return;
        try {
            await Geolocation.clearWatch({ id });
        } catch (e) {
            // ignore
        }
    }, []);

    const stopTracking = useCallback(async () => {
        try {
            await clearWatchSafely(watchId);
        } catch (e) {
            console.warn("[Tracking] stopTracking error:", e);
        } finally {
            setWatchId(null);
            setIsTracking(false);
            setIsStartingTracking(false);
            hadFirstFixRef.current = false;

            // Reset per-trip notification dedupe flags so each tracking session can notify again.
            try {
                await clearTripNotificationFlags(tripId);
            } catch {
                // ignore
            }

            // Clear any transient completion flash
            if (completionFlashTimerRef.current) {
                clearTimeout(completionFlashTimerRef.current);
                completionFlashTimerRef.current = null;
            }
            setCompletionFlash(null);

            // Clear transient errors when user explicitly stops.
            setError(null);
        }
    }, [watchId, clearWatchSafely]);

    const startTracking = useCallback(async () => {
        // Prevent double taps
        if (isTracking || isStartingTracking) return;

        setError(null);
        setIsStartingTracking(true);
        hadFirstFixRef.current = false;

        // Reset per-trip notification dedupe flags so each tracking session can notify again.
        try {
            await clearTripNotificationFlags(tripId);
        } catch {
            // ignore
        }

        if (!isNative) {
            setError("Tracking is only available in the mobile app.");
            setIsStartingTracking(false);
            return;
        }

        try {
            // Permission flow (friendly + explicit)
            let permission = null;
            try {
                permission = await Geolocation.checkPermissions();
            } catch (e) {
                // Some environments may not support checkPermissions properly.
                permission = null;
            }

            if (!hasGrantedPermission(permission)) {
                const requested = await Geolocation.requestPermissions();
                if (!hasGrantedPermission(requested)) {
                    setError("Location permission denied. Enable it in Settings to use tracking.");
                    setIsStartingTracking(false);
                    return;
                }
            }

            const id = await Geolocation.watchPosition(
                { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
                async (position, err) => {
                    if (err) {
                        console.error("[Tracking] watchPosition error:", err);

                        const friendly = toFriendlyLocationError(err, { includeRetryHint: true });
                        setError(friendly.message);

                        // Fatal errors: stop tracking to avoid UI claiming it's active.
                        if (friendly.fatal) {
                            await clearWatchSafely(id);
                            setWatchId(null);
                            setIsTracking(false);
                            setIsStartingTracking(false);
                        }

                        return;
                    }

                    if (!position?.coords) return;

                    const { latitude, longitude, accuracy } = position.coords;
                    const ts = position.timestamp || Date.now();

                    setCurrentPosition({ latitude, longitude, accuracy });
                    setLastUpdate(new Date(ts));
                    setError(null);

                    if (!hadFirstFixRef.current) {
                        hadFirstFixRef.current = true;
                        setIsStartingTracking(false);
                    }

                    setPositionsHistory((prev) => {
                        const next = [...prev, { latitude, longitude, accuracy, timestamp: ts }];
                        return next.length > 500 ? next.slice(-500) : next;
                    });
                }
            );

            setWatchId(id);
            setIsTracking(true);
        } catch (e) {
            console.error("[Tracking] startTracking error:", e);

            // Start errors are treated as fatal (no watcher created or can't proceed).
            const friendly = toFriendlyLocationError(e, { includeRetryHint: false });
            setError(friendly.message || "Failed to start tracking");
            setIsTracking(false);
            setWatchId(null);
            setIsStartingTracking(false);
        }
    }, [isNative, isTracking, isStartingTracking, clearWatchSafely]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchId != null) Geolocation.clearWatch({ id: watchId }).catch(() => { });
        };
    }, [watchId]);

    // Helper: sync a given step status to Firestore with dedupe
    const syncStepStatusToFirestore = useCallback(
        (step, statusObj) => {
            if (!tripId || !step?.stepId || !statusObj?.status) return;

            const key = `${tripId}_${step.stepId}`;
            const arrivalMs = statusObj.actualArrivalTime
                ? new Date(statusObj.actualArrivalTime).getTime()
                : null;

            const snapshot = {
                status: statusObj.status,
                deltaMinutes: statusObj.deltaMinutes ?? null,
                arrivalMs,
                phase: statusObj.phase ?? null,
                performing: !!statusObj.performing,
            };

            const last = statusSyncRef.current[key];
            if (
                last &&
                last.status === snapshot.status &&
                last.deltaMinutes === snapshot.deltaMinutes &&
                last.arrivalMs === snapshot.arrivalMs &&
                last.phase === snapshot.phase &&
                last.performing === snapshot.performing
            ) {
                return;
            }

            statusSyncRef.current[key] = snapshot;

            saveStepStatus({
                tripId,
                userEmail: tripOwnerEmail,
                stepId: step.stepId,
                activityType: step.activityType,
                placeName: step.placeName,

                status: snapshot.status,
                deltaMinutes: snapshot.deltaMinutes,
                actualArrivalTime: statusObj.actualArrivalTime || null,

                // for notifications
                phase: snapshot.phase,
                performing: snapshot.performing,
            });
        },
        [tripId, tripOwnerEmail]
    );

    // 1) Compute current step + distances + statuses
    useEffect(() => {
        if (!steps || steps.length === 0) {
            setCurrentStep(null);
            setDistanceToCurrentStep(null);
            return;
        }

        const now = new Date();
        const step = findCurrentOrNextStep(steps, now) || null;
        setCurrentStep(step);

        if (!step || !currentPosition) {
            setDistanceToCurrentStep(null);
            return;
        }

        const distance = haversineDistanceMeters(
            currentPosition.latitude,
            currentPosition.longitude,
            step.lat,
            step.lng
        );
        const roundedDistance = Math.round(distance);
        setDistanceToCurrentStep(roundedDistance);

        const inside = distance <= DEFAULT_GEOFENCE_RADIUS_METERS;
        const prevInside = lastInsideRef.current[step.stepId] ?? false;
        lastInsideRef.current[step.stepId] = inside;

        const startMs = toMs(step.scheduledStart);
        if (startMs == null) return;

        const endMs = toMs(step.scheduledEnd) ?? startMs + 2 * 60 * 60 * 1000;
        const nowMs = now.getTime();

        const deltaMinutes = (nowMs - startMs) / 60000;
        const phase = nowMs < startMs ? "before_start" : nowMs > endMs ? "completed" : "in_progress";

        setStepStatuses((prev) => {
            const existing = prev[step.stepId] || {
                status: "not_started",
                actualArrivalTime: null,
                deltaMinutes: null,
                phase: "before_start",
                performing: false,
                message: null,
            };

            let status = existing.status;
            let actualArrivalTime = existing.actualArrivalTime;
            let lockedDelta = existing.deltaMinutes; // we lock delta on arrival or "late (not arrived)"

            if (!inside) {
                if (!actualArrivalTime) {
                    if (deltaMinutes < -UPCOMING_WINDOW_MINUTES) status = "upcoming";
                    else if (deltaMinutes <= PRE_ARRIVAL_LATE_THRESHOLD_MINUTES) status = "en_route";
                    else {
                        status = "late";
                        lockedDelta = deltaMinutes; // lock lateness before arrival (useful for notifications)
                    }
                }
            } else {
                // inside geofence
                if (!actualArrivalTime && !prevInside) {
                    // just entered (arrival event)
                    actualArrivalTime = now;
                    lockedDelta = deltaMinutes;

                    if (deltaMinutes <= -EARLY_THRESHOLD_MINUTES) status = "early";
                    else if (deltaMinutes <= ARRIVAL_ON_TIME_LATE_WINDOW_MINUTES) status = "on_time";
                    else status = "late";
                } else if (!actualArrivalTime) {
                    // started already inside
                    actualArrivalTime = now;
                    lockedDelta = deltaMinutes;

                    if (deltaMinutes <= -EARLY_THRESHOLD_MINUTES) status = "early";
                    else if (deltaMinutes <= ARRIVAL_ON_TIME_LATE_WINDOW_MINUTES) status = "on_time";
                    else status = "late";
                }
            }

            const performing = phase === "in_progress" && inside;

            const deltaSeconds = (nowMs - startMs) / 1000;
            const timeToStartSeconds = (startMs - nowMs) / 1000;

            // New UX: if there is a long (>= 1h) free gap between this step and the previous step,
            // show a calm "no activity" message until 15 minutes before the next activity.
            let showIdleGapMessage = false;
            if (phase === "before_start" && !inside) {
                const idx = stepsByTime.findIndex((s) => s?.stepId === step.stepId);
                if (idx > 0) {
                    const prevStep = stepsByTime[idx - 1];
                    const prevEndMs = getStepEndMs(prevStep);

                    if (typeof prevEndMs === "number") {
                        const gapMs = startMs - prevEndMs;
                        const inGap = nowMs > prevEndMs && nowMs < startMs;
                        const moreThan15mLeft = startMs - nowMs > 15 * 60 * 1000;

                        if (inGap && moreThan15mLeft && gapMs >= 60 * 60 * 1000) {
                            showIdleGapMessage = true;
                        }
                    }
                }
            }

            const message = buildStatusMessage({
                phase,
                inside,
                status,
                deltaSeconds: typeof lockedDelta === "number" ? lockedDelta * 60 : deltaSeconds,
                timeToStartSeconds,
                distanceMeters: roundedDistance,
                showIdleGapMessage,
            });

            const next = {
                ...prev,
                [step.stepId]: {
                    status,
                    actualArrivalTime,
                    deltaMinutes: typeof lockedDelta === "number" ? lockedDelta : null,
                    phase,
                    performing,
                    message,
                },
            };

            return next;
        });
    }, [steps, stepsByTime, currentPosition, nowTick]);

    const currentStepStatus =
        currentStep && stepStatuses[currentStep.stepId] ? stepStatuses[currentStep.stepId] : null;

    // 2) Persist locations to Firestore (throttled)
    useEffect(() => {
        if (!tripId || !currentPosition) return;

        const now = Date.now();
        const { latitude, longitude, accuracy } = currentPosition;
        const last = lastPersistedLocationRef.current;

        let shouldSave = false;
        if (!last) shouldSave = true;
        else {
            const d = haversineDistanceMeters(latitude, longitude, last.latitude, last.longitude);
            const dt = now - last.timestamp;
            if (d >= MIN_DISTANCE_TO_SAVE_METERS || dt >= MIN_INTERVAL_TO_SAVE_MS) shouldSave = true;
        }
        if (!shouldSave) return;

        lastPersistedLocationRef.current = { latitude, longitude, timestamp: now };

        saveTripLocation({
            tripId,
            userEmail: tripOwnerEmail,
            stepId: currentStep?.stepId || null,
            activityType: currentStep?.activityType || null,
            placeName: currentStep?.placeName || null,
            latitude,
            longitude,
            accuracy,
            source: "gps",
            timestamp: now,
        });
    }, [tripId, tripOwnerEmail, currentPosition, currentStep]);

    // 3) Persist *current* step status to Firestore (includes phase/performing)
    useEffect(() => {
        if (!currentStep || !currentStepStatus) return;
        syncStepStatusToFirestore(currentStep, currentStepStatus);
    }, [currentStep, currentStepStatus, syncStepStatusToFirestore]);

    // 4) When we switch steps, mark the previous step as completed (so notifications can fire)
    useEffect(() => {
        const prevStep = lastCurrentStepRef.current;
        const nextStep = currentStep;

        // store for next run
        lastCurrentStepRef.current = nextStep;

        if (!prevStep || !nextStep) return;
        if (prevStep.stepId === nextStep.stepId) return;

        const nowMs = Date.now();
        const prevEndMs = getStepEndMs(prevStep);
        const prevActuallyEnded = prevEndMs != null && nowMs > prevEndMs;

        if (prevActuallyEnded) {
            // 1) flash the completion message for 5 seconds
            const msg = "This activity window has ended. You can move on to the next one.";
            setCompletionFlash({ message: msg, expiresAt: nowMs + COMPLETION_FLASH_MS });

            if (completionFlashTimerRef.current) clearTimeout(completionFlashTimerRef.current);
            completionFlashTimerRef.current = setTimeout(() => {
                setCompletionFlash(null);
                completionFlashTimerRef.current = null;
            }, COMPLETION_FLASH_MS);

            // 2) (existing behavior) mark prev step as completed in stepStatuses + Firestore sync
            setStepStatuses((prev) => {
                const prevStatus = prev[prevStep.stepId];
                if (!prevStatus) return prev;

                const updated = {
                    ...prev,
                    [prevStep.stepId]: {
                        ...prevStatus,
                        phase: "completed",
                        performing: false,
                        message: msg,
                    },
                };

                syncStepStatusToFirestore(prevStep, updated[prevStep.stepId]);
                return updated;
            });
        }
    }, [currentStep, syncStepStatusToFirestore]);

    useEffect(() => {
        return () => {
            if (completionFlashTimerRef.current) {
                clearTimeout(completionFlashTimerRef.current);
                completionFlashTimerRef.current = null;
            }
        };
    }, []);

    // --- UI messaging state (single, predictable priority) ---
    // Priority order:
    // 1) Hard errors
    // 2) Starting tracking (after tapping Start, before first GPS fix)
    // 3) Tracking active but missing data
    // 4) Tracking active + currentStepStatus.message
    // 5) Fallback
    let statusMessage = "Tracking is off";
    let statusLevel = "info";

    if (error) {
        statusMessage = error;
        statusLevel = "error";
    } else if (isStartingTracking) {
        statusMessage = "Starting tracking… Waiting for GPS signal…";
        statusLevel = "info";
    } else if (
        isTracking &&
        completionFlash &&
        typeof completionFlash.expiresAt === "number" &&
        Date.now() < completionFlash.expiresAt
    ) {
        statusMessage = completionFlash.message;
        statusLevel = "success";
    } else if (isTracking) {
        if (!currentPosition) {
            statusMessage = "Waiting for GPS signal…";
            statusLevel = "info";
        } else if (!steps || steps.length === 0) {
            statusMessage = "Tracking is on, but this trip has no activities scheduled.";
            statusLevel = "warning";
        } else if (!currentStep) {
            statusMessage = "Tracking is on, but no upcoming activity was found.";
            statusLevel = "warning";
        } else if (!currentStepStatus) {
            statusMessage = "Calculating your status…";
            statusLevel = "info";
        } else if (typeof currentStepStatus?.message === "string" && currentStepStatus.message.trim()) {
            statusMessage = currentStepStatus.message.trim();
            statusLevel = deriveStatusLevelFromStepStatus(currentStepStatus);
        } else {
            statusMessage = "Status is updating…";
            statusLevel = "info";
        }
    }

    return {
        isTracking,
        isStartingTracking,
        statusMessage,
        statusLevel,

        currentPosition,
        positionsHistory,
        lastUpdate,
        error,

        currentStep,
        distanceToCurrentStep,
        geofenceRadius: DEFAULT_GEOFENCE_RADIUS_METERS,
        stepStatuses,
        currentStepStatus,

        startTracking,
        stopTracking,
    };
}
