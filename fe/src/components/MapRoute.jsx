// fe/src/components/MapRoute.jsx
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function MapRoute({ activities, locationName, onRouteCalculated }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const routingControl = useRef(null)
  const [routeMode, setRouteMode] = useState('car')
  const [showDetails, setShowDetails] = useState(false)
  const [detailedInstructions, setDetailedInstructions] = useState([])

  useEffect(() => {
    if (!activities || activities.length === 0) return

    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView(
        [activities[0].GeoCoordinates.Latitude, activities[0].GeoCoordinates.Longitude],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current)
    }

    if (mapInstance.current) {
      updateRoute()
    }

    return () => {
      if (routingControl.current && mapInstance.current) {
        mapInstance.current.removeControl(routingControl.current)
        routingControl.current = null
      }
    }
  }, [activities, routeMode])

  const updateRoute = () => {
    if (!mapInstance.current) return

    if (routingControl.current) {
      mapInstance.current.removeControl(routingControl.current)
    }

    const waypoints = activities.map(activity =>
      L.latLng(activity.GeoCoordinates.Latitude, activity.GeoCoordinates.Longitude)
    )

    // ENHANCED: Get service URL and profile based on mode
    let serviceUrl = ''
    let profile = 'driving' // OSRM profile
    
    if (routeMode === 'car') {
      serviceUrl = 'https://router.project-osrm.org/route/v1'
      profile = 'driving'
    } else if (routeMode === 'bike') {
      serviceUrl = 'https://routing.openstreetmap.de/routed-bike/route/v1'
      profile = 'cycling'
    } else if (routeMode === 'walk') {
      serviceUrl = 'https://routing.openstreetmap.de/routed-foot/route/v1'
      profile = 'foot'
    }

    routingControl.current = L.Routing.control({
      waypoints: waypoints,
      router: L.Routing.osrmv1({
        serviceUrl: serviceUrl,
        profile: profile, // Specify the profile
      }),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [
          {
            color: routeMode === 'car' ? '#4F46E5' : routeMode === 'bike' ? '#10B981' : '#F59E0B',
            opacity: 0.7,
            weight: 6
          }
        ]
      },
      createMarker: function(i, waypoint, n) {
        const activity = activities[i]
        const marker = L.marker(waypoint.latLng, {
          draggable: false,
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background-color: ${routeMode === 'car' ? '#4F46E5' : routeMode === 'bike' ? '#10B981' : '#F59E0B'};
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">${i + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        })

        if (activity) {
          marker.bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${activity.PlaceName}</h3>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${activity.PlaceDetails}</p>
              <div style="font-size: 12px; color: #888;">
                <div>💰 ${activity.TicketPricing}</div>
                <div>⏱️ ${activity.TimeTravel}</div>
              </div>
            </div>
          `)
        }

        return marker
      }
    })
    .on('routesfound', function(e) {
      const routes = e.routes
      if (routes && routes.length > 0) {
        const route = routes[0]
        const segments = []
        const instructions = []
        
        const waypointIndices = route.waypointIndices || []
        
        // Calculate segments and collect detailed instructions
        for (let i = 0; i < activities.length - 1; i++) {
          const startIdx = waypointIndices[i] || 0
          const endIdx = waypointIndices[i + 1] || route.coordinates.length - 1
          
          let legDistance = 0
          let legDuration = 0
          const legInstructions = []
          
          // Sum up distance and collect instructions for this leg
          for (let coordIdx = startIdx; coordIdx < endIdx; coordIdx++) {
            if (route.coordinates[coordIdx + 1]) {
              // Calculate distance
              const lat1 = route.coordinates[coordIdx].lat
              const lon1 = route.coordinates[coordIdx].lng
              const lat2 = route.coordinates[coordIdx + 1].lat
              const lon2 = route.coordinates[coordIdx + 1].lng
              
              const R = 6371
              const dLat = (lat2 - lat1) * Math.PI / 180
              const dLon = (lon2 - lon1) * Math.PI / 180
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                       Math.sin(dLon/2) * Math.sin(dLon/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const distance = R * c * 1000
              
              legDistance += distance
            }
            
            // Collect instruction for this coordinate index
            const instruction = route.instructions.find(inst => inst.index === coordIdx)
            if (instruction) {
              legInstructions.push(instruction)
              legDuration += instruction.time || 0
            }
          }
          
          // Fallback duration estimation
          if (legDuration === 0 && legDistance > 0) {
            const speedKmh = routeMode === 'car' ? 50 : routeMode === 'bike' ? 15 : 5
            legDuration = (legDistance / 1000) / speedKmh * 3600
          }
          
          segments.push({
            fromIndex: i,
            toIndex: i + 1,
            distance: (legDistance / 1000).toFixed(2),
            duration: Math.round(legDuration / 60),
            mode: routeMode
          })
          
          // Store detailed instructions
          instructions.push({
            from: activities[i].PlaceName,
            to: activities[i + 1].PlaceName,
            steps: legInstructions.map(inst => ({
              text: inst.text || 'Continue',
              distance: ((inst.distance || 0) / 1000).toFixed(2),
              time: Math.round((inst.time || 0) / 60),
              direction: inst.direction || ''
            }))
          })
        }
        
        console.log('Calculated segments:', segments)
        console.log('Detailed instructions:', instructions)
        
        if (onRouteCalculated) {
          onRouteCalculated(segments, instructions) // Pass BOTH
        }
      }
    })
    .addTo(mapInstance.current)

    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints)
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }

  const handleModeChange = (mode) => {
    setRouteMode(mode)
    setShowDetails(false) // Close details when changing mode
  }

  const getModeLabel = () => {
    if (routeMode === 'car') return 'driving'
    if (routeMode === 'bike') return 'cycling'
    return 'walking'
  }

  return (
    <div className='mt-4'>
      <div className='mb-3'>
        <h3 className='font-semibold text-lg mb-2'>📍 Route Map</h3>
        
        <div className='flex gap-2 mb-3'>
          <button
            onClick={() => handleModeChange('car')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'car'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
            }`}
          >
            🚗 Car
          </button>
          <button
            onClick={() => handleModeChange('bike')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'bike'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
            }`}
          >
            🚴 Bicycle
          </button>
          <button
            onClick={() => handleModeChange('walk')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'walk'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
            }`}
          >
            🚶 Walking
          </button>
        </div>
      </div>

      <div 
        ref={mapRef} 
        className='w-full h-[400px] rounded-lg border border-gray-300 shadow-sm'
      />
      
      <div className='mt-3 flex items-center justify-between'>
        <p className='text-xs text-gray-500'>
          💡 Click on numbered markers to see activity details
        </p>
        
        {/* Show detailed instructions button */}
        {detailedInstructions.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className='text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1'
          >
            {showDetails ? (
              <>
                Hide Details <ChevronUp className='h-3 w-3' />
              </>
            ) : (
              <>
                Show Detailed Instructions <ChevronDown className='h-3 w-3' />
              </>
            )}
          </button>
        )}
      </div>

      {/* Detailed turn-by-turn instructions */}
      {showDetails && detailedInstructions.length > 0 && (
        <div className='mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border'>
          <h4 className='font-semibold text-sm'>
            Turn-by-turn directions ({getModeLabel()})
          </h4>
          
          {detailedInstructions.map((leg, legIdx) => (
            <div key={legIdx} className='space-y-2'>
              <div className='flex items-center gap-2 text-sm font-medium text-blue-700'>
                <span className='bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                  {legIdx + 1}
                </span>
                → 
                <span className='bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                  {legIdx + 2}
                </span>
                <span>{leg.from} to {leg.to}</span>
              </div>
              
              {leg.steps.length > 0 ? (
                <ol className='ml-6 space-y-1'>
                  {leg.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className='text-xs text-gray-700 flex items-start gap-2'>
                      <span className='text-gray-400 font-mono'>{stepIdx + 1}.</span>
                      <div className='flex-1'>
                        <span>{step.text}</span>
                        {step.distance > 0 && (
                          <span className='text-gray-500 ml-2'>
                            ({step.distance} km
                            {step.time > 0 && `, ${step.time} min`})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className='text-xs text-gray-500 ml-6'>
                  No detailed instructions available for this segment
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MapRoute

/*
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

       
        {routeData.route && routeData.route.length > 0 && (
          <Polyline
            positions={routeData.route}
            color="#4F46E5"
            weight={4}
            opacity={0.8}
          />
        )}

        
        <FitBounds coordinates={routeData.coordinates} />
      </MapContainer>

    
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
*/