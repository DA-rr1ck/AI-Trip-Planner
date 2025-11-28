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
    Navigation2,
    Info,
    Contact,
} from 'lucide-react'

import { slugToTitle } from '@/lib/slugToTitle'
import SectionCard from '@/components/custom/SectionCard'
import PhotoCarousel from '@/components/custom/PhotoCarousel'

/**
 * Data layer for attraction details.
 * Fetches real data from SerpAPI via backend.
 */
function useAttractionDetails(initialActivity, tripContext) {
    const [apiData, setApiData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const placeName = initialActivity?.PlaceName || initialActivity?.name || null

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

    // Debug logging
    useEffect(() => {
        console.log('useAttractionDetails - apiData:', apiData)
    }, [apiData])

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

    // Build attraction object from API + initial data
    const attraction = {
        PlaceName: initialActivity?.PlaceName || apiData?.title || null,
        PlaceDetails: apiData?.description || initialActivity?.PlaceDetails || null,
        Address: apiData?.address || initialActivity?.Address || 'Address not available',
        OperatingHours: formatOperatingHours(apiData?.operatingHours) || initialActivity?.OperatingHours || null,
        RecommendedVisit: initialActivity?.RecommendedVisit || 'Visit duration varies based on your interests',
        Contacts: {
            phone: apiData?.phone || initialActivity?.Contacts?.phone || null,
            email: initialActivity?.Contacts?.email || null,
            website: apiData?.website || initialActivity?.Contacts?.website || null,
        },
        Rating: apiData?.rating || initialActivity?.Rating || null,
        Photos: buildPhotos(),
        type: apiData?.type || initialActivity?.type || null,
        priceLevel: apiData?.priceLevel || null,
        gpsCoordinates: apiData?.gpsCoordinates || {
            latitude: initialActivity?.lat,
            longitude: initialActivity?.lon,
        },
    }

    // Tickets - use from initial activity if available, otherwise placeholder
    const placeholderTickets = [
        {
            id: 'general',
            name: 'General Admission',
            price: apiData?.priceLevel || 'Price varies',
            description: 'Standard entry ticket for one adult.',
            details: [
                'Valid for 1 day',
                'Check official website for current pricing',
            ],
        },
    ]

    const activityTickets = []
    if (initialActivity?.TicketPricing) {
        activityTickets.push({
            id: 'itinerary-ticket',
            name: 'Estimated Ticket Price',
            price: initialActivity.TicketPricing,
            description: 'Price estimate from your trip itinerary.',
            details: [
                'Price is indicative',
                'Verify on official website',
            ],
        })
    }

    const tickets = activityTickets.length > 0 ? activityTickets : placeholderTickets

    // Nearby places - keep as placeholder for now
    const nearby = {
        hotels: [],
        attractions: [],
        restaurants: [],
    }

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
        nearby,
        rating,
        ratingCount,
        ratingBreakdown,
        reviews,
        isLoading,
        error,
    }
}

/**
 * Card: Attraction Information
 */
