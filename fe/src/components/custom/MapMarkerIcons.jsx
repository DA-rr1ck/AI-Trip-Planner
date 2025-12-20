import L from 'leaflet'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { Hotel, MapPin, Landmark, Utensils } from 'lucide-react'

// Helper to build a separate Lucide-based Leaflet hotel marker
function createLucideHotelMarkerIcon(IconComponent, bgColor) {
    const html = ReactDOMServer.renderToString(
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: '9999px',
                backgroundColor: bgColor,
                color: '#ffffff',
                border: `2px solid #ffffff`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
            }}
        >
            <IconComponent size={25} />
        </div>
    )

    return L.divIcon({
        html,
        className: '', // prevent default "leaflet-div-icon" styling
        iconSize: [32, 32],
        iconAnchor: [16, 32],     // bottom-center
        popupAnchor: [0, -28],
    })
}

// Helper to build a separate Lucide-based Leaflet attraction marker
function createLucideAttractionMarkerIcon(IconComponent, bgColor) {
    const html = ReactDOMServer.renderToString(
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: '9999px',
                backgroundColor: bgColor,
                color: '#ffffff',
                border: `2px solid #ffffff`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
            }}
        >
            <IconComponent size={25} />
        </div>
    )

    return L.divIcon({
        html,
        className: '', // prevent default "leaflet-div-icon" styling
        iconSize: [32, 32],
        iconAnchor: [16, 32],     // bottom-center
        popupAnchor: [0, -28],
    })
}

// Helper to build a Lucide-based Leaflet marker
function createLucideMarkerIcon(IconComponent, bgColor) {
    const html = ReactDOMServer.renderToString(
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '9999px',
                backgroundColor: bgColor,
                color: '#ffffff',
                border: `2px solid #ffffff`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
            }}
        >
            <IconComponent size={18} />
        </div>
    )

    return L.divIcon({
        html,
        className: '', // prevent default "leaflet-div-icon" styling
        iconSize: [32, 32],
        iconAnchor: [16, 32],     // bottom-center
        popupAnchor: [0, -28],
    })
}

// Markers for hotel-details page
export const MainHotelMarkerIcon = createLucideHotelMarkerIcon(Hotel, '#2563eb')    // blue
export const TransportMarkerIcon = createLucideMarkerIcon(MapPin, '#f97316')    // orange
export const PoiMarkerIcon = createLucideMarkerIcon(Landmark, '#22c55e')        // green
export const DiningMarkerIcon = createLucideMarkerIcon(Utensils, '#ef4444')   // red

// Markers for attraction-details page
export const HotelMarkerIcon = createLucideMarkerIcon(Hotel, '#2563eb')    // blue
export const MainAttractionMarkerIcon = createLucideAttractionMarkerIcon(Landmark, '#22c55e')   // green
export const AttractionMarkerIcon = createLucideMarkerIcon(Landmark, '#22c55e')   // green
export const RestaurantMarkerIcon = createLucideMarkerIcon(Utensils, '#ef4444')   // red
