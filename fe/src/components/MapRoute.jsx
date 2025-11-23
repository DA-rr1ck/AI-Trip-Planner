import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered marker icon
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #4F46E5;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Component to fit map bounds to show all markers
function FitBounds({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
}

function MapRoute({ activities, locationName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!activities || activities.length === 0) {
        setError('No activities to display');
        setLoading(false);
        return;
      }

      // Filter activities with valid coordinates
      const validActivities = activities.filter(
        (activity) =>
          activity.GeoCoordinates?.Latitude &&
          activity.GeoCoordinates?.Longitude
      );

      if (validActivities.length === 0) {
        setError('No valid coordinates found');
        setLoading(false);
        return;
      }

      // If only one location, just show the marker
      if (validActivities.length === 1) {
        setRouteData({
          coordinates: [[
            validActivities[0].GeoCoordinates.Latitude,
            validActivities[0].GeoCoordinates.Longitude
          ]],
          activities: validActivities,
          route: null,
          distance: 0,
          duration: 0,
        });
        setLoading(false);
        return;
      }

      try {
        // Get API key from environment
        const API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY;

        if (!API_KEY) {
          throw new Error('OpenRouteService API key is missing. Add VITE_OPENROUTE_API_KEY to your .env file');
        }

        // For GET requests with multiple waypoints, we need to make multiple requests
        // GET endpoint only supports start and end (2 points)
        // So we'll make segment-by-segment requests
        
        const allRouteCoords = [];
        const legs = [];
        let totalDistance = 0;
        let totalDuration = 0;

        for (let i = 0; i < validActivities.length - 1; i++) {
          const start = `${validActivities[i].GeoCoordinates.Longitude},${validActivities[i].GeoCoordinates.Latitude}`;
          const end = `${validActivities[i + 1].GeoCoordinates.Longitude},${validActivities[i + 1].GeoCoordinates.Latitude}`;

          // Use GET request with query parameters (as per the doc example)
          const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${API_KEY}&start=${start}&end=${end}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
            throw new Error(`API request failed: ${response.status}`);
          }

          const data = await response.json();
          console.log('Route segment data:', data);

          if (data.features && data.features.length > 0) {
            const route = data.features[0];
            const segment = route.properties.segments[0];
            const distance = (segment.distance / 1000).toFixed(2);
            const duration = Math.round(segment.duration / 60);

            totalDistance += parseFloat(distance);
            totalDuration += duration;

            // Add route coordinates (skip first point if not first segment to avoid duplication)
            const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            if (i === 0) {
              allRouteCoords.push(...coords);
            } else {
              allRouteCoords.push(...coords.slice(1));
            }

            legs.push({
              from: validActivities[i].PlaceName,
              to: validActivities[i + 1].PlaceName,
              distance: distance,
              duration: duration,
            });
          }
        }

        setRouteData({
          coordinates: validActivities.map(a => [a.GeoCoordinates.Latitude, a.GeoCoordinates.Longitude]),
          activities: validActivities,
          route: allRouteCoords,
          distance: totalDistance.toFixed(2),
          duration: totalDuration,
          legs: legs,
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching route:', err);
        setError(`Failed to load route: ${err.message}`);
        setLoading(false);
      }
    };

    fetchRoute();
  }, [activities]);

  if (error) {
    return (
      <div className='border rounded-lg p-4 bg-red-50 text-red-700'>
        <p className='text-sm'>⚠️ {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='border rounded-lg p-12 flex items-center justify-center bg-gray-50'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
      </div>
    );
  }

  if (!routeData) return null;

  return (
    <div className='border rounded-lg overflow-hidden bg-white'>
      {/* Map Container */}
      <MapContainer
        center={routeData.coordinates[0]}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Markers for each activity */}
        {routeData.activities.map((activity, index) => (
          <Marker
            key={index}
            position={[activity.GeoCoordinates.Latitude, activity.GeoCoordinates.Longitude]}
            icon={createNumberedIcon(index + 1)}
          >
            <Popup>
              <div className='p-2'>
                <h3 className='font-bold text-sm'>{activity.PlaceName}</h3>
                <p className='text-xs text-gray-600 mt-1'>{activity.PlaceDetails || ''}</p>
                <div className='flex gap-2 mt-2 text-xs'>
                  <span>💰 {activity.TicketPricing}</span>
                  <span>⏱️ {activity.TimeTravel}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route line */}
        {routeData.route && routeData.route.length > 0 && (
          <Polyline
            positions={routeData.route}
            color="#4F46E5"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Fit bounds to show all markers */}
        <FitBounds coordinates={routeData.coordinates} />
      </MapContainer>

      {/* Route Info */}
      {routeData.route && routeData.route.length > 0 && (
        <div className='p-4 bg-gray-50 border-t'>
          <div className='flex items-center gap-4 mb-3'>
            <div className='flex items-center gap-2 text-sm'>
              <Navigation className='h-4 w-4 text-blue-600' />
              <span className='font-semibold'>{routeData.distance} km</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <span>⏱️</span>
              <span className='font-semibold'>{routeData.duration} min walking</span>
            </div>
          </div>

          {/* Leg-by-leg breakdown */}
          {routeData.legs && routeData.legs.length > 0 && (
            <div className='space-y-2'>
              <p className='text-xs font-semibold text-gray-600 uppercase'>Route Details:</p>
              {routeData.legs.map((leg, idx) => (
                <div key={idx} className='text-xs text-gray-600 flex items-start gap-2'>
                  <span className='font-medium text-blue-600'>{idx + 1}→{idx + 2}</span>
                  <span className='flex-1'>
                    {leg.from} to {leg.to}: <span className='font-semibold'>{leg.distance} km</span> ({leg.duration} min)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapRoute;