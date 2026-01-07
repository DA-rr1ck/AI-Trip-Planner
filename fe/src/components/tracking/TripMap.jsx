import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const isFiniteNumber = (n) => typeof n === "number" && Number.isFinite(n);

function normalizeNumber(v) {
    if (typeof v === "function") {
        try {
            v = v();
        } catch {
            return null;
        }
    }
    if (typeof v === "string") {
        const parsed = Number.parseFloat(v);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return isFiniteNumber(v) ? v : null;
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getLatLngFromPosition(pos) {
    if (!pos) return null;
    const lat = normalizeNumber(pos.latitude ?? pos.lat ?? pos.coords?.latitude);
    const lng = normalizeNumber(pos.longitude ?? pos.lng ?? pos.coords?.longitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
}

function getLatLngFromStep(step) {
    if (!step) return null;

    const lat = normalizeNumber(
        step.lat ??
        step.latitude ??
        step?.location?.lat ??
        step?.location?.latitude ??
        step?.geo?.lat ??
        step?.geo?.latitude ??
        step?.geometry?.location?.lat
    );

    const lng = normalizeNumber(
        step.lng ??
        step.longitude ??
        step?.location?.lng ??
        step?.location?.longitude ??
        step?.geo?.lng ??
        step?.geo?.longitude ??
        step?.geometry?.location?.lng
    );

    if (lat == null || lng == null) return null;
    return { lat, lng };
}

export default function TripMap({
    isTracking = false,
    currentPosition,
    currentStep,
    destinationStep,
    geofenceRadius,
}) {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);

    // Default ALWAYS auto-fit; only turn off when user presses "Center on me"
    const [autoFit, setAutoFit] = useState(true);

    const userLatLng = useMemo(() => getLatLngFromPosition(currentPosition), [currentPosition]);
    const stepForMap = currentStep || destinationStep;
    const stepLatLng = useMemo(() => getLatLngFromStep(stepForMap), [stepForMap]);

    const initialCenter = useMemo(() => {
        if (userLatLng) return [userLatLng.lat, userLatLng.lng];
        if (stepLatLng) return [stepLatLng.lat, stepLatLng.lng];
        return [21.0285, 105.8542];
    }, [userLatLng, stepLatLng]);

    const getMap = () => map || mapRef.current;

    // Capture map instance reliably
    useEffect(() => {
        if (!map && mapRef.current) setMap(mapRef.current);
    }, [map]);

    // Keep default autoFit when stop tracking
    useEffect(() => {
        if (!isTracking) setAutoFit(true);
    }, [isTracking]);

    // Recalc size for fullscreen layouts
    useEffect(() => {
        const m = getMap();
        if (!m) return;

        const t = setTimeout(() => {
            try {
                m.invalidateSize();
            } catch { }
        }, 0);

        const onResize = () => {
            try {
                m.invalidateSize();
            } catch { }
        };

        window.addEventListener("resize", onResize);
        return () => {
            clearTimeout(t);
            window.removeEventListener("resize", onResize);
        };
    }, [map]);

    const fitUserAndStep = useCallback(
        (opts = { animate: false }) => {
            const m = getMap();
            if (!m) return;

            const pts = [];
            if (userLatLng) pts.push([userLatLng.lat, userLatLng.lng]);
            if (stepLatLng) pts.push([stepLatLng.lat, stepLatLng.lng]);
            if (pts.length === 0) return;

            if (pts.length === 1) {
                m.setView(pts[0], 15, { animate: !!opts.animate });
                return;
            }

            m.fitBounds(L.latLngBounds(pts), {
                paddingTopLeft: [16, 160], // leave room for header
                paddingBottomRight: [16, 260], // leave room for footer sheet
                maxZoom: 16,
                animate: !!opts.animate,
            });
        },
        [userLatLng, stepLatLng]
    );

    // Default behavior: keep fitting bounds whenever user/step changes (as long as autoFit is true)
    useEffect(() => {
        if (!autoFit) return;
        fitUserAndStep({ animate: false });
    }, [autoFit, fitUserAndStep]);

    // ROUTING
    const [routeCoords, setRouteCoords] = useState([]);
    const abortRef = useRef(null);
    const lastRouteRef = useRef({ ts: 0, from: null, to: null });

    useEffect(() => {
        // Only show/refresh route when tracking
        if (!isTracking || !userLatLng || !stepLatLng) {
            setRouteCoords([]);
            return;
        }

        const now = Date.now();
        const last = lastRouteRef.current;

        const MIN_INTERVAL_MS = 12_000;
        const MIN_MOVE_METERS = 50;
        const TO_CHANGE_EPS_METERS = 10;

        const movedMeters = last.from
            ? haversineDistanceMeters(last.from.lat, last.from.lng, userLatLng.lat, userLatLng.lng)
            : Infinity;

        const toChanged = !last.to
            ? true
            : haversineDistanceMeters(last.to.lat, last.to.lng, stepLatLng.lat, stepLatLng.lng) > TO_CHANGE_EPS_METERS;

        const tooSoon = last.ts && now - last.ts < MIN_INTERVAL_MS;

        if (!toChanged && movedMeters < MIN_MOVE_METERS && tooSoon) return;

        lastRouteRef.current = { ts: now, from: { ...userLatLng }, to: { ...stepLatLng } };

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const fromLat = userLatLng.lat;
        const fromLng = userLatLng.lng;
        const toLat = stepLatLng.lat;
        const toLng = stepLatLng.lng;

        (async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error("OSRM route error");

                const data = await res.json();
                const coordsRaw = data?.routes?.[0]?.geometry?.coordinates;

                if (!Array.isArray(coordsRaw) || coordsRaw.length < 2) {
                    setRouteCoords([[fromLat, fromLng], [toLat, toLng]]);
                    return;
                }

                const coords = coordsRaw
                    .map(([lng, lat]) => [lat, lng])
                    .filter(([lat, lng]) => isFiniteNumber(lat) && isFiniteNumber(lng));

                setRouteCoords(coords.length >= 2 ? coords : [[fromLat, fromLng], [toLat, toLng]]);
            } catch (err) {
                if (err?.name === "AbortError") return;
                setRouteCoords([[fromLat, fromLng], [toLat, toLng]]);
            }
        })();

        return () => {
            controller.abort();
            if (abortRef.current === controller) abortRef.current = null;
        };
    }, [isTracking, userLatLng, stepLatLng]);

    // Requirement: whenever route updates, fit bounds again (if autoFit is still true)
    useEffect(() => {
        if (!autoFit) return;
        if (!isTracking) return;
        if (!routeCoords || routeCoords.length < 2) return;
        fitUserAndStep({ animate: false });
    }, [routeCoords, autoFit, isTracking, fitUserAndStep]);

    // Requirement: after start tracking (transition false -> true), fit bounds
    const prevIsTrackingRef = useRef(isTracking);
    useEffect(() => {
        const prev = prevIsTrackingRef.current;
        if (!prev && isTracking) {
            // just started tracking
            if (autoFit) fitUserAndStep({ animate: true });
        }
        prevIsTrackingRef.current = isTracking;
    }, [isTracking, autoFit, fitUserAndStep]);

    // Button behavior
    const label = isTracking ? "Center on me" : "Center activity";
    const canCenter = isTracking ? !!userLatLng : !!stepLatLng;

    const handleCenter = (e) => {
        e.stopPropagation();
        const m = getMap();
        if (!m) return;

        if (isTracking) {
            // Only here we disable auto-fit (per requirement)
            if (!userLatLng) return;
            setAutoFit(false);
            m.setView([userLatLng.lat, userLatLng.lng], 15, { animate: true });
            return;
        }

        // Not tracking: center the activity BUT keep auto-fit default as-is
        if (!stepLatLng) return;
        m.setView([stepLatLng.lat, stepLatLng.lng], 15, { animate: true });
    };

    return (
        <div className="relative h-full w-full z-0">
            <style>{`
        .trip-tracking-map .leaflet-top .leaflet-control {
          margin-top: calc(160px + env(safe-area-inset-top)) !important;
        }
        .trip-tracking-map .leaflet-container { z-index: 0 !important; }
      `}</style>

            <MapContainer
                ref={mapRef}
                center={initialCenter}
                zoom={14}
                className="trip-tracking-map h-full w-full"
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                whenReady={() => setMap(mapRef.current)}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                {/* Destination marker + geofence */}
                {stepLatLng && (
                    <>
                        <Marker position={[stepLatLng.lat, stepLatLng.lng]} />
                        <Circle
                            center={[stepLatLng.lat, stepLatLng.lng]}
                            radius={isFiniteNumber(geofenceRadius) ? geofenceRadius : 100}
                            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08 }}
                        />
                    </>
                )}

                {/* User marker */}
                {userLatLng && <Marker position={[userLatLng.lat, userLatLng.lng]} />}

                {/* Route polyline */}
                {routeCoords.length >= 2 && (
                    <Polyline positions={routeCoords} pathOptions={{ weight: 4, opacity: 0.9 }} />
                )}
            </MapContainer>

            <button
                type="button"
                onClick={handleCenter}
                disabled={!canCenter}
                className={
                    "absolute right-3 top-40 z-[7000] rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-md border transition " +
                    (canCenter
                        ? "bg-white border-gray-200 active:bg-gray-200"
                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed")
                }
            >
                {label}
            </button>
        </div>
    );
}
