import React, { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Circle,
    Polyline,
    useMap,
    useMapEvents,
} from "react-leaflet";
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

function MapInteractionGuard({ onUserInteraction }) {
    useMapEvents({
        dragstart(e) {
            if (e?.originalEvent) onUserInteraction();
        },
        zoomstart(e) {
            if (e?.originalEvent) onUserInteraction();
        },
    });
    return null;
}

function TripMap({
    currentPosition,
    currentStep,
    positionsHistory,
    geofenceRadius,
}) {
    const [map, setMap] = useState(null);
    const [autoFit, setAutoFit] = useState(true);
    const [routeCoords, setRouteCoords] = useState([]);
    const lastRouteKeyRef = useRef(null);

    const hasCurrentPos = !!currentPosition;
    const hasStep = !!currentStep;

    const initialCenter = hasCurrentPos
        ? [currentPosition.latitude, currentPosition.longitude]
        : hasStep
            ? [currentStep.lat, currentStep.lng]
            : [21.0285, 105.8542]; // fallback: Hà Nội

    const path = Array.isArray(positionsHistory)
        ? positionsHistory.map((p) => [p.latitude, p.longitude])
        : [];

    // Fetch driving route between user & activity
    useEffect(() => {
        if (!hasCurrentPos || !hasStep) {
            setRouteCoords([]);
            return;
        }

        const fromLat = currentPosition.latitude;
        const fromLng = currentPosition.longitude;
        const toLat = currentStep.lat;
        const toLng = currentStep.lng;

        // Throttle requests: key by step + approx user position (0.01° ≈ ~1km)
        const routeKey = `${currentStep.stepId}_${fromLat.toFixed(2)}_${fromLng.toFixed(2)}`;
        if (lastRouteKeyRef.current === routeKey) return;
        lastRouteKeyRef.current = routeKey;

        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("Route API error");
                const data = await res.json();
                if (!data.routes || !data.routes[0]?.geometry?.coordinates) {
                    setRouteCoords([]);
                    return;
                }

                const coords = data.routes[0].geometry.coordinates.map(
                    ([lng, lat]) => [lat, lng]
                );
                setRouteCoords(coords);
            } catch (err) {
                console.warn("[TripMap] Failed to fetch route, falling back to straight line", err);
                // fallback: straight line between user and activity
                setRouteCoords([
                    [fromLat, fromLng],
                    [toLat, toLng],
                ]);
            }
        };

        fetchRoute();
    }, [hasCurrentPos, hasStep, currentPosition, currentStep]);

    // Auto fit bounds to keep user + activity in view
    useEffect(() => {
        if (!map || !autoFit) return;

        const points = [];
        if (hasCurrentPos) {
            points.push([currentPosition.latitude, currentPosition.longitude]);
        }
        if (hasStep) {
            points.push([currentStep.lat, currentStep.lng]);
        }

        if (points.length === 0) return;

        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds.pad(0.3)); // add padding
    }, [map, autoFit, hasCurrentPos, hasStep, currentPosition, currentStep]);

    const handleUserInteraction = () => {
        // User dragged / zoomed → stop auto-fitting
        setAutoFit(false);
    };

    const handleCenterOnMe = () => {
        if (!map || !hasCurrentPos) return;
        setAutoFit(false);
        map.setView(
            [currentPosition.latitude, currentPosition.longitude],
            16 // zoom level when centering
        );
    };

    return (
        <div className="relative mt-4 rounded-xl border overflow-hidden">
            <MapContainer
                center={initialCenter}
                zoom={14}
                style={{ height: "500px", width: "100%" }}
                whenCreated={setMap}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                <MapInteractionGuard onUserInteraction={handleUserInteraction} />

                {/* Activity marker + geofence */}
                {hasStep && (
                    <>
                        <Marker position={[currentStep.lat, currentStep.lng]} />
                        <Circle
                            center={[currentStep.lat, currentStep.lng]}
                            radius={geofenceRadius}
                            pathOptions={{
                                color: "#3b82f6",
                                fillColor: "#3b82f6",
                                fillOpacity: 0.08,
                            }}
                        />
                    </>
                )}

                {/* User marker */}
                {hasCurrentPos && (
                    <Marker
                        position={[
                            currentPosition.latitude,
                            currentPosition.longitude,
                        ]}
                    />
                )}

                {/* Route between user & activity */}
                {routeCoords.length > 1 && <Polyline positions={routeCoords} />}

                {/* Raw tracked path (optional, keep or remove) */}
                {/* {path.length > 1 && (
                    <Polyline
                        positions={path}
                        pathOptions={{ opacity: 0.4, weight: 3 }}
                    />
                )} */}
            </MapContainer>

            {/* Manual recenter button */}
            <button
                type="button"
                onClick={handleCenterOnMe}
                className="absolute bottom-3 right-3 z-[1000] rounded-full bg-white px-3 py-1.5 text-[11px] font-medium shadow-md border border-gray-200"
            >
                Center on me
            </button>
        </div>
    );
}

export default TripMap;
