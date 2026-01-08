import React, { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import {
    ArrowLeft,
    MapPin,
    Clock3,
    Ticket,
    Star,
    ArrowRight,
    BedDouble,
    UtensilsCrossed,
    Landmark,
    Navigation,
    Info,
    Contact,
    Phone,
    Globe,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { slugToTitle } from '@/lib/slugToTitle'
import SectionCard from '@/components/custom/SectionCard'
import PhotoCarousel from '@/components/custom/PhotoCarousel'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Safely convert rating (or any value) to a number
function toSafeNumber(value, fallback = null) {
    if (typeof value === 'number') return value
    const num = parseFloat(value)
    return Number.isFinite(num) ? num : fallback
}

/**
 * Data layer for attraction details.
 * Fetches real data from SerpAPI via backend, and operating hours from Overpass API.
 */
function useAttractionDetails(initialActivity, tripContext) {
    const [apiData, setApiData] = useState(null)
    const [osmData, setOsmData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const placeName = initialActivity?.PlaceName || initialActivity?.name || null
    const lat = initialActivity?.lat
    const lon = initialActivity?.lon

    // Fetch from SerpAPI
    useEffect(() => {
        if (!placeName) {
            setIsLoading(false)
            return
        }

        const controller = new AbortController()

        async function fetchPlaceDetails() {
            try {
                setIsLoading(true)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', placeName)
                params.set('hl', 'en')
                params.set('gl', 'vn')

                const res = await fetch(
                    `/api/serp/place/details?${params.toString()}`,
                    { signal: controller.signal }
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || `Request failed with status ${res.status}`)
                }

                const json = await res.json()
                setApiData(json)
            } catch (err) {
                if (err.name === 'AbortError') return
                console.error('Failed to load place details', err)
                setError(err.message || 'Failed to load place details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPlaceDetails()

        return () => controller.abort()
    }, [placeName])

    // Fetch operating hours from Overpass API (OpenStreetMap) using coordinates
    useEffect(() => {
        if (!lat || !lon) return

        const fetchOsmData = async () => {
            try {
                // Query for POIs near the coordinates that might be this attraction
                // Include opening_hours tag in the output
                const query = `
                    [out:json][timeout:15];
                    (
                        node["tourism"](around:100, ${lat}, ${lon});
                        node["amenity"](around:100, ${lat}, ${lon});
                        node["historic"](around:100, ${lat}, ${lon});
                        node["leisure"](around:100, ${lat}, ${lon});
                        way["tourism"](around:100, ${lat}, ${lon});
                        way["amenity"](around:100, ${lat}, ${lon});
                        way["historic"](around:100, ${lat}, ${lon});
                        way["leisure"](around:100, ${lat}, ${lon});
                    );
                    out body;
                `

                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: query
                })
                
                if (!response.ok) {
                    console.warn('Overpass API request failed')
                    return
                }

                const data = await response.json()
                
                // Find the best match - prefer one with opening_hours
                let bestMatch = null
                let matchWithHours = null
                
                for (const el of data.elements) {
                    if (!el.tags) continue
                    
                    // Check if name matches (fuzzy)
                    const osmName = el.tags['name:en'] || el.tags.name || ''
                    const searchName = placeName?.toLowerCase() || ''
                    const nameMatches = osmName.toLowerCase().includes(searchName) || 
                                       searchName.includes(osmName.toLowerCase())
                    
                    if (el.tags.opening_hours) {
                        if (nameMatches || !matchWithHours) {
                            matchWithHours = el
                        }
                    }
                    if (nameMatches && !bestMatch) {
                        bestMatch = el
                    }
                }

                const selectedMatch = matchWithHours || bestMatch
                
                if (selectedMatch?.tags) {
                    const tags = selectedMatch.tags
                    setOsmData({
                        openingHours: tags.opening_hours || null,
                        phone: tags.phone || tags['contact:phone'] || null,
                        website: tags.website || tags['contact:website'] || null,
                        wheelchair: tags.wheelchair || null,
                        fee: tags.fee || null,
                        wikidata: tags.wikidata || null,
                        description: tags.description || tags['description:en'] || null,
                    })
                }
            } catch (err) {
                console.warn('Failed to fetch OSM data:', err)
                // Don't set error - OSM is supplementary data
            }
        }

        fetchOsmData()
    }, [lat, lon, placeName])

    // Debug logging
    useEffect(() => {
        console.log('useAttractionDetails - apiData:', apiData)
        console.log('useAttractionDetails - osmData:', osmData)
    }, [apiData, osmData])

    // Parse OSM opening_hours format (e.g., "Mo-Fr 09:00-18:00; Sa 10:00-14:00")
    const parseOsmOpeningHours = (hoursStr) => {
        if (!hoursStr) return null
        
        // Common OSM opening_hours format patterns
        // Return as-is if it's a simple format, or parse if complex
        try {
            // Check for 24/7
            if (hoursStr.toLowerCase() === '24/7') {
                return { type: 'always', display: 'Open 24/7' }
            }
            
            // Check for "off" or closed
            if (hoursStr.toLowerCase() === 'off' || hoursStr.toLowerCase() === 'closed') {
                return { type: 'closed', display: 'Currently Closed' }
            }

            // Parse typical format: "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off"
            const parts = hoursStr.split(';').map(p => p.trim()).filter(Boolean)
            const schedule = []
            
            const dayMap = {
                'mo': 'Monday', 'tu': 'Tuesday', 'we': 'Wednesday',
                'th': 'Thursday', 'fr': 'Friday', 'sa': 'Saturday', 'su': 'Sunday',
                'ph': 'Public Holiday'
            }

            for (const part of parts) {
                // Match patterns like "Mo-Fr 09:00-18:00" or "Sa 10:00-14:00" or "Su off"
                const match = part.match(/^([A-Za-z,-]+)\s+(.+)$/i)
                if (match) {
                    const dayPart = match[1].toLowerCase()
                    const timePart = match[2]
                    
                    // Expand day ranges
                    let days = []
                    if (dayPart.includes('-')) {
                        const [start, end] = dayPart.split('-')
                        const dayOrder = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']
                        const startIdx = dayOrder.indexOf(start)
                        const endIdx = dayOrder.indexOf(end)
                        if (startIdx !== -1 && endIdx !== -1) {
                            for (let i = startIdx; i <= endIdx; i++) {
                                days.push(dayMap[dayOrder[i]])
                            }
                        }
                    } else if (dayPart.includes(',')) {
                        days = dayPart.split(',').map(d => dayMap[d.trim()] || d.trim())
                    } else {
                        days = [dayMap[dayPart] || dayPart]
                    }
                    
                    schedule.push({
                        days: days.filter(Boolean),
                        hours: timePart === 'off' ? 'Closed' : timePart
                    })
                }
            }

            if (schedule.length > 0) {
                return { type: 'schedule', schedule, raw: hoursStr }
            }

            // Fallback: return raw string
            return { type: 'raw', display: hoursStr }
        } catch (e) {
            return { type: 'raw', display: hoursStr }
        }
    }

    // Format operating hours from API
    const formatOperatingHours = (hours) => {
        if (!hours) return null
        if (typeof hours === 'string') return hours
        if (Array.isArray(hours)) {
            // Find today's hours or return first available
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
            const todayHours = hours.find(h => 
                h.day?.toLowerCase() === today.toLowerCase() ||
                h.name?.toLowerCase() === today.toLowerCase()
            )
            if (todayHours) {
                return todayHours.hours || todayHours.time || `${todayHours.open} - ${todayHours.close}`
            }
            // Return a summary
            return hours.map(h => `${h.day || h.name}: ${h.hours || h.time || 'N/A'}`).join(', ')
        }
        if (hours.open && hours.close) {
            return { open: hours.open, close: hours.close }
        }
        return null
    }

    // Build photos array
    const buildPhotos = () => {
        const photos = []
        if (initialActivity?.imageUrl) {
            photos.push(initialActivity.imageUrl)
        }
        if (apiData?.images && Array.isArray(apiData.images)) {
            apiData.images.forEach(url => {
                if (url && !photos.includes(url)) {
                    photos.push(url)
                }
            })
        }
        if (initialActivity?.Photos && Array.isArray(initialActivity.Photos)) {
            initialActivity.Photos.forEach(url => {
                if (url && !photos.includes(url)) {
                    photos.push(url)
                }
            })
        }
        if (photos.length === 0) {
            photos.push('/placeholder.jpg', '/landing2.jpg', '/landing3.jpg')
        }
        return photos
    }

    // Get operating hours - prefer OSM data (free), fallback to SerpAPI
    const getOperatingHours = () => {
        // First try OSM opening_hours
        if (osmData?.openingHours) {
            const parsed = parseOsmOpeningHours(osmData.openingHours)
            return parsed
        }
        // Then try SerpAPI data
        const serpHours = formatOperatingHours(apiData?.operatingHours)
        if (serpHours) {
            return { type: 'serp', display: serpHours }
        }
        // Finally try initial activity data
        if (initialActivity?.OperatingHours) {
            return { type: 'initial', display: initialActivity.OperatingHours }
        }
        return null
    }

    // Build attraction object from API + OSM + initial data
    const attraction = {
        PlaceName: initialActivity?.PlaceName || apiData?.title || null,
        PlaceDetails: apiData?.description || osmData?.description || initialActivity?.PlaceDetails || null,
        Address: apiData?.address || initialActivity?.Address || 'Address not available',
        OperatingHours: getOperatingHours(),
        RecommendedVisit: initialActivity?.RecommendedVisit || 'Visit duration varies based on your interests',
        Contacts: {
            phone: apiData?.phone || osmData?.phone || initialActivity?.Contacts?.phone || null,
            email: initialActivity?.Contacts?.email || null,
            website: apiData?.website || osmData?.website || initialActivity?.Contacts?.website || null,
        },
        Rating: apiData?.rating || initialActivity?.Rating || null,
        Photos: buildPhotos(),
        type: apiData?.type || initialActivity?.type || null,
        priceLevel: apiData?.priceLevel || null,
        gpsCoordinates: apiData?.gpsCoordinates || {
            latitude: initialActivity?.lat,
            longitude: initialActivity?.lon,
        },
        // Additional OSM data
        wheelchair: osmData?.wheelchair || null,
        fee: osmData?.fee || null,
        // Ticket/service info from API
        ticketInfo: apiData?.ticketInfo || null,
        serviceOptions: apiData?.serviceOptions || null,
    }

    // Build tickets array from multiple data sources
    const buildTickets = () => {
        const tickets = []
        
        // 1. From SerpAPI ticket info
        if (apiData?.ticketInfo) {
            const ti = apiData.ticketInfo
            
            // Ticket prices if available
            if (ti.ticketPrices) {
                if (Array.isArray(ti.ticketPrices)) {
                    ti.ticketPrices.forEach((tp, idx) => {
                        tickets.push({
                            id: `serp-ticket-${idx}`,
                            name: tp.name || tp.type || 'Ticket',
                            price: tp.price || tp.amount || 'Price varies',
                            description: tp.description || null,
                            details: tp.details || [],
                            source: 'Google',
                        })
                    })
                } else if (typeof ti.ticketPrices === 'object') {
                    Object.entries(ti.ticketPrices).forEach(([name, price], idx) => {
                        tickets.push({
                            id: `serp-ticket-${idx}`,
                            name: name,
                            price: price,
                            source: 'Google',
                        })
                    })
                }
            }
            
            // Entry fee
            if (ti.entryFee && tickets.length === 0) {
                tickets.push({
                    id: 'entry-fee',
                    name: 'Entry Fee',
                    price: ti.entryFee,
                    source: 'Google',
                })
            }

            // Price attributes
            if (ti.priceAttributes && ti.priceAttributes.length > 0) {
                ti.priceAttributes.forEach((attr, idx) => {
                    const attrName = typeof attr === 'string' ? attr : attr.name || attr
                    if (!tickets.some(t => t.name.toLowerCase().includes(attrName.toLowerCase()))) {
                        tickets.push({
                            id: `attr-${idx}`,
                            name: attrName,
                            price: null,
                            isAttribute: true,
                            source: 'Google',
                        })
                    }
                })
            }
        }

        // 2. From OSM fee data
        if (osmData?.fee) {
            const feeInfo = osmData.fee.toLowerCase()
            if (feeInfo === 'no' || feeInfo === 'free') {
                if (!tickets.some(t => t.name.toLowerCase().includes('free'))) {
                    tickets.push({
                        id: 'osm-free',
                        name: 'Admission',
                        price: 'Free',
                        description: 'Free entry to this attraction',
                        source: 'OpenStreetMap',
                    })
                }
            } else if (feeInfo === 'yes') {
                if (tickets.length === 0) {
                    tickets.push({
                        id: 'osm-paid',
                        name: 'Admission',
                        price: 'Paid entry',
                        description: 'This attraction requires paid admission',
                        source: 'OpenStreetMap',
                    })
                }
            } else {
                // Custom fee description
                tickets.push({
                    id: 'osm-fee',
                    name: 'Admission',
                    price: osmData.fee,
                    source: 'OpenStreetMap',
                })
            }
        }

        // 3. From initial activity/itinerary data
        if (initialActivity?.TicketPricing) {
            tickets.push({
                id: 'itinerary-ticket',
                name: 'Estimated Ticket Price',
                price: initialActivity.TicketPricing,
                description: 'Price estimate from your trip itinerary',
                source: 'Trip Itinerary',
            })
        }

        // 4. Price level indicator
        if (apiData?.priceLevel && tickets.length === 0) {
            tickets.push({
                id: 'price-level',
                name: 'Price Level',
                price: apiData.priceLevel,
                description: 'General price indicator',
                source: 'Google',
            })
        }

        // 5. Fallback if no ticket info found
        if (tickets.length === 0) {
            tickets.push({
                id: 'no-info',
                name: 'Ticket Information',
                price: 'Price varies',
                description: 'Check the official website for current pricing',
                details: [
                    'Pricing information not available',
                    'Visit official website for details',
                ],
                source: null,
            })
        }

        return tickets
    }

    const tickets = buildTickets()

    // Rating data
    const rating = apiData?.rating || attraction.Rating
    const ratingCount = apiData?.reviewsCount || initialActivity?.RatingCount || null
    
    // Rating breakdown - use API data or generate estimate based on rating
    let ratingBreakdown = apiData?.ratingBreakdown || {}
    if (Object.keys(ratingBreakdown).length === 0 && rating && ratingCount) {
        // Generate estimated breakdown based on overall rating
        const total = ratingCount
        const avgRating = parseFloat(rating)
        if (avgRating >= 4) {
            ratingBreakdown = {
                5: Math.round(total * 0.6),
                4: Math.round(total * 0.25),
                3: Math.round(total * 0.1),
                2: Math.round(total * 0.03),
                1: Math.round(total * 0.02),
            }
        } else if (avgRating >= 3) {
            ratingBreakdown = {
                5: Math.round(total * 0.3),
                4: Math.round(total * 0.35),
                3: Math.round(total * 0.2),
                2: Math.round(total * 0.1),
                1: Math.round(total * 0.05),
            }
        }
    }

    // Reviews - limit to 2 as requested
    const reviews = (apiData?.userReviews || []).slice(0, 2)

    return {
        attraction,
        tickets,
        rating,
        ratingCount,
        ratingBreakdown,
        reviews,
        isLoading,
        error,
    }
}

/**
 * Card: Operating Hours & Visiting Info
 */
function OperatingHoursCard({ attraction }) {
    const { OperatingHours, RecommendedVisit, wheelchair, fee } = attraction || {}

    // Determine the source of operating hours data
    const getOperatingHoursSource = () => {
        if (!OperatingHours) return null
        if (OperatingHours.type === 'schedule') return 'OpenStreetMap'
        if (OperatingHours.type === 'always' || OperatingHours.type === 'closed') return 'OpenStreetMap'
        if (OperatingHours.type === 'raw') return 'OpenStreetMap'
        if (OperatingHours.type === 'serp') return 'Google'
        if (OperatingHours.type === 'initial') return 'Trip Itinerary'
        return null
    }

    // Collect all data sources
    const collectSources = () => {
        const sources = new Set()
        const hoursSource = getOperatingHoursSource()
        if (hoursSource) sources.add(hoursSource)
        if (wheelchair) sources.add('OpenStreetMap')
        if (fee) sources.add('OpenStreetMap')
        // RecommendedVisit comes from Trip Itinerary
        if (RecommendedVisit && RecommendedVisit !== 'Visit duration varies based on your interests') {
            sources.add('Trip Itinerary')
        }
        return [...sources]
    }

    const sources = collectSources()
    const hasData = OperatingHours || wheelchair || fee || (RecommendedVisit && RecommendedVisit !== 'Visit duration varies based on your interests')

    // Render operating hours based on type
    const renderOperatingHours = () => {
        if (!OperatingHours) {
            return <span className='text-gray-400'>Operating hours not available</span>
        }

        // Handle different types of operating hours data
        if (OperatingHours.type === 'always') {
            return (
                <div>
                    <span className='text-green-600 font-medium'>{OperatingHours.display}</span>
                    <p className='text-[10px] text-gray-400 mt-1'>Source: OpenStreetMap</p>
                </div>
            )
        }

        if (OperatingHours.type === 'closed') {
            return (
                <div>
                    <span className='text-red-600 font-medium'>{OperatingHours.display}</span>
                    <p className='text-[10px] text-gray-400 mt-1'>Source: OpenStreetMap</p>
                </div>
            )
        }

        if (OperatingHours.type === 'schedule' && OperatingHours.schedule) {
            // Get today's day name
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
            
            return (
                <div className='space-y-1'>
                    {OperatingHours.schedule.map((item, idx) => {
                        const isToday = item.days.includes(today)
                        const daysStr = item.days.length > 2 
                            ? `${item.days[0]} - ${item.days[item.days.length - 1]}`
                            : item.days.join(', ')
                        
                        return (
                            <div 
                                key={idx} 
                                className={`flex justify-between ${isToday ? 'font-medium text-blue-600' : ''}`}
                            >
                                <span>{daysStr}{isToday && ' (Today)'}</span>
                                <span className={item.hours === 'Closed' ? 'text-red-500' : ''}>
                                    {item.hours}
                                </span>
                            </div>
                        )
                    })}
                    <p className='text-[10px] text-gray-400 mt-2'>Source: OpenStreetMap</p>
                </div>
            )
        }

        // Handle raw OSM format
        if (OperatingHours.type === 'raw' && OperatingHours.display) {
            return (
                <div>
                    <span>{OperatingHours.display}</span>
                    <p className='text-[10px] text-gray-400 mt-1'>Source: OpenStreetMap</p>
                </div>
            )
        }

        // Handle SerpAPI data
        if (OperatingHours.type === 'serp' && OperatingHours.display) {
            return (
                <div>
                    <span>{OperatingHours.display}</span>
                    <p className='text-[10px] text-gray-400 mt-1'>Source: Google</p>
                </div>
            )
        }

        // Handle initial/itinerary data
        if (OperatingHours.type === 'initial' && OperatingHours.display) {
            return (
                <div>
                    <span>{OperatingHours.display}</span>
                    <p className='text-[10px] text-gray-400 mt-1'>Source: Trip Itinerary</p>
                </div>
            )
        }

        // Handle simple display string
        if (OperatingHours.display) {
            return <span>{OperatingHours.display}</span>
        }

        // Fallback for legacy string format
        if (typeof OperatingHours === 'string') {
            return <span>{OperatingHours}</span>
        }

        if (OperatingHours.open && OperatingHours.close) {
            return <span>{OperatingHours.open} - {OperatingHours.close}</span>
        }

        return <span className='text-gray-400'>Operating hours not available</span>
    }

    return (
        <SectionCard
            title='Operating Hours & Visiting Info'
            subtitle={hasData && sources.length > 0
                ? `Information from ${sources.join(', ')}`
                : 'Plan your visit with these timing details.'
            }
        >
            <div className='grid md:grid-cols-2 gap-6 text-sm text-gray-700'>
                {/* Operating Hours */}
                <div className='flex items-start gap-2'>
                    <Clock3 className='h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0' />
                    <div className='flex-1'>
                        <div className='font-semibold mb-1'>Operating Time</div>
                        <div className='text-gray-700'>
                            {renderOperatingHours()}
                        </div>
                    </div>
                </div>

                {/* Visiting Recommendation */}
                <div className='flex items-start gap-2'>
                    <Info className='h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0' />
                    <div>
                        <div className='font-semibold mb-1'>Visiting Hours Recommendation</div>
                        <div className='text-gray-700'>
                            {RecommendedVisit || 'Visit duration varies based on your interests.'}
                        </div>
                        {RecommendedVisit && RecommendedVisit !== 'Visit duration varies based on your interests' && (
                            <p className='text-[10px] text-gray-400 mt-1'>Source: Trip Itinerary</p>
                        )}
                    </div>
                </div>

                {/* Accessibility - if available from OSM */}
                {wheelchair && (
                    <div className='flex items-start gap-2'>
                        <span className='text-gray-500 text-base mt-0.5'>♿</span>
                        <div>
                            <div className='font-semibold mb-1'>Accessibility</div>
                            <div className='text-gray-700 capitalize'>
                                {wheelchair === 'yes' ? 'Wheelchair accessible' : 
                                 wheelchair === 'limited' ? 'Limited wheelchair access' :
                                 wheelchair === 'no' ? 'Not wheelchair accessible' : wheelchair}
                            </div>
                            <p className='text-[10px] text-gray-400 mt-1'>Source: OpenStreetMap</p>
                        </div>
                    </div>
                )}

                {/* Admission Fee - if available from OSM */}
                {fee && (
                    <div className='flex items-start gap-2'>
                        <Ticket className='h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0' />
                        <div>
                            <div className='font-semibold mb-1'>Admission</div>
                            <div className='text-gray-700 capitalize'>
                                {fee === 'yes' ? 'Paid admission' : 
                                 fee === 'no' ? 'Free admission' : fee}
                            </div>
                            <p className='text-[10px] text-gray-400 mt-1'>Source: OpenStreetMap</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Helpful tip when limited data available */}
            {!hasData && (
                <p className='text-xs text-gray-500 pt-4 border-t border-gray-100 mt-4'>
                    💡 Tip: Operating hours may vary by season or holidays. 
                    Always verify on the official website before visiting.
                </p>
            )}
        </SectionCard>
    )
}

/**
 * Card: Description
 */
function AttractionDescriptionCard({ attraction }) {
    const description = attraction?.PlaceDetails || attraction?.description

    return (
        <SectionCard
            title='Attraction Description'
            subtitle='Overview, highlights and what to expect when visiting.'
        >
            <div className='text-sm text-gray-700 leading-relaxed space-y-3'>
                {description ? (
                    <p>{description}</p>
                ) : (
                    <p className='text-gray-400'>
                        Detailed description from Google / SerpAPI will be displayed here later.
                    </p>
                )}
            </div>
        </SectionCard>
    )
}

/**
 * Card: Tickets & Passes
 */
function TicketCard({ ticket }) {
    const priceColor = ticket.price?.toLowerCase() === 'free' 
        ? 'text-green-600' 
        : ticket.price?.toLowerCase().includes('paid') 
            ? 'text-orange-600'
            : 'text-blue-600'

    return (
        <div className='border rounded-lg p-4 flex flex-col gap-2 bg-gray-50'>
            <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                    <Ticket className='h-4 w-4 text-gray-500' />
                    <h4 className='font-semibold text-sm md:text-base'>
                        {ticket.name}
                    </h4>
                </div>
                {ticket.price && (
                    <div className={`text-sm font-semibold ${priceColor}`}>
                        {ticket.price}
                    </div>
                )}
            </div>
            {ticket.description && (
                <p className='text-xs text-gray-600'>
                    {ticket.description}
                </p>
            )}
            {Array.isArray(ticket.details) && ticket.details.length > 0 && (
                <ul className='text-xs text-gray-600 list-disc pl-5 space-y-1'>
                    {ticket.details.map((d, i) => (
                        <li key={i}>{d}</li>
                    ))}
                </ul>
            )}
            {ticket.source && (
                <p className='text-[10px] text-gray-400 mt-1'>
                    Source: {ticket.source}
                </p>
            )}
        </div>
    )
}

function TicketsPassesSection({ tickets, attraction }) {
    // Check if we have any real ticket data
    const hasRealData = tickets.some(t => t.source && t.source !== null)
    
    // Get unique sources
    const sources = [...new Set(tickets.filter(t => t.source).map(t => t.source))]

    if (!Array.isArray(tickets) || tickets.length === 0) {
        return null
    }

    return (
        <SectionCard
            title='Tickets & Admission'
            subtitle={hasRealData 
                ? `Pricing information from ${sources.join(', ')}`
                : 'Check official website for current pricing details.'
            }
        >
            <div className='space-y-3'>
                {tickets.map(t => (
                    <TicketCard key={t.id || t.name} ticket={t} />
                ))}
                
                {/* Booking link if available */}
                {attraction?.ticketInfo?.reservationLink && (
                    <a 
                        href={attraction.ticketInfo.reservationLink}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mt-2'
                    >
                        <Ticket className='h-4 w-4' />
                        Book tickets online
                    </a>
                )}

                {/* Website link for more info */}
                {attraction?.Contacts?.website && (
                    <div className='pt-2 border-t border-gray-200'>
                        <a 
                            href={attraction.Contacts.website}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-2 text-sm text-blue-600 hover:underline'
                        >
                            Visit official website for full pricing details →
                        </a>
                    </div>
                )}

                {!hasRealData && (
                    <p className='text-xs text-gray-500 pt-2'>
                        💡 Tip: Prices may vary by season, age group, and ticket type. 
                        Always verify on the official website before visiting.
                    </p>
                )}
            </div>
        </SectionCard>
    )
}

/**
 * Card: Reviews
 */
function AttractionReviewsSection({
    rating,
    ratingCount,
    ratingBreakdown,
    reviews,
}) {
    // Safe avg rating
    const avgRating = (() => {
        const num =
            typeof rating === 'number' ? rating : parseFloat(rating ?? '0')
        return Number.isFinite(num) ? num : 0
    })()

    // If caller doesn't give ratingCount, try reviews length, else 0
    const totalReviews =
        ratingCount ??
        (Array.isArray(reviews) ? reviews.length : 0) ??
        0

    // Normalize breakdown to a consistent shape
    const breakdown = {
        5: ratingBreakdown?.[5] ?? ratingBreakdown?.five ?? 0,
        4: ratingBreakdown?.[4] ?? ratingBreakdown?.four ?? 0,
        3: ratingBreakdown?.[3] ?? ratingBreakdown?.three ?? 0,
        2: ratingBreakdown?.[2] ?? ratingBreakdown?.two ?? 0,
        1: ratingBreakdown?.[1] ?? ratingBreakdown?.one ?? 0,
    }

    const totalForPercent =
        Object.values(breakdown).reduce(
            (sum, v) => sum + (typeof v === 'number' ? v : 0),
            0
        ) || 1

    const fallbackReviews = [
        {
            user: 'Traveler A',
            date: '2 days ago',
            rating: 5,
            text: 'Real user comments from Google / SerpAPI will appear here later.',
        },
        {
            user: 'Traveler B',
            date: '1 week ago',
            rating: 4,
            text: 'Nice attraction, can be busy at peak hours.',
        },
        {
            user: 'Traveler C',
            date: '2 weeks ago',
            rating: 4.5,
            text: 'Great atmosphere and views. Worth adding to your trip.',
        },
    ]

    const reviewList =
        Array.isArray(reviews) && reviews.length > 0 ? reviews : fallbackReviews

    const [visibleCount, setVisibleCount] = useState(2)

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + 3, reviewList.length))
    }

    const canLoadMore = visibleCount < reviewList.length

    return (
        <SectionCard
            title='Ratings & Reviews'
            subtitle='See how other travelers rated this attraction.'
        >
            <div className='grid md:grid-cols-2 gap-6'>
                {/* LEFT: summary + breakdown */}
                <div className='space-y-4'>
                    {/* Average rating */}
                    <div className='flex items-center gap-4'>
                        <div className='flex flex-col items-center justify-center'>
                            <div className='flex items-center gap-1 text-yellow-500'>
                                <span className='text-3xl font-bold'>
                                    {avgRating.toFixed(1)}
                                </span>
                                <Star className='h-5 w-5 fill-yellow-400' />
                            </div>
                            <p className='text-xs text-gray-500 mt-1'>
                                Based on {totalReviews} reviews
                            </p>
                        </div>
                    </div>

                    {/* Breakdown 1–5 stars */}
                    <div className='space-y-1'>
                        {[5, 4, 3, 2, 1].map(star => {
                            const count = breakdown[star] ?? 0
                            const percent = Math.round((count / totalForPercent) * 100)

                            return (
                                <div
                                    key={star}
                                    className='flex items-center gap-2 text-xs'
                                >
                                    <span className='w-6 text-right'>{star}★</span>
                                    <div className='flex-1 h-2 rounded-full bg-gray-200 overflow-hidden'>
                                        <div
                                            className='h-full bg-blue-500'
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className='w-10 text-right text-gray-500'>
                                        {percent}%
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* RIGHT: reviews list */}
                <div className='space-y-3 text-sm text-gray-700'>
                    {reviewList.slice(0, visibleCount).map((r, idx) => (
                        <div
                            key={`${r.user || 'Traveler'}-${idx}`}
                            className='border rounded-lg p-3 bg-gray-50'
                        >
                            <div className='flex items-center justify-between gap-2 mb-1'>
                                <div className='font-semibold text-sm'>
                                    {r.user || 'Traveler'}
                                </div>
                                <div className='flex items-center gap-1 text-xs text-yellow-500'>
                                    <Star className='h-3 w-3 fill-yellow-400' />
                                    <span>
                                        {typeof r.rating === 'number'
                                            ? r.rating.toFixed(1)
                                            : r.rating ?? '-'}
                                    </span>
                                </div>
                            </div>
                            <div className='text-[11px] text-gray-500 mb-1'>
                                {r.date || 'Recently'}
                            </div>
                            <p className='text-xs md:text-sm'>{r.text}</p>
                        </div>
                    ))}

                    {canLoadMore && (
                        <button
                            type='button'
                            onClick={handleLoadMore}
                            className='text-xs text-blue-600 hover:underline font-medium'
                        >
                            Load more comments
                        </button>
                    )}
                </div>
            </div>
        </SectionCard>
    )
}

function AttractionMapSection({ attraction }) {
    const mapContainerRef = useRef(null)
    const mapInstance = useRef(null)
    const markersRef = useRef([])
    const [allPlaces, setAllPlaces] = useState([])
    const [displayPlaces, setDisplayPlaces] = useState([])
    const [activeFilter, setActiveFilter] = useState('all')
    const [loadingPlaces, setLoadingPlaces] = useState(false)

    const hasCoordinates = attraction?.gpsCoordinates?.latitude && attraction?.gpsCoordinates?.longitude

    // Filter options - categories for nearby places
    const filterOptions = [
        { key: 'all', label: 'All', color: '#6B7280' },
        { key: 'transit', label: 'Transit', color: '#3B82F6' },
        { key: 'restaurant', label: 'Restaurant', color: '#F97316' },
        { key: 'convenience', label: 'Convenience Store', color: '#10B981' },
        { key: 'gas', label: 'Gas', color: '#EF4444' },
        { key: 'atm', label: 'ATM', color: '#8B5CF6' },
        { key: 'shopping', label: 'Shopping', color: '#EC4899' },
        { key: 'poi', label: 'POI', color: '#F59E0B' },
    ]

    // Initialize map
    useEffect(() => {
        if (!hasCoordinates || !mapContainerRef.current || mapInstance.current) return

        const { latitude, longitude } = attraction.gpsCoordinates

        // Create map instance
        mapInstance.current = L.map(mapContainerRef.current).setView([latitude, longitude], 15)

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance.current)

        // Create custom attraction marker icon
        const attractionIcon = L.divIcon({
            className: 'custom-attraction-marker',
            html: `<div style="
                background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
                color: white;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">📍</div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22]
        })

        // Add attraction marker
        L.marker([latitude, longitude], { icon: attractionIcon })
            .addTo(mapInstance.current)

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [hasCoordinates, attraction?.gpsCoordinates?.latitude, attraction?.gpsCoordinates?.longitude])

    // Fetch nearby places using Overpass API
    useEffect(() => {
        if (!hasCoordinates) return

        const { latitude, longitude } = attraction.gpsCoordinates

        // Helper to calculate distance between two coordinates
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371e3 // Earth's radius in metres
            const φ1 = lat1 * Math.PI / 180
            const φ2 = lat2 * Math.PI / 180
            const Δφ = (lat2 - lat1) * Math.PI / 180
            const Δλ = (lon2 - lon1) * Math.PI / 180

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return Math.round(R * c)
        }

        // Format distance for display
        const formatDistance = (meters) => {
            if (meters >= 1000) {
                return `${(meters / 1000).toFixed(1)} km`
            }
            return `${meters} m`
        }

        const fetchNearbyPlaces = async () => {
            setLoadingPlaces(true)
            try {
                const query = `
                    [out:json][timeout:25];
                    (
                        // Transit
                        node["highway"="bus_stop"](around:1000, ${latitude}, ${longitude});
                        node["public_transport"="platform"](around:1000, ${latitude}, ${longitude});
                        node["railway"="station"](around:1000, ${latitude}, ${longitude});
                        node["railway"="subway_entrance"](around:1000, ${latitude}, ${longitude});
                        // Restaurants & Cafes
                        node["amenity"="restaurant"](around:1000, ${latitude}, ${longitude});
                        node["amenity"="cafe"](around:1000, ${latitude}, ${longitude});
                        node["amenity"="fast_food"](around:1000, ${latitude}, ${longitude});
                        // Convenience stores
                        node["shop"="convenience"](around:1000, ${latitude}, ${longitude});
                        node["shop"="supermarket"](around:1000, ${latitude}, ${longitude});
                        // Gas stations
                        node["amenity"="fuel"](around:1000, ${latitude}, ${longitude});
                        // ATM & Banks
                        node["amenity"="atm"](around:1000, ${latitude}, ${longitude});
                        node["amenity"="bank"](around:1000, ${latitude}, ${longitude});
                        // Shopping
                        node["shop"="mall"](around:1000, ${latitude}, ${longitude});
                        node["shop"="department_store"](around:1000, ${latitude}, ${longitude});
                        // POI / Attractions
                        node["tourism"~"attraction|museum|viewpoint|artwork"](around:1000, ${latitude}, ${longitude});
                        node["historic"](around:1000, ${latitude}, ${longitude});
                        node["leisure"="park"](around:1000, ${latitude}, ${longitude});
                        node["amenity"="place_of_worship"](around:1000, ${latitude}, ${longitude});
                    );
                    out body;
                `

                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: query
                })
                const data = await response.json()

                const places = []
                const seenNames = new Set()

                data.elements.forEach(el => {
                    const name = el.tags?.['name:en'] || el.tags?.name
                    if (!name) return

                    const nameKey = name.toLowerCase()
                    if (seenNames.has(nameKey)) return
                    seenNames.add(nameKey)

                    const distanceMeters = calculateDistance(latitude, longitude, el.lat, el.lon)
                    if (distanceMeters > 1000) return

                    let category, icon, color, displayType

                    if (el.tags.highway === 'bus_stop' || el.tags.public_transport === 'platform') {
                        category = 'transit'
                        icon = '🚌'
                        color = '#3B82F6'
                        displayType = 'Bus Stop'
                    } else if (el.tags.railway === 'station' || el.tags.railway === 'subway_entrance') {
                        category = 'transit'
                        icon = '🚇'
                        color = '#3B82F6'
                        displayType = 'Station'
                    } else if (el.tags.amenity === 'restaurant') {
                        category = 'restaurant'
                        icon = '🍽️'
                        color = '#F97316'
                        displayType = 'Restaurant'
                    } else if (el.tags.amenity === 'cafe') {
                        category = 'restaurant'
                        icon = '☕'
                        color = '#F97316'
                        displayType = 'Cafe'
                    } else if (el.tags.amenity === 'fast_food') {
                        category = 'restaurant'
                        icon = '🍔'
                        color = '#F97316'
                        displayType = 'Fast Food'
                    } else if (el.tags.shop === 'convenience' || el.tags.shop === 'supermarket') {
                        category = 'convenience'
                        icon = '🏪'
                        color = '#10B981'
                        displayType = el.tags.shop === 'supermarket' ? 'Supermarket' : 'Convenience Store'
                    } else if (el.tags.amenity === 'fuel') {
                        category = 'gas'
                        icon = '⛽'
                        color = '#EF4444'
                        displayType = 'Gas Station'
                    } else if (el.tags.amenity === 'atm') {
                        category = 'atm'
                        icon = '🏧'
                        color = '#8B5CF6'
                        displayType = 'ATM'
                    } else if (el.tags.amenity === 'bank') {
                        category = 'atm'
                        icon = '🏦'
                        color = '#8B5CF6'
                        displayType = 'Bank'
                    } else if (el.tags.shop === 'mall' || el.tags.shop === 'department_store') {
                        category = 'shopping'
                        icon = '🛍️'
                        color = '#EC4899'
                        displayType = 'Shopping'
                    } else if (el.tags.tourism || el.tags.historic || el.tags.leisure === 'park' || el.tags.amenity === 'place_of_worship') {
                        category = 'poi'
                        icon = '📍'
                        color = '#F59E0B'
                        if (el.tags.tourism === 'museum') {
                            icon = '🏛️'
                            displayType = 'Museum'
                        } else if (el.tags.leisure === 'park') {
                            icon = '🌳'
                            displayType = 'Park'
                        } else if (el.tags.amenity === 'place_of_worship') {
                            icon = '⛩️'
                            displayType = 'Temple/Shrine'
                        } else if (el.tags.historic) {
                            icon = '🏛️'
                            displayType = 'Historic Site'
                        } else {
                            displayType = 'Attraction'
                        }
                    } else {
                        return
                    }

                    places.push({
                        name,
                        type: displayType,
                        distance: formatDistance(distanceMeters),
                        distanceMeters,
                        lat: el.lat,
                        lng: el.lon,
                        icon,
                        color,
                        category,
                    })
                })

                places.sort((a, b) => a.distanceMeters - b.distanceMeters)

                const limitedPlaces = []
                const categoryCount = {}
                const maxPerCategory = 5

                places.forEach(place => {
                    categoryCount[place.category] = (categoryCount[place.category] || 0) + 1
                    if (categoryCount[place.category] <= maxPerCategory) {
                        limitedPlaces.push(place)
                    }
                })

                setAllPlaces(limitedPlaces)
            } catch (error) {
                console.error('Error fetching nearby places from Overpass API:', error)
                setAllPlaces([])
            } finally {
                setLoadingPlaces(false)
            }
        }

        fetchNearbyPlaces()
    }, [hasCoordinates, attraction?.gpsCoordinates?.latitude, attraction?.gpsCoordinates?.longitude])

    // Filter places and update markers when filter changes
    useEffect(() => {
        if (!mapInstance.current || allPlaces.length === 0) return

        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        const filteredPlaces = activeFilter === 'all' 
            ? allPlaces 
            : allPlaces.filter(place => place.category === activeFilter)

        setDisplayPlaces(filteredPlaces)

        filteredPlaces.forEach(place => {
            const placeIcon = L.divIcon({
                className: 'custom-place-marker',
                html: `<div style="
                    background-color: ${place.color};
                    color: white;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    border: 2px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                ">${place.icon}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            })

            const marker = L.marker([place.lat, place.lng], { icon: placeIcon })
                .addTo(mapInstance.current)
                .bindPopup(`
                    <div style="min-width: 150px;">
                        <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">${place.name}</h4>
                        <p style="margin: 0; font-size: 11px; color: #666; text-transform: capitalize;">${place.type}</p>
                        ${place.distance ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">📍 ${place.distance}</p>` : ''}
                    </div>
                `)

            markersRef.current.push(marker)
        })
    }, [allPlaces, activeFilter])

    return (
        <SectionCard
            id='attraction-map'
            title='Location & Nearby Places'
            subtitle='Real-time data from OpenStreetMap'
        >
            <div className='space-y-4'>
                {/* Loading indicator */}
                {loadingPlaces && (
                    <div className='flex items-center gap-2 text-sm text-blue-600'>
                        <svg className='animate-spin h-4 w-4' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                        Loading nearby places...
                    </div>
                )}

                {/* Filter buttons */}
                <div className='flex flex-wrap gap-2'>
                    {filterOptions.map(option => (
                        <button
                            key={option.key}
                            onClick={() => setActiveFilter(option.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                activeFilter === option.key
                                    ? 'text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={activeFilter === option.key ? { backgroundColor: option.color } : {}}
                        >
                            <span 
                                className='h-2 w-2 rounded-full'
                                style={{ backgroundColor: activeFilter === option.key ? 'white' : option.color }}
                            />
                            {option.label}
                            {option.key !== 'all' && (
                                <span className={`text-xs ${activeFilter === option.key ? 'text-white/80' : 'text-gray-400'}`}>
                                    ({allPlaces.filter(p => p.category === option.key).length})
                                </span>
                            )}
                            {option.key === 'all' && (
                                <span className={`text-xs ${activeFilter === option.key ? 'text-white/80' : 'text-gray-400'}`}>
                                    ({allPlaces.length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Map container */}
                {hasCoordinates ? (
                    <div 
                        ref={mapContainerRef} 
                        className='w-full h-80 md:h-96 rounded-lg border overflow-hidden z-0'
                        style={{ position: 'relative' }}
                    />
                ) : (
                    <div className='w-full h-80 md:h-96 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-sm'>
                        <div className='text-center'>
                            <MapPin className='h-8 w-8 mx-auto mb-2 opacity-50' />
                            <p>Location coordinates not available for this attraction.</p>
                        </div>
                    </div>
                )}

                {/* Nearby places list */}
                {displayPlaces.length > 0 && (
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                        {displayPlaces.map((place, idx) => (
                            <div 
                                key={idx}
                                className='flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-sm'
                                onClick={() => {
                                    if (mapInstance.current) {
                                        mapInstance.current.setView([place.lat, place.lng], 17)
                                        markersRef.current[idx]?.openPopup()
                                    }
                                }}
                            >
                                <span 
                                    className='w-7 h-7 rounded-full flex items-center justify-center text-white text-xs'
                                    style={{ backgroundColor: place.color }}
                                >
                                    {place.icon}
                                </span>
                                <div className='flex-1 min-w-0'>
                                    <p className='font-medium text-gray-800 truncate'>{place.name}</p>
                                    <p className='text-xs text-gray-500 capitalize'>
                                        {place.type}
                                        {place.distance && ` • ${place.distance}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SectionCard>
    )
}

/**
 * MAIN PAGE - Manual Attraction Details
 * For manual trip creation flow
 */
export default function ManualAttractionDetailsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { slug } = useParams() 
    const activityFromState = location.state?.activity || null
    const tripContext = location.state?.tripContext || null
    const returnTo = location.state?.returnTo || '/create-trip'

    const {
        attraction,
        tickets,
        rating,
        ratingCount,
        ratingBreakdown,
        reviews,
        isLoading,
        error,
    } = useAttractionDetails(activityFromState, tripContext)

    // Debug logging
    useEffect(() => {
        console.log('ManualAttractionDetailsPage - activityFromState:', activityFromState)
        console.log('ManualAttractionDetailsPage - tripContext:', tripContext)
        console.log('ManualAttractionDetailsPage - attraction:', attraction)
        console.log('ManualAttractionDetailsPage - isLoading:', isLoading)
        console.log('ManualAttractionDetailsPage - error:', error)
    }, [activityFromState, tripContext, attraction, isLoading, error])

    const fallbackAttractionName = slugToTitle(slug) || 'attraction'
    const displayAttractionName = attraction.PlaceName || fallbackAttractionName

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [location.pathname])

    const scrollToMap = () => {
        const el = document.getElementById('attraction-map')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    if (error) {
        return (
            <div className='p-6 md:px-20 lg:px-40'>
                <Button
                    variant='outline'
                    onClick={() => navigate(returnTo)}
                    className='mb-4 flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back
                </Button>
                <p className='text-red-500 text-sm'>Failed to load attraction details: {error}</p>
            </div>
        )
    }

    // Show basic info while loading API data (don't block the whole page)
    // Only show full loading screen if we don't have any activity info at all
    if (isLoading && !activityFromState) {
        return (
            <div className='p-6 mx-auto md:px-20 lg:w-7xl'>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate(returnTo)}
                    className='mb-4 flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
                <p className='text-gray-500 text-sm'>Loading attraction details...</p>
            </div>
        )
    }

    const ratingNumber = toSafeNumber(attraction?.Rating, null)
    const reviewCount = toSafeNumber(ratingCount, null)

    return (
        <div className='p-6 mx-auto md:px-20 lg:w-7xl space-y-6'>
            {/* Back button */}
            <div>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate(returnTo)}
                    className='flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
            </div>

            {/* Header + photos + description (merged like hotel) */}
            <SectionCard header={false} className='space-y-5'>
                {/* Name, type/category and rating at top, above photos */}
                <div className='space-y-1'>
                    <h1 className='text-2xl md:text-3xl font-bold flex items-center gap-2'>
                        {displayAttractionName}
                        {ratingNumber && (
                            <span className='inline-flex items-center gap-1 text-sm font-normal'>
                                <Star className='h-4 w-4 md:h-5 md:w-5 fill-yellow-400 text-yellow-400' />
                                <span className='text-gray-700'>{ratingNumber.toFixed(1)}</span>
                                {reviewCount && (
                                    <span className='text-gray-400'>({reviewCount.toLocaleString()} reviews)</span>
                                )}
                            </span>
                        )}
                    </h1>
                    {/* Type/Category with icon */}
                    {attraction?.type && (
                        <div className='flex items-center gap-2 text-sm text-gray-600'>
                            <Landmark className='h-4 w-4 text-gray-500' />
                            <span>{attraction.type}</span>
                        </div>
                    )}
                </div>

                <PhotoCarousel photos={attraction?.Photos} altPrefix='Attraction photo' />

                {/* Description section merged into header (like hotel) */}
                <div className='bg-gray-50 rounded-lg p-4 md:p-6 space-y-4'>
                    {/* Location row */}
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                        <div className='flex items-start gap-2'>
                            <MapPin className='h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5' />
                            <span className='text-sm md:text-base text-gray-700'>
                                {attraction?.Address || 'Address not available'}
                            </span>
                        </div>
                        {attraction?.gpsCoordinates && (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${attraction.gpsCoordinates.latitude},${attraction.gpsCoordinates.longitude}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline cursor-pointer'
                            >
                                <Navigation className='h-4 w-4' />
                                View on Google Maps
                            </a>
                        )}
                    </div>

                    {/* Contact info row */}
                    <div className='flex flex-wrap gap-4 text-sm'>
                        {attraction?.Contacts?.phone && (
                            <div className='flex items-center gap-2'>
                                <Phone className='h-4 w-4 text-gray-500' />
                                <span className='text-gray-500'>Phone:</span>
                                <span className='text-gray-700'>{attraction.Contacts.phone}</span>
                            </div>
                        )}
                        {attraction?.Contacts?.website && (
                            <a 
                                href={attraction.Contacts.website} 
                                target='_blank' 
                                rel='noopener noreferrer'
                                className='flex items-center gap-2 text-blue-600 hover:underline'
                            >
                                <Globe className='h-4 w-4' />
                                <span>Website</span>
                            </a>
                        )}
                    </div>

                    {/* Description */}
                    {(attraction?.PlaceDetails || attraction?.description) && (
                        <div className='space-y-2 text-sm text-gray-700 leading-relaxed pt-2 border-t border-gray-200'>
                            <p>{attraction?.PlaceDetails || attraction?.description}</p>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Operating Hours - separate section */}
            <OperatingHoursCard attraction={attraction} />

            <TicketsPassesSection tickets={tickets} attraction={attraction} />

            <AttractionReviewsSection
                rating={rating}
                ratingCount={ratingCount}
                ratingBreakdown={ratingBreakdown}
                reviews={reviews}
            />

            <AttractionMapSection attraction={attraction} />
        </div>
    )
}