function AttractionInfoCard({ attraction, onScrollToMap }) {
    const { OperatingHours, RecommendedVisit, Address, Contacts } = attraction || {}

    const formatHours = (hours) => {
        if (!hours) return 'N/A'
        if (typeof hours === 'string') return hours
        if (hours.open && hours.close) return `${hours.open} - ${hours.close}`
        return 'N/A'
    }

    return (
        <div className='space-y-4 text-sm text-gray-700'>
            <div className='grid md:grid-cols-2 gap-4'>
                <div className='flex items-start gap-2'>
                    <Clock3 className='h-4 w-4 mt-0.5 text-gray-500' />
                    <div>
                        <div className='font-semibold'>Operating Time</div>
                        <div className='text-gray-700'>
                            {formatHours(OperatingHours)}
                        </div>
                    </div>
                </div>

                <div className='flex items-start gap-2'>
                    <MapPin className='h-5 w-5 md:h-4 md:w-4 mt-0.5 text-gray-500' />
                    <div className='space-y-1'>
                        <div className='font-semibold'>Address</div>
                        <div className='flex flex-col md:flex-row md:items-center text-gray-600 mt-1'>
                            <p className='text-gray-700'>
                                {Address || 'The full address will be loaded from Google / SerpAPI'}
                            </p>

                            <span
                                onClick={onScrollToMap}
                                className='md:pl-1 text-blue-600 hover:underline cursor-pointer'
                            >
                                View on map
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className='grid md:grid-cols-2 gap-4'>
                <div className='flex items-start gap-2'>
                    <Info className='h-4 w-4 mt-0.5 text-gray-500' />
                    <div>
                        <div className='font-semibold'>Visiting Hours Recommendation</div>
                        <div className='text-gray-700'>
                            {RecommendedVisit || 'Recommended visit duration will be loaded from the APIs.'}
                        </div>
                    </div>
                </div>

                <div className='flex items-start gap-2'>
                    <Contact className='h-4 w-4 mt-0.5 text-gray-500' />
                    <div className='space-y-2'>
                        <div className='font-semibold'>Contacts</div>
                        <div className='space-y-1'>
                            <div className='flex flex-wrap gap-2'>
                                <span className='font-medium'>Phone:</span>
                                <span className={Contacts?.phone ? 'text-gray-700' : 'text-gray-400'}>
                                    {Contacts?.phone || 'N/A'}
                                </span>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <span className='font-medium'>Email:</span>
                                <span className={Contacts?.email ? 'text-gray-700' : 'text-gray-400'}>
                                    {Contacts?.email || 'N/A'}
                                </span>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <span className='font-medium'>Website:</span>
                                <span className={Contacts?.website ? 'text-gray-700' : 'text-gray-400'}>
                                    {Contacts?.website || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    return (
        <div className='border rounded-lg p-4 flex flex-col gap-2 bg-gray-50'>
            <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                    <Ticket className='h-4 w-4 text-gray-500' />
                    <h4 className='font-semibold text-sm md:text-base'>
                        {ticket.name}
                    </h4>
                </div>
                <div className='text-sm font-semibold text-blue-600'>
                    {ticket.price}
                </div>
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
        </div>
    )
}

function TicketsPassesSection({ tickets }) {
    if (!Array.isArray(tickets) || tickets.length === 0) {
        // If no tickets, do not render this card at all
        return null
    }

    return (
        <SectionCard
            title='Tickets & Passes'
            subtitle='Indicative ticket types and prices. Real data will be fetched from official sources later.'
        >
            <div className='space-y-3'>
                {tickets.map(t => (
                    <TicketCard key={t.id || t.name} ticket={t} />
                ))}
                <p className='text-xs text-gray-500'>
                    Note: All prices and ticket types shown here are placeholders and will be replaced with
                    live data from your backend and APIs.
                </p>
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

/**
 * Card: Map + Nearby
 */
function NearbyPlaceItem({ place, type, onClick }) {
    const Icon =
        type === 'hotel'
            ? BedDouble
            : type === 'restaurant'
                ? UtensilsCrossed
                : Landmark

    const label =
        type === 'hotel'
            ? 'Hotel'
            : type === 'restaurant'
                ? 'Restaurant'
                : 'Attraction'

    return (
        <button
            type='button'
            onClick={() => onClick(place)}
            className='w-full text-left flex gap-3 p-2 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm'
        >
            <div className='w-16 h-16 rounded-md overflow-hidden bg-gray-200 flex-shrink-0'>
                <img
                    src={place.photo || '/placeholder.jpg'}
                    alt={place.name}
                    className='w-full h-full object-cover'
                />
            </div>
            <div className='flex-1'>
                <div className='flex items-center justify-between gap-2'>
                    <h4 className='font-semibold text-gray-800 truncate'>
                        {place.name}
                    </h4>
                    {place.distance && (
                        <span className='text-xs text-gray-500 whitespace-nowrap'>
                            {place.distance}
                        </span>
                    )}
                </div>
                <div className='flex items-center gap-1 text-xs text-gray-500 mt-1'>
                    <Icon className='h-3 w-3' />
                    <span>{label}</span>
                </div>
                <div className='mt-1 flex items-center gap-1 text-[11px] text-blue-600'>
                    <ArrowRight className='h-3 w-3' />
                    <span>
                        {type === 'restaurant'
                            ? 'Show route from attraction'
                            : 'Open details in new tab'}
                    </span>
                </div>
            </div>
        </button>
    )
}

function AttractionMapSection({
    mapRef,
    nearby,
    onOpenHotel,
    onOpenAttraction,
    onFocusRestaurantRoute,
}) {
    const [activeFilter, setActiveFilter] = useState('all') // all | hotels | attractions | restaurants

    const hotels = nearby?.hotels || []
    const attractions = nearby?.attractions || []
    const restaurants = nearby?.restaurants || []

    const filteredList = (() => {
        if (activeFilter === 'hotels') return hotels.map(p => ({ ...p, _type: 'hotel' }))
        if (activeFilter === 'attractions') return attractions.map(p => ({ ...p, _type: 'attraction' }))
        if (activeFilter === 'restaurants') return restaurants.map(p => ({ ...p, _type: 'restaurant' }))
        return [
            ...hotels.map(p => ({ ...p, _type: 'hotel' })),
            ...attractions.map(p => ({ ...p, _type: 'attraction' })),
            ...restaurants.map(p => ({ ...p, _type: 'restaurant' })),
        ]
    })()

    const handleClickPlace = (place) => {
        if (place._type === 'hotel') {
            onOpenHotel?.(place)
            return
        }
        if (place._type === 'attraction') {
            onOpenAttraction?.(place)
            return
        }
        if (place._type === 'restaurant') {
            onFocusRestaurantRoute?.(place)
            return
        }
    }

    const filterBtnClass = (key) =>
        `px-3 py-1 rounded-full flex flex-row items-center text-sm border ${activeFilter === key
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`

    return (
        <SectionCard
            id='attraction-map'
            title='Location & Nearby Places'
            subtitle='Google Map of the attraction with filters for nearby hotels, restaurants and other attractions.'
            rightSlot={
                <div className='hidden md:flex gap-2 text-xs text-gray-500'>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-blue-500' /> Hotels
                    </span>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-green-500' /> Attractions
                    </span>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-pink-500' /> Restaurants
                    </span>
                </div>
            }
        >
            <div className='grid md:grid-cols-2 gap-4'>
                {/* LEFT: Map + filter buttons overlay */}
                <div className='space-y-3'>
                    <div className='relative w-full h-72 md:h-80 rounded-lg border bg-gray-100 overflow-hidden'>
                        {/* Filter buttons (custom buttons on the map) */}
                        <div className='absolute top-3 left-3 flex flex-wrap gap-2 z-10'>
                            <button
                                type='button'
                                className={filterBtnClass('all')}
                                onClick={() => setActiveFilter('all')}
                            >
                                All
                            </button>
                            <button
                                type='button'
                                className={filterBtnClass('hotels')}
                                onClick={() => setActiveFilter('hotels')}
                            >
                                <BedDouble className='h-3 w-3 mr-1' />
                                Hotels
                            </button>
                            <button
                                type='button'
                                className={filterBtnClass('attractions')}
                                onClick={() => setActiveFilter('attractions')}
                            >
                                <Landmark className='h-3 w-3 mr-1' />
                                Attractions
                            </button>
                            <button
                                type='button'
                                className={filterBtnClass('restaurants')}
                                onClick={() => setActiveFilter('restaurants')}
                            >
                                <UtensilsCrossed className='h-3 w-3 mr-1' />
                                Restaurants
                            </button>
                        </div>

                        {/* Map container */}
                        <div
                            ref={mapRef}
                            className='w-full h-full flex items-center justify-center text-center text-xs text-gray-400 px-6'
                        >
                            {/* TODO: Replace this with actual Google Maps JS API + Directions.
                  Use the `mapRef` and `activeFilter` / selected place to control markers & routes. */}
                            Google Map will be rendered here with the attraction marker, nearby
                            places and routes when a restaurant is selected.
                        </div>
                    </div>

                    <div className='text-xs text-gray-500'>
                        When you click a restaurant in the list, a route from the attraction to that
                        restaurant will be drawn on the map (using Google Directions API). Clicking on
                        nearby hotels or attractions will open their detailed pages in a new tab.
                    </div>
                </div>

                {/* RIGHT: Nearby list */}
                <div className='space-y-3'>
                    <h4 className='font-semibold text-sm text-gray-800'>
                        Nearby Places
                    </h4>

                    {filteredList.length === 0 ? (
                        <p className='text-sm text-gray-400'>
                            Nearby hotels, attractions and restaurants will be displayed here after integrating
                            Google Places / SerpAPI.
                        </p>
                    ) : (
                        <div className='space-y-2 max-h-80 overflow-auto pr-1'>
                            {filteredList.map((place, idx) => (
                                <NearbyPlaceItem
                                    key={place.id || `${place._type}-${idx}`}
                                    place={place}
                                    type={place._type}
                                    onClick={handleClickPlace}
                                />
                            ))}
                        </div>
                    )}
                </div>
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

    const mapRef = useRef(null)

    const {
        attraction,
        tickets,
        nearby,
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

    const handleSelectAttractionForTrip = () => {
        // TODO: implement logic:
        // - navigate back to EditTrip with selected hotel info in state
        console.log('Use attraction in trip (placeholder)', {
            activityFromState,
            tripContext,
        })
    }

    const handleOpenHotel = (hotel) => {
        const slug = encodeURIComponent(hotel.name || 'hotel')
        window.open(`/manual/hotel/${slug}`, '_blank')
        console.log('Open nearby hotel in new tab (placeholder)', { hotel, tripContext })
    }

    const handleOpenAttraction = (place) => {
        const slug = encodeURIComponent(place.name || 'attraction')
        window.open(`/manual/attraction/${slug}`, '_blank')
        console.log('Open nearby attraction in new tab (placeholder)', { place, tripContext })
    }

    const handleFocusRestaurantRoute = (restaurant) => {
        // Later: use mapRef + Directions API to draw route
        console.log('Highlight route from attraction to restaurant on map (placeholder)', {
            restaurant,
            attraction,
        })
    }

    if (error) {
        return (
            <div className='p-6 md:px-20 lg:px-40'>
                <Button
                    variant='outline'
                    onClick={() => navigate(-1)}
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
                    onClick={() => navigate(-1)}
                    className='mb-4 flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
                <p className='text-gray-500 text-sm'>Loading attraction details...</p>
            </div>
        )
    }

    const ratingNumber = (() => {
        const raw = attraction?.Rating
        const num = typeof raw === 'number' ? raw : parseFloat(raw ?? '0')
        return Number.isFinite(num) ? num : null
    })()

    return (
        <div className='p-6 mx-auto md:px-20 lg:w-7xl space-y-6'>
            {/* Back button */}
            <div>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate(-1)}
                    className='flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
            </div>

            {/* Header + photos */}
            <SectionCard header={false} className='space-y-5'>
                <PhotoCarousel photos={attraction?.Photos} altPrefix='Attraction photo' />

                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                    <div>
                        <h1 className='text-2xl md:text-3xl font-bold flex items-center gap-2'>
                            {displayAttractionName}
                            {ratingNumber && (
                                <span className='inline-flex items-center gap-1 text-sm text-yellow-500'>
                                    <Star className='h-4 w-4 fill-yellow-400' />
                                    <span>{ratingNumber.toFixed(1)}</span>
                                </span>
                            )}
                        </h1>
                        {/* <div className='text-xs md:text-sm flex flex-col md:flex-row md:items-center text-gray-600 mt-1 gap-1'>
                            <div className='flex items-center gap-1'>
                                <MapPin className='h-4 w-4' />
                                <span>{attraction?.Address || 'Address will be loaded from Google / SerpAPI.'}</span>
                            </div>
                            <button
                                type='button'
                                onClick={scrollToMap}
                                className='md:pl-2 text-blue-600 hover:underline font-semibold text-xs md:text-sm flex items-center gap-1'
                            >
                                View on map
                                <Navigation2 className='h-3 w-3' />
                            </button>
                        </div> */}
                    </div>

                    <div className='flex justify-end'>
                        <Button
                            onClick={handleSelectAttractionForTrip}
                            className='text-md rounded-sm md:py-5 md:text-base bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        >
                            Use this attraction in trip
                        </Button>
                    </div>
                </div>

                <hr className='w-full bg-gray-500' />

                <AttractionInfoCard attraction={attraction} onScrollToMap={scrollToMap} />
            </SectionCard>

            <AttractionDescriptionCard attraction={attraction} />

            <TicketsPassesSection tickets={tickets} />

            <AttractionReviewsSection
                rating={rating}
                ratingCount={ratingCount}
                ratingBreakdown={ratingBreakdown}
                reviews={reviews}
            />

            <AttractionMapSection
                mapRef={mapRef}
                nearby={nearby}
                onOpenHotel={handleOpenHotel}
                onOpenAttraction={handleOpenAttraction}
                onFocusRestaurantRoute={handleFocusRestaurantRoute}
            />
        </div>
    )
}
