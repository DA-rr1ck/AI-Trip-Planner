// fe/src/components/MapRoute.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2, ChevronDown, ChevronUp, Settings } from 'lucide-react'

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
  const [routeMode, setRouteMode] = useState('car')
  const [routingService, setRoutingService] = useState('osrm') // 'osrm' or 'openroute'
  const [loading, setLoading] = useState(true)
  const [routeLines, setRouteLines] = useState([])
  const [markers, setMarkers] = useState([])
  const [showDetails, setShowDetails] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [detailedInstructions, setDetailedInstructions] = useState([])

  // Robust lat/lng extraction (handles different coordinate shapes)
  const getLatLng = (activity) => {
    if (!activity) return null
    const g =
      activity.GeoCoordinates ||
      activity.geoCoordinates ||
      activity.gps_coordinates ||
      activity.coordinates ||
      null
    if (!g || typeof g !== 'object') return null

    const latRaw = g.Latitude ?? g.latitude ?? g.lat
    const lngRaw = g.Longitude ?? g.longitude ?? g.lng ?? g.lon

    const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw)
    const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return [lat, lng]
  }

  // Filter out activities that don't have valid coordinates (prevents Leaflet crash)
  const validActivities = useMemo(() => {
    if (!Array.isArray(activities)) return []
    return activities.filter(a => getLatLng(a))
  }, [activities])

  // Initialize map (once the first valid coordinate exists)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    if (!validActivities || validActivities.length === 0) return

    const firstLL = getLatLng(validActivities[0])
    if (!firstLL) return

    mapInstance.current = L.map(mapRef.current).setView(firstLL, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current)
  }, [validActivities])

  // Cleanup map on unmount only
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Fetch routes when activities, mode, or service changes
  useEffect(() => {
    if (!mapInstance.current || !validActivities || validActivities.length === 0) return
    fetchRoutes()
  }, [validActivities, routeMode, routingService])

  const fetchRoutesOSRM = async () => {
    const newMarkers = []
    const newRouteLines = []
    const segments = []
    const instructions = []

    // Get profile based on mode
    const profileMap = {
      car: 'car',
      bike: 'bike',
      walk: 'foot'
    }
    const profile = profileMap[routeMode]

    // Create markers
    validActivities.forEach((activity, index) => {
      const ll = getLatLng(activity)
      if (!ll) return
      const marker = L.marker(
        ll,
        {
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
            ">${index + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }
      ).addTo(mapInstance.current)

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${activity.PlaceName}</h3>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${activity.PlaceDetails}</p>
          <div style="font-size: 12px; color: #888;">
            <div>💰 ${activity.TicketPricing}</div>
            <div>⏱️ ${activity.Duration || activity.TimeTravel || 'N/A'}</div>
          </div>
        </div>
      `)

      newMarkers.push(marker)
    })

    // Fetch routes for each segment using OSRM
    for (let i = 0; i < validActivities.length - 1; i++) {
      const startLL = getLatLng(validActivities[i])
      const endLL = getLatLng(validActivities[i + 1])
      if (!startLL || !endLL) continue

      // OSRM expects [lng, lat]
      const start = [startLL[1], startLL[0]]
      const end = [endLL[1], endLL[0]]

      // OSRM API endpoint (free, no API key needed!)
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`OSRM API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]
        
        // Convert coordinates from [lng, lat] to [lat, lng]
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]])

        // Draw route line
        const routeLine = L.polyline(coords, {
          color: routeMode === 'car' ? '#4F46E5' : routeMode === 'bike' ? '#10B981' : '#F59E0B',
          weight: 6,
          opacity: 0.7
        }).addTo(mapInstance.current)

        newRouteLines.push(routeLine)

        // Store segment info
        const distance = (leg.distance / 1000).toFixed(2)
        const duration = Math.round(leg.duration / 60)

        segments.push({
          fromIndex: i,
          toIndex: i + 1,
          distance: distance,
          duration: duration,
          mode: routeMode
        })

        // Store detailed instructions
        instructions.push({
          from: validActivities[i].PlaceName,
          to: validActivities[i + 1].PlaceName,
          steps: leg.steps.map(step => ({
            text: step.maneuver.instruction || `Continue for ${(step.distance / 1000).toFixed(2)} km`,
            distance: (step.distance / 1000).toFixed(2),
            time: Math.round(step.duration / 60),
            direction: step.name || ''
          }))
        })
      }
    }

    return { newMarkers, newRouteLines, segments, instructions }
  }

  const fetchRoutesOpenRoute = async () => {
    const newMarkers = []
    const newRouteLines = []
    const segments = []
    const instructions = []

    const API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

    if (!API_KEY) {
      throw new Error('OpenRouteService API key is missing')
    }

    // Get profile based on mode
    const profileMap = {
      car: 'driving-car',
      bike: 'cycling-regular',
      walk: 'foot-walking'
    }
    const profile = profileMap[routeMode]

    // Create markers
    validActivities.forEach((activity, index) => {
      const ll = getLatLng(activity)
      if (!ll) return
      const marker = L.marker(
        ll,
        {
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
            ">${index + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }
      ).addTo(mapInstance.current)

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${activity.PlaceName}</h3>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${activity.PlaceDetails}</p>
          <div style="font-size: 12px; color: #888;">
            <div>💰 ${activity.TicketPricing}</div>
            <div>⏱️ ${activity.Duration || activity.TimeTravel || 'N/A'}</div>
          </div>
        </div>
      `)

      newMarkers.push(marker)
    })

    // Fetch routes for each segment
    for (let i = 0; i < validActivities.length - 1; i++) {
      const startLL = getLatLng(validActivities[i])
      const endLL = getLatLng(validActivities[i + 1])
      if (!startLL || !endLL) continue

      // OpenRoute expects [lng, lat]
      const start = [startLL[1], startLL[0]]
      const end = [endLL[1], endLL[0]]

      const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/geo+json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        },
        body: JSON.stringify({
          coordinates: [start, end]
        })
      })

      if (!response.ok) {
        throw new Error(`OpenRouteService API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const route = data.features[0]
        const segment = route.properties.segments[0]
        
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]])

        const routeLine = L.polyline(coords, {
          color: routeMode === 'car' ? '#4F46E5' : routeMode === 'bike' ? '#10B981' : '#F59E0B',
          weight: 6,
          opacity: 0.7
        }).addTo(mapInstance.current)

        newRouteLines.push(routeLine)

        const distance = (segment.distance / 1000).toFixed(2)
        const duration = Math.round(segment.duration / 60)

        segments.push({
          fromIndex: i,
          toIndex: i + 1,
          distance: distance,
          duration: duration,
          mode: routeMode
        })

        instructions.push({
          from: validActivities[i].PlaceName,
          to: validActivities[i + 1].PlaceName,
          steps: segment.steps.map(step => ({
            text: step.instruction,
            distance: (step.distance / 1000).toFixed(2),
            time: Math.round(step.duration / 60),
            direction: step.name || ''
          }))
        })
      }
    }

    return { newMarkers, newRouteLines, segments, instructions }
  }

  const fetchRoutes = async () => {
    setLoading(true)
    
    // Clear existing markers and routes
    markers.forEach(marker => marker.remove())
    routeLines.forEach(line => line.remove())

    try {
      let result
      
      if (routingService === 'osrm') {
        result = await fetchRoutesOSRM()
      } else {
        result = await fetchRoutesOpenRoute()
      }

      setMarkers(result.newMarkers)
      setRouteLines(result.newRouteLines)
      setDetailedInstructions(result.instructions)

      // Fit map to show all markers
      if (validActivities.length > 0) {
        const points = validActivities.map(a => getLatLng(a)).filter(Boolean)
        if (points.length > 0) {
          const bounds = L.latLngBounds(points)
          mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
        }
      }

      if (onRouteCalculated) {
        onRouteCalculated(result.segments, result.instructions)
      }

    } catch (error) {
      console.error('Error fetching routes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = (mode) => {
    setRouteMode(mode)
    setShowDetails(false)
  }

  const getModeLabel = () => {
    if (routeMode === 'car') return 'driving'
    if (routeMode === 'bike') return 'cycling'
    return 'walking'
  }

  if (!validActivities || validActivities.length === 0) return null

  return (
    <div className='mt-4'>
      <div className='mb-3'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='font-semibold text-lg'>📍 Route Map</h3>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
          >
            <Settings className='h-3 w-3' />
            Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className='mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200'>
            <p className='text-xs font-semibold text-gray-700 mb-2'>Routing Service:</p>
            <div className='flex gap-2'>
              <button
                onClick={() => setRoutingService('osrm')}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-all ${
                  routingService === 'osrm'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                OSRM (Free, Fast)
              </button>
              <button
                onClick={() => setRoutingService('openroute')}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-all ${
                  routingService === 'openroute'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                OpenRouteService
              </button>
            </div>
            <p className='text-xs text-gray-500 mt-2'>
              {routingService === 'osrm' 
                ? '✓ OSRM is free with no API key required'
                : 'ℹ️ OpenRouteService requires API key (more detailed instructions)'}
            </p>
          </div>
        )}
        
        {/* Transport Mode Buttons */}
        <div className='flex gap-2 mb-3'>
          <button
            onClick={() => handleModeChange('car')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'car'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🚗 Car
          </button>
          <button
            onClick={() => handleModeChange('bike')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'bike'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🚴 Bicycle
          </button>
          <button
            onClick={() => handleModeChange('walk')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border transition-all ${
              routeMode === 'walk'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🚶 Walking
          </button>
        </div>
      </div>

      <div className='relative'>
        <div 
          ref={mapRef} 
          className='w-full h-[400px] rounded-lg border border-gray-300 shadow-sm'
        />
        {loading && (
          <div className='absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg'>
            <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          </div>
        )}
      </div>
      
      <div className='mt-3 flex items-center justify-between'>
        <p className='text-xs text-gray-500'>
          💡 Click on numbered markers to see activity details
        </p>
        
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

      {showDetails && detailedInstructions.length > 0 && (
        <div className='mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border'>
          <h4 className='font-semibold text-sm'>
            Turn-by-turn directions ({getModeLabel()}) - Powered by {routingService === 'osrm' ? 'OSRM' : 'OpenRouteService'}
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