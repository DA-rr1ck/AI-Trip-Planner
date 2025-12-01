import React, { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    ArrowLeft,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Star,
    BedDouble,
    ArrowRight,
    Hotel,
    Users,
    Navigation,
    Train,
    Coffee,
    ShoppingBag,
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
    if (typeof value === 'number') return value;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
}

/**
 * Fetches detailed hotel info (amenities, description, policies, reviews) from SerpAPI.
 * Returns combined data from navigation state + API response.
 */
function useHotelDetails(initialHotel, tripContext) {
    const [apiData, setApiData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const hotelName = initialHotel?.HotelName || null
    const checkInDate = tripContext?.userSelection?.startDate
    const checkOutDate = tripContext?.userSelection?.endDate

    // Helper to format date to YYYY-MM-DD
    const formatDateToYYYYMMDD = (date) => {
        if (!date) return null
        // If already a string in YYYY-MM-DD format, return as is
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date
        }
        // Handle Date object or date string
        let d
        if (date instanceof Date) {
            d = date
        } else if (typeof date === 'string') {
            // Try parsing the string - handles formats like "Wed Dec 03 2025 00:00:00 GMT+0700"
            d = new Date(date)
        } else {
            return null
        }
        // Validate the date
        if (isNaN(d.getTime())) return null
        // Format as YYYY-MM-DD using local date parts to avoid timezone issues
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    useEffect(() => {
        if (!hotelName) {
            setIsLoading(false)
            return
        }

        const controller = new AbortController()

        async function fetchHotelDetails() {
            try {
                setIsLoading(true)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', hotelName)

                // Default dates if not provided
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                const dayAfter = new Date(tomorrow)
                dayAfter.setDate(dayAfter.getDate() + 1)

                const formattedCheckIn = formatDateToYYYYMMDD(checkInDate) || formatDateToYYYYMMDD(tomorrow)
                const formattedCheckOut = formatDateToYYYYMMDD(checkOutDate) || formatDateToYYYYMMDD(dayAfter)

                // Debug log
                console.log('useHotelDetails - raw dates:', { checkInDate, checkOutDate })
                console.log('useHotelDetails - formatted dates:', { formattedCheckIn, formattedCheckOut })

                params.set('check_in_date', formattedCheckIn)
                params.set('check_out_date', formattedCheckOut)

                params.set('gl', 'vn')
                params.set('hl', 'en')
                params.set('currency', 'USD')

                const res = await fetch(
                    `/api/serp/hotel/details?${params.toString()}`,
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
                console.error('Failed to load hotel details', err)
                setError(err.message || 'Failed to load hotel details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchHotelDetails()

        return () => controller.abort()
    }, [hotelName, checkInDate, checkOutDate])

    // Debug: Log API response
    useEffect(() => {
        console.log('useHotelDetails - apiData:', apiData)
    }, [apiData])

    // Merge initial hotel data with API data
    const hotel = {
        // From navigation state (hotel search result)
        HotelName: initialHotel?.HotelName || null,
        HotelAddress: apiData?.locationInfo?.address || initialHotel?.HotelAddress || 'Address not available',
        Rating: apiData?.overallRating || initialHotel?.Rating || null,
        Price: initialHotel?.Price || null,

        // From API
        Description: apiData?.descriptionParagraphs?.join('\n\n') || null,
        numberOfRooms: apiData?.numberOfRooms || null,
        // Handle hotel_class which could be number or string like "4-star"
        hotelClass: (() => {
            const hc = apiData?.hotelClass
            if (typeof hc === 'number') return hc
            if (typeof hc === 'string') {
                const match = hc.match(/(\d+)/)
                return match ? parseInt(match[1], 10) : null
            }
            return null
        })(),
        
        // Contact info
        Contact: {
            phone: apiData?.phone || null,
            email: null, // SerpAPI doesn't provide email
            website: apiData?.locationInfo?.link || null,
        },

        // Amenities - raw array from SerpAPI
        rawAmenities: apiData?.amenities || [],

        // Policies
        policies: apiData?.policies || {},

        // Reviews data
        reviewsData: {
            rating: apiData?.overallRating || null,
            ratingCount: apiData?.reviewsCount || null,
            ratingBreakdown: apiData?.ratingBreakdown || {},
            reviews: (apiData?.userReviews || []).slice(0, 3), // Load 3 comments
        },

        // Photos - use images from API if available, otherwise fall back to initial
        Photos: buildPhotoArray(initialHotel, apiData?.images),

        // GPS Coordinates for map
        gpsCoordinates: apiData?.locationInfo?.gpsCoordinates || null,

        // Nearby places from API
        nearbyPlaces: apiData?.nearbyPlaces || [],
    }

    return {
        hotel,
        isLoading,
        error,
    }
}

/**
 * Build photo array combining initial hotel image with API images.
 */
function buildPhotoArray(initialHotel, apiImages) {
    const photos = []

    // Add initial image from search if available
    if (initialHotel?.imageUrl) {
        photos.push(initialHotel.imageUrl)
    }

    // Add API images
    if (Array.isArray(apiImages) && apiImages.length > 0) {
        apiImages.forEach(img => {
            const url = typeof img === 'string' ? img : img.thumbnail || img.original
            if (url && !photos.includes(url)) {
                photos.push(url)
            }
        })
    }

    // Fallback to placeholder if no images
    if (photos.length === 0) {
        photos.push('/placeholder.jpg', '/landing2.jpg', '/landing3.jpg')
    }

    return photos
}

function useHotelRooms({
    hotelName,
    checkInDate,
    checkOutDate,
    adults,
    children,
    childrenAges,
    gl,
    hl,
    currency,
}) {
    // null = not loaded yet, [] = loaded but no rooms
    const [rooms, setRooms] = useState(null)
    const [error, setError] = useState(null)

    // Helper to format date to YYYY-MM-DD
    const formatDateToYYYYMMDD = (date) => {
        if (!date) return null
        // If already a string in YYYY-MM-DD format, return as is
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date
        }
        // Handle Date object or date string
        let d
        if (date instanceof Date) {
            d = date
        } else if (typeof date === 'string') {
            // Try parsing the string - handles formats like "Wed Dec 03 2025 00:00:00 GMT+0700"
            d = new Date(date)
        } else {
            return null
        }
        // Validate the date
        if (isNaN(d.getTime())) return null
        // Format as YYYY-MM-DD using local date parts to avoid timezone issues
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    useEffect(() => {
        if (!hotelName) {
            setRooms([])
            setError(null)
            return
        }

        // Format dates properly
        const formattedCheckIn = formatDateToYYYYMMDD(checkInDate)
        const formattedCheckOut = formatDateToYYYYMMDD(checkOutDate)

        // Debug log
        console.log('useHotelRooms - raw dates:', { checkInDate, checkOutDate })
        console.log('useHotelRooms - formatted dates:', { formattedCheckIn, formattedCheckOut })

        // Skip if dates are not properly formatted
        if (!formattedCheckIn || !formattedCheckOut) {
            console.warn('Invalid check-in or check-out date for rooms API')
            setRooms([])
            return
        }

        const controller = new AbortController()

        async function fetchRooms() {
            try {
                setRooms(null)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', hotelName)
                params.set('check_in_date', formattedCheckIn)
                params.set('check_out_date', formattedCheckOut)

                if (adults) params.set('adults', String(adults))
                if (children) params.set('children', String(children))
                if (Array.isArray(childrenAges) && childrenAges.length > 0) {
                    params.set('children_ages', childrenAges.join(','))
                }

                const effectiveGl = gl || 'vn'
                const effectiveHl = hl || 'en'
                const effectiveCurrency = currency || 'USD'

                params.set('gl', effectiveGl)
                params.set('hl', effectiveHl)
                params.set('currency', effectiveCurrency)

                const res = await fetch(
                    `/api/serp/hotel/rooms?${params.toString()}`,
                    { signal: controller.signal }
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(
                        text || `Request failed with status ${res.status}`
                    )
                }

                const json = await res.json()

                const normalizedRooms = Array.isArray(json.rooms)
                    ? json.rooms.map((room, index) => {
                        const images = Array.isArray(room.images)
                            ? room.images
                            : []

                        const isPricesFallback = room.isFromPricesFallback

                        return {
                            name: room.name || 'Room',
                            price: room.price || 'Price on request',
                            numGuests: room.numGuests || null,
                            images,
                            source: room.source || null,
                            link: room.link || null,
                            logo: room.logo || null,
                            official: !!room.official,
                            from: room.from,
                            isFromPricesFallback: room.isFromPricesFallback,
                            description: isPricesFallback
                                ? 'Estimated price only – exact room type is not available.'
                                : room.description || 'Room details loaded from Google / SerpAPI.',
                        }
                    })
                    : []

                setRooms(normalizedRooms)
            } catch (err) {
                if (err.name === 'AbortError') return
                console.error('Failed to load hotel rooms', err)
                setError(err.message || 'Failed to load hotel rooms')
                setRooms([])
            }
        }

        fetchRooms()

        return () => controller.abort()
    }, [
        hotelName,
        checkInDate,
        checkOutDate,
        adults,
        children,
        Array.isArray(childrenAges) ? childrenAges.join(',') : childrenAges,
        gl,
        hl,
        currency,
    ])

    return { rooms, error }
}

// Category icons for section headers
const CATEGORY_ICONS = {
    'Internet': '📶',
    'Parking': '🅿️',
    'Transportation': '🚐',
    'Front desk services': '🛎️',
    'Languages spoken': '🗣️',
    'Food & drink': '🍽️',
    'Public areas': '🏢',
    'Cleaning services': '🧹',
    'Facilities for children': '👶',
    'Business services': '💼',
    'Accessibility': '♿',
    'Safety & security': '🔒',
}

// Keywords to match amenities to categories
const CATEGORY_KEYWORDS = {
    'Internet': ['wifi', 'wi-fi', 'internet', 'wireless', 'broadband', 'ethernet', 'lan'],
    'Parking': ['parking', 'garage', 'valet', 'car park'],
    'Transportation': ['shuttle', 'airport', 'transfer', 'taxi', 'transportation', 'car rental', 'bicycle', 'bike'],
    'Front desk services': ['front desk', 'reception', 'concierge', '24-hour', 'check-in', 'check-out', 'express', 'luggage', 'storage', 'tour', 'ticket', 'currency', 'exchange', 'wake-up', 'wake up'],
    'Languages spoken': ['english', 'japanese', 'chinese', 'korean', 'french', 'german', 'spanish', 'vietnamese', 'thai', 'language', 'multilingual'],
    'Food & drink': ['restaurant', 'bar', 'breakfast', 'lunch', 'dinner', 'dining', 'cafe', 'coffee', 'tea', 'room service', 'minibar', 'mini-bar', 'snack', 'vending', 'buffet', 'meal', 'food', 'drink', 'lounge'],
    'Public areas': ['lobby', 'garden', 'terrace', 'pool', 'swimming', 'gym', 'fitness', 'spa', 'sauna', 'steam', 'jacuzzi', 'hot tub', 'outdoor', 'indoor', 'beach', 'library', 'game room', 'recreation', 'lounge', 'smoking area', 'non-smoking', 'air conditioning', 'heating', 'elevator', 'lift'],
    'Cleaning services': ['laundry', 'dry cleaning', 'ironing', 'housekeeping', 'cleaning', 'shoe shine', 'pressing'],
    'Facilities for children': ['kids', 'children', 'child', 'baby', 'crib', 'cot', 'babysitting', 'playground', 'family', 'kids club', 'highchair'],
    'Business services': ['business', 'meeting', 'conference', 'fax', 'printer', 'computer', 'photocopying', 'secretary', 'work', 'office'],
    'Accessibility': ['wheelchair', 'accessible', 'disability', 'disabled', 'mobility', 'hearing', 'visual', 'braille', 'accessible bathroom', 'ramp'],
    'Safety & security': ['safe', 'safety', 'security', 'cctv', 'camera', 'fire', 'smoke detector', 'extinguisher', 'first aid', 'doctor', 'medical', '24-hour security', 'key card', 'safe deposit'],
}

// Categorize amenities into the specified groups
function categorizeAmenities(amenities) {
    const categories = {}
    
    // Initialize only categories that will have items
    Object.keys(CATEGORY_KEYWORDS).forEach(cat => {
        categories[cat] = []
    })

    const usedAmenities = new Set()

    amenities.forEach(amenity => {
        const lower = amenity.toLowerCase()
        
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(kw => lower.includes(kw))) {
                if (!usedAmenities.has(amenity)) {
                    categories[category].push(amenity)
                    usedAmenities.add(amenity)
                }
                break
            }
        }
    })

    // Remove empty categories - only return categories that have items from the API
    return Object.fromEntries(
        Object.entries(categories).filter(([_, items]) => items.length > 0)
    )
}

// Services and Amenities card - displays only what the API returns
function ServicesAmenitiesCard({ rawAmenities }) {
    // Use raw amenities from API - only display what we receive
    const allAmenities = Array.isArray(rawAmenities) && rawAmenities.length > 0 
        ? rawAmenities 
        : []

    const hasAmenities = allAmenities.length > 0
    const categorizedAmenities = hasAmenities ? categorizeAmenities(allAmenities) : {}
    const categoryEntries = Object.entries(categorizedAmenities)

    return (
        <SectionCard
            title='Services & Amenities'
            subtitle={hasAmenities ? `${allAmenities.length} amenities available at this property.` : 'Services and amenities available at this property.'}
        >
            {!hasAmenities ? (
                <p className='text-sm text-gray-400'>No amenity information available</p>
            ) : (
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {categoryEntries.map(([category, items]) => (
                        <div key={category} className='space-y-2'>
                            {/* Category header with icon */}
                            <h3 className='font-semibold text-sm text-gray-800 flex items-center gap-2 pb-1 border-b border-gray-100'>
                                <span className='text-lg'>{CATEGORY_ICONS[category] || '📋'}</span>
                                <span>{category}</span>
                            </h3>
                            {/* Amenity items with check icons */}
                            <ul className='space-y-1'>
                                {items.map((amenity, idx) => (
                                    <li 
                                        key={idx} 
                                        className='flex items-center gap-2 text-sm text-gray-700'
                                    >
                                        <span className='text-green-500 flex-shrink-0'>✓</span>
                                        <span>{amenity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    )
}

// Policy field configuration
const POLICY_FIELDS = [
    { id: 'check_in_out', label: 'Check-in and Check-out Times', field: 'checkInOut' },
    { id: 'child_policies', label: 'Child policies', field: 'childPolicies' },
    { id: 'cribs_extra_beds', label: 'Cribs and Extra Beds', field: 'cribsAndExtraBeds' },
    { id: 'breakfast', label: 'Breakfast', field: 'breakfast' },
    { id: 'deposit_policy', label: 'Deposit Policy', field: 'depositPolicy' },
    { id: 'pets', label: 'Pets', field: 'pets' },
    { id: 'service_animals', label: 'Service animals', field: 'serviceAnimals' },
    { id: 'age_requirements', label: 'Age Requirements', field: 'ageRequirements' },
    { id: 'paying_at_hotel', label: 'Paying at the hotel', field: 'paymentMethods' },
]

// Render policy content - handles various data formats, splits into multiple lines
function PolicyContent({ content }) {
    // Array of strings
    if (Array.isArray(content)) {
        return (
            <ul className='space-y-1'>
                {content.map((item, idx) => (
                    <li key={idx} className='text-sm text-gray-700'>
                        {typeof item === 'object' ? (item.name || item.title || JSON.stringify(item)) : item}
                    </li>
                ))}
            </ul>
        )
    }

    // Object with text property
    if (typeof content === 'object' && content !== null) {
        if (content.text) {
            // Split by common delimiters and display as multiple lines
            const lines = content.text.split(/[,;]|\s*-\s*/).map(s => s.trim()).filter(Boolean)
            if (lines.length > 1) {
                return (
                    <ul className='space-y-1'>
                        {lines.map((line, idx) => (
                            <li key={idx} className='text-sm text-gray-700'>{line}</li>
                        ))}
                    </ul>
                )
            }
            return <p className='text-sm text-gray-700'>{content.text}</p>
        }
    }

    // Plain string - try to split into multiple lines
    const text = String(content)
    // Split by comma, semicolon, or " - " pattern while preserving time formats like "Check-in: 2:00 PM"
    const lines = text.split(/,(?!\s*\d)|;/).map(s => s.trim()).filter(Boolean)
    
    if (lines.length > 1) {
        return (
            <ul className='space-y-1'>
                {lines.map((line, idx) => (
                    <li key={idx} className='text-sm text-gray-700'>{line}</li>
                ))}
            </ul>
        )
    }
    
    return <p className='text-sm text-gray-700'>{text}</p>
}

// Property Policies card - displays only available policy data
function PropertyPoliciesCard({ policies }) {
    const data = policies || {}
    
    // Filter to only show policies that have values (not null/undefined)
    const availablePolicies = POLICY_FIELDS.filter(policy => {
        const value = data[policy.field]
        return value !== null && value !== undefined && value !== ''
    })

    const hasItems = availablePolicies.length > 0

    return (
        <SectionCard
            title='Property Policies'
            subtitle={hasItems ? 'Important information about this property.' : 'Policy information for this property.'}
        >
            {!hasItems ? (
                <p className='text-sm text-gray-400'>No policy information available</p>
            ) : (
                <div className='grid md:grid-cols-2 gap-6'>
                    {availablePolicies.map((policy) => (
                        <div key={policy.id} className='space-y-2'>
                            {/* Policy header */}
                            <h3 className='font-semibold text-sm text-gray-800 pb-1 border-b border-gray-100'>
                                {policy.label}
                            </h3>
                            {/* Policy content */}
                            <div>
                                <PolicyContent content={data[policy.field]} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    )
}

/**
 * Rooms list card.
 */
function RoomCard({ room }) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const activeThumbRef = useRef(null)

    const images =
        Array.isArray(room.images) && room.images.length > 0
            ? room.images
            : ['/placeholder.jpg']

    const previewImage = images[0]
    const selectedImage = images[selectedImageIndex] || images[0]

    const hasMultiple = images.length > 1
    const showPrevArrow = hasMultiple && selectedImageIndex > 0
    const showNextArrow =
        hasMultiple && selectedImageIndex < images.length - 1

    const isFallback = room.isFromPricesFallback
    const hasMeta = room.numGuests || room.source || room.logo || room.official

    // Scroll active thumbnail into view whenever we change selectedImageIndex
    useEffect(() => {
        if (activeThumbRef.current) {
            activeThumbRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            })
        }
    }, [selectedImageIndex])

    const handlePrevMain = () => {
        setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : prev))
    }

    const handleNextMain = () => {
        setSelectedImageIndex(prev =>
            prev < images.length - 1 ? prev + 1 : prev
        )
    }

    const renderLogo = () => {
        if (!room.logo) return null

        // assume url string from BE
        if (typeof room.logo === 'string') {
            return (
                <img
                    src={room.logo}
                    alt={room.source || 'provider logo'}
                    className='h-3 w-auto rounded-sm bg-white'
                    loading='lazy'
                    referrerPolicy='no-referrer'
                />
            )
        }

        return null
    }

    return (
        <div className='border rounded-lg p-0 md:p-3 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 bg-gray-100'>
            {/* Image with hover zoom + dialog trigger */}
            <Dialog
                onOpenChange={open => {
                    if (open) setSelectedImageIndex(0)
                }}
            >
                <DialogTrigger asChild>
                    <button
                        type='button'
                        className='relative w-full h-44 md:w-64 md:h-40 lg:w-80 lg:h-52 rounded-t-md md:rounded-md overflow-hidden bg-gray-200 flex-shrink-0 group cursor-pointer'
                    >
                        <img
                            src={previewImage}
                            alt={room.name}
                            loading='lazy'
                            referrerPolicy='no-referrer'
                            className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                        />
                        <div className='absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity' />
                        <span className='absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded'>
                            View photos ({images.length})
                        </span>
                    </button>
                </DialogTrigger>

                <DialogContent className='w-[95vw] sm:max-w-xl md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'>
                    <DialogHeader>
                        <DialogTitle className='mt-2 md:mt-0 text-left'>{room.name}</DialogTitle>
                    </DialogHeader>

                    {/* Scrollable content inside the constrained dialog */}
                    <div className='mt-2 md:mt-3 space-y-4 flex-1 overflow-y-auto'>
                        {/* Big preview with arrows */}
                        <div className='relative w-full overflow-hidden rounded-lg bg-gray-200'>
                            {showPrevArrow && (
                                <button
                                    type='button'
                                    onClick={handlePrevMain}
                                    className='absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow p-1'
                                >
                                    <ChevronLeft className='h-5 w-5 text-gray-800' />
                                </button>
                            )}

                            <img
                                src={selectedImage}
                                alt={`${room.name} selected`}
                                className='w-full max-h-[60vh] object-contain'
                                loading='lazy'
                                referrerPolicy='no-referrer'
                            />

                            {showNextArrow && (
                                <button
                                    type='button'
                                    onClick={handleNextMain}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow p-1'
                                >
                                    <ChevronRight className='h-5 w-5 text-gray-800' />
                                </button>
                            )}

                            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-xs text-white'>
                                {selectedImageIndex + 1}/{images.length}
                            </div>
                        </div>

                        {/* Thumbnails row – active thumb auto-scrolls into view */}
                        <div className='flex gap-2 overflow-x-auto pb-1'>
                            {images.map((src, idx) => {
                                const isActive = idx === selectedImageIndex
                                return (
                                    <button
                                        type='button'
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        ref={isActive ? activeThumbRef : null}
                                        className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-20 overflow-hidden rounded-md bg-gray-100 border ${isActive
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : 'border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={src}
                                            alt={`${room.name} photo ${idx + 1}`}
                                            className='w-full h-full object-cover'
                                            loading='lazy'
                                            referrerPolicy='no-referrer'
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Content */}
            <div className='w-full md:flex-1 flex flex-col justify-around px-3 pb-3 md:px-0 md:pb-0'>
                {/* Left: name, meta, description */}
                <div className='space-y-2 md:space-y-3'>
                    <h4 className='font-semibold text-md md:text-xl flex items-center gap-1'>
                        <BedDouble className='h-4 w-4 md:h-5 md:w-5 text-gray-600 hidden md:block' />
                        {room.name}
                    </h4>

                    {hasMeta && (
                        <div className='flex flex-wrap items-center gap-2 text-xs md:text-base'>
                            {room.numGuests && (
                                <div className='flex items-center gap-1'>
                                    <Users className='h-3 w-3 md:h-4 md:w-4 text-gray-600' />
                                    <span className='text-gray-600'>
                                        Up to {room.numGuests} guest
                                        {room.numGuests > 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {room.official && (
                                <span className='px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700'>
                                    Official site
                                </span>
                            )}
                        </div>
                    )}

                    {room.description && (
                        <p className='text-xs md:text-sm text-gray-600'>{room.description}</p>
                    )}
                </div>

                {/* Right: price, link, source */}
                <div className='flex flex-col items-end justify-center gap-2 mt-4'>
                    <div>
                        <p className='text-md md:text-2xl font-semibold text-blue-600 leading-tight'>
                            {room.price || 'Price on request'} / Night
                        </p>

                        {isFallback && (
                            <p className='text-[10px] text-gray-400 mt-0.5'>
                                From lowest available rate
                            </p>
                        )}
                    </div>

                    {/* Link */}
                    {room.link && (
                        <div className=''>
                            <a
                                href={room.link}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1 px-3 py-1 rounded-md border border-blue-400 text-xs md:text-base font-medium text-blue-500 hover:bg-blue-700 hover:text-white transition-all duration-150'
                            >
                                View deal
                                <ArrowRight className='h-3 w-3 md:h-5 md:w-5' />
                            </a>
                        </div>
                    )}

                    {/* Source */}
                    {room.source && (
                        <span className='inline-flex items-center gap-1 text-xs text-gray-700 rounded-md px-2 py-0.5 bg-white'>
                            <span>via</span>
                            {renderLogo()}
                            <span>{room.source}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function HotelRoomsSection({
    hotelName,
    checkInDate,
    checkOutDate,
    adults = 2,
    children = 0,
    childrenAges = [],
    gl = 'vn',
    hl = 'en',
    currency = 'USD',
}) {
    const { rooms, error } = useHotelRooms({
        hotelName,
        checkInDate,
        checkOutDate,
        adults,
        children,
        childrenAges,
        gl,
        hl,
        currency,
    })

    const hasRooms = Array.isArray(rooms) && rooms.length > 0

    return (
        <SectionCard
            title='Rooms & Prices'
        // subtitle='Room types, infos, and indicative prices.'
        >
            {/* Loading */}
            {rooms === null && (
                <div className='flex items-center gap-2 text-sm text-gray-600'>
                    <span className='inline-block w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin' />
                    <span>Fetching live rooms and prices…</span>
                </div>
            )}

            {/* Either rooms empty or error */}
            {rooms !== null && !hasRooms && (
                <p className='mt-2 text-sm text-gray-600'>
                    {error
                        ? 'Unable to load rooms right now. Please try again later or adjust your dates.'
                        : 'There are no available rooms for these dates with the current guest selection.'}
                </p>
            )}

            {/* Rooms list */}
            {rooms !== null && hasRooms && (
                <div className='space-y-3'>
                    {rooms.map((room, idx) => (
                        <RoomCard key={room.name || idx} room={room} />
                    ))}
                </div>
            )}
        </SectionCard>
    )
}

/**
 * Simple ratings & reviews card.
 */
// Replace your old HotelReviewsSection with this one

function HotelReviewsSection({
    rating,
    ratingCount,
    ratingBreakdown,
    reviews,
}) {
    // Safe avg rating
    const avgRating = (() => {
        const num =
            typeof rating === 'number' ? rating : parseFloat(rating ?? '0');
        return Number.isFinite(num) ? num : 0;
    })();

    // If caller doesn't give ratingCount, try reviews length, else placeholder
    const totalReviews =
        ratingCount ??
        (Array.isArray(reviews) ? reviews.length : null) ??
        0;

    // Breakdown: counts of each star 1–5
    // Only use breakdown data if it actually has values
    const hasBreakdownData = ratingBreakdown && Object.keys(ratingBreakdown).length > 0;
    
    // Generate simulated breakdown based on average rating if no real data
    const generateSimulatedBreakdown = (avg, total) => {
        if (total === 0 || avg === 0) return null;
        
        // Create a distribution that peaks around the average rating
        const breakdown = {};
        const distributions = {
            5: [0.02, 0.03, 0.10, 0.25, 0.60], // For ~5 star avg
            4: [0.03, 0.07, 0.15, 0.45, 0.30], // For ~4 star avg
            3: [0.10, 0.15, 0.40, 0.25, 0.10], // For ~3 star avg
            2: [0.25, 0.40, 0.20, 0.10, 0.05], // For ~2 star avg
            1: [0.55, 0.25, 0.12, 0.05, 0.03], // For ~1 star avg
        };
        
        const roundedAvg = Math.max(1, Math.min(5, Math.round(avg)));
        const dist = distributions[roundedAvg];
        
        for (let i = 1; i <= 5; i++) {
            breakdown[i] = Math.round(total * dist[i - 1]);
        }
        
        return breakdown;
    };
    
    const breakdown = hasBreakdownData 
        ? ratingBreakdown 
        : generateSimulatedBreakdown(avgRating, totalReviews);

    const breakdownTotal = breakdown
        ? Object.values(breakdown).reduce((sum, v) => sum + v, 0) || 1
        : 1;

    // Reviews list (right column) - only show real reviews from API
    const reviewList = Array.isArray(reviews) && reviews.length > 0 ? reviews : [];
    const hasReviews = reviewList.length > 0;

    const [visibleCount, setVisibleCount] = useState(3);

    const handleLoadMore = () => {
        setVisibleCount((prev) => Math.min(prev + 3, reviewList.length));
    };

    const canLoadMore = visibleCount < reviewList.length;

    return (
        <SectionCard
            title="Ratings & Reviews"
            subtitle="Overview of scores and some of the top comments."
        >
            <div className="grid md:grid-cols-2 gap-6">
                {/* LEFT: summary + breakdown */}
                <div className="space-y-4">
                    {/* Average rating */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-yellow-500">
                                <span className="text-3xl font-bold">
                                    {avgRating.toFixed(1)}
                                </span>
                                <Star className="h-5 w-5 fill-yellow-400" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Based on {totalReviews} reviews
                            </p>
                        </div>
                    </div>

                    {/* Breakdown 1–5 stars - only show if we have data */}
                    {breakdown && (
                        <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = breakdown[star] ?? 0;
                                const percent = (count / breakdownTotal) * 100;

                                return (
                                    <div
                                        key={star}
                                        className="flex items-center gap-3 text-xs text-gray-600"
                                    >
                                        <div className="w-10 flex items-center justify-end gap-0.5">
                                            <span className="font-semibold">{star}</span>
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        </div>
                                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="w-10 text-right">{count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: comments list */}
                <div className="space-y-3">
                    {hasReviews ? (
                        <>
                            {reviewList.slice(0, visibleCount).map((r, idx) => (
                                <div
                                    key={idx}
                                    className="border rounded-lg p-3 bg-gray-50 text-sm text-gray-700"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{r.user}</span>
                                            {r.rating && (
                                                <span className="inline-flex items-center gap-0.5 text-xs text-yellow-500">
                                                    <Star className="h-3 w-3 fill-yellow-400" />
                                                    <span>{r.rating}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500">{r.date}</span>
                                    </div>
                                    <p>{r.text}</p>
                                </div>
                            ))}

                            {canLoadMore && (
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                    Load more comments
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">
                            No reviews available for this hotel.
                        </div>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}

/**
 * Map card with Leaflet map showing:
 * - Hotel marker with popup
 * - Nearby places markers (transit, POI, shopping)
 */
function HotelMapSection({ hotel }) {
    const mapContainerRef = useRef(null)
    const mapInstance = useRef(null)
    const markersRef = useRef([])
    const [allPlaces, setAllPlaces] = useState([])
    const [displayPlaces, setDisplayPlaces] = useState([])
    const [activeFilter, setActiveFilter] = useState('all') // 'all', 'transit', 'poi', 'shopping'
    const [loadingPlaces, setLoadingPlaces] = useState(false)

    const hasCoordinates = hotel?.gpsCoordinates?.latitude && hotel?.gpsCoordinates?.longitude

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

    // Helper to determine icon and color based on place type
    const getPlaceStyle = (type) => {
        const typeLC = (type || '').toLowerCase()
        // Transit
        if (typeLC.includes('transit') || typeLC.includes('train') || typeLC.includes('bus') || typeLC.includes('metro') || typeLC.includes('subway') || typeLC.includes('station')) {
            return { icon: '🚇', color: '#3B82F6', category: 'transit', displayType: 'Transit' }
        }
        // Restaurant (unified: includes cafe, food, dining)
        if (typeLC.includes('restaurant') || typeLC.includes('food') || typeLC.includes('dining') || typeLC.includes('cafe') || typeLC.includes('coffee') || typeLC.includes('eatery') || typeLC.includes('bistro')) {
            return { icon: '🍽️', color: '#F97316', category: 'restaurant', displayType: 'Restaurant' }
        }
        // Convenience store
        if (typeLC.includes('conbini') || typeLC.includes('convenience') || typeLC.includes('7-eleven') || typeLC.includes('lawson') || typeLC.includes('familymart') || typeLC.includes('mini market')) {
            return { icon: '🏪', color: '#10B981', category: 'convenience', displayType: 'Convenience Store' }
        }
        // Gas station
        if (typeLC.includes('gas') || typeLC.includes('fuel') || typeLC.includes('petrol') || typeLC.includes('gas_station')) {
            return { icon: '⛽', color: '#EF4444', category: 'gas', displayType: 'Gas Station' }
        }
        // ATM / Bank
        if (typeLC.includes('atm') || typeLC.includes('bank') || typeLC.includes('cash')) {
            return { icon: '🏧', color: '#8B5CF6', category: 'atm', displayType: 'ATM' }
        }
        // Pharmacy
        if (typeLC.includes('pharmacy') || typeLC.includes('drug') || typeLC.includes('medical')) {
            return { icon: '💊', color: '#06B6D4', category: 'pharmacy', displayType: 'Pharmacy' }
        }
        // Parking
        if (typeLC.includes('parking') || typeLC.includes('car park') || typeLC.includes('garage')) {
            return { icon: '🅿️', color: '#0EA5E9', category: 'parking', displayType: 'Parking' }
        }
        // Shopping
        if (typeLC.includes('shop') || typeLC.includes('mall') || typeLC.includes('market') || typeLC.includes('store') || typeLC.includes('supermarket')) {
            return { icon: '🛍️', color: '#EC4899', category: 'shopping', displayType: 'Shopping' }
        }
        // POI / Attraction / Landmark
        if (typeLC.includes('attraction') || typeLC.includes('landmark') || typeLC.includes('museum') || typeLC.includes('park') || typeLC.includes('temple') || typeLC.includes('shrine') || typeLC.includes('poi') || typeLC.includes('monument') || typeLC.includes('historic')) {
            return { icon: '📍', color: '#F59E0B', category: 'poi', displayType: 'POI' }
        }
        // Default
        return { icon: '📍', color: '#6B7280', category: 'other', displayType: type || 'Place' }
    }

    // Helper to parse distance string to meters for filtering
    const parseDistanceToMeters = (distanceStr) => {
        if (!distanceStr) return null
        const str = distanceStr.toLowerCase()
        // Match patterns like "500 m", "0.5 km", "500m", "0.5km"
        const mMatch = str.match(/([\d.]+)\s*m(?:eter)?s?(?!i)/i)
        const kmMatch = str.match(/([\d.]+)\s*km/i)
        const minMatch = str.match(/([\d.]+)\s*min/i)
        
        if (kmMatch) return parseFloat(kmMatch[1]) * 1000
        if (mMatch) return parseFloat(mMatch[1])
        if (minMatch) return parseFloat(minMatch[1]) * 80 // ~80m per minute walking
        return null
    }

    // Initialize map
    useEffect(() => {
        if (!hasCoordinates || !mapContainerRef.current || mapInstance.current) return

        const { latitude, longitude } = hotel.gpsCoordinates

        // Create map instance
        mapInstance.current = L.map(mapContainerRef.current).setView([latitude, longitude], 15)

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance.current)

        // Create custom hotel marker icon
        const hotelIcon = L.divIcon({
            className: 'custom-hotel-marker',
            html: `<div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            ">🏨</div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22]
        })

        // Add hotel marker (no popup - just the marker)
        L.marker([latitude, longitude], { icon: hotelIcon })
            .addTo(mapInstance.current)

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [hasCoordinates, hotel?.HotelName, hotel?.HotelAddress, hotel?.Rating])

    // Fetch nearby places using Overpass API
    useEffect(() => {
        if (!hasCoordinates) return

        const { latitude, longitude } = hotel.gpsCoordinates

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
            return Math.round(R * c) // Distance in metres
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
                // Overpass API query for various amenities within 1km
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
                    if (!name) return // Skip places without names
                    
                    // Skip duplicates
                    const nameKey = name.toLowerCase()
                    if (seenNames.has(nameKey)) return
                    seenNames.add(nameKey)

                    const distanceMeters = calculateDistance(latitude, longitude, el.lat, el.lon)
                    
                    // Only include places within 1km
                    if (distanceMeters > 1000) return

                    // Determine category and style based on tags
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
                        return // Skip unknown types
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

                // Sort by distance
                places.sort((a, b) => a.distanceMeters - b.distanceMeters)

                // Limit to reasonable number per category to avoid clutter
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
                // No fallback - just show empty if API fails
                setAllPlaces([])
            } finally {
                setLoadingPlaces(false)
            }
        }

        fetchNearbyPlaces()
    }, [hasCoordinates, hotel?.gpsCoordinates?.latitude, hotel?.gpsCoordinates?.longitude])

    // Filter places and update markers when filter changes
    useEffect(() => {
        if (!mapInstance.current || allPlaces.length === 0) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Filter places based on active filter
        const filteredPlaces = activeFilter === 'all' 
            ? allPlaces 
            : allPlaces.filter(place => place.category === activeFilter)

        setDisplayPlaces(filteredPlaces)

        // Add markers to map
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
                        ${place.duration ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #888;">🚶 ${place.duration}</p>` : ''}
                    </div>
                `)

            markersRef.current.push(marker)
        })
    }, [allPlaces, activeFilter])

    return (
        <SectionCard
            id='hotel-map'
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
                            <p>Location coordinates not available for this hotel.</p>
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
                                        // Find and open the marker popup
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

/* COMMENTED OUT - Nearby Hotels Section (to be decided later)
**
 * Nearby hotels section.
 */
// function NearbyHotelCard({ hotel }) {
//     const openInNewTab = (hotel) => {
//         const slug = encodeURIComponent(hotel.name || 'hotel')
//         window.open(`/manual/hotel/${slug}`, '_blank')
//         console.log('Open nearby hotel detail (placeholder):', hotel)
//     }

//     return (
//         <div
//             className='border rounded-lg bg-gray-50 flex flex-col justify-between gap-4 hover:cursor-pointer hover:-translate-y-2 transition-all duration-300'
//             onClick={() => openInNewTab(hotel)}
//         >
//             <img
//                 src='/placeholder.jpg'
//                 alt='Hotel photo'
//                 className='relative top-0 rounded-t-lg'
//             />
//             <div className='px-3 pb-3 flex flex-col justify-between gap-10'>
//                 <div>
//                     <h4 className='font-semibold text-md'>{hotel.name}</h4>
//                     <p className='text-sm text-gray-500 mt-1'>{hotel.distance}</p>
//                 </div>
//                 <button
//                     type='button'
//                     className='inline-flex items-center justify-end gap-1 text-xs text-blue-600 hover:underline'
//                 >
//                     Open details in new tab
//                     <ArrowRight className='h-3 w-3' />
//                 </button>
//             </div>
//         </div>
//     )
// }

// /**
//  * Nearby hotels section with smooth horizontal slide between pages of 4 cards
//  */
// function NearbyHotelsSection({ hotels }) {
//     // TODO: real nearby hotels from Google Places / SerpAPI
//     const placeholderNearby = [
//         { name: 'Nearby Hotel 1', distance: '300m away' },
//         { name: 'Nearby Hotel 2', distance: '700m away' },
//         { name: 'Nearby Hotel 3', distance: '1.2km away' },
//         { name: 'Nearby Hotel 4', distance: '1.5km away' },
//         { name: 'Nearby Hotel 5', distance: '2.0km away' },
//         { name: 'Nearby Hotel 6', distance: '2.5km away' },
//     ]

//     const data = Array.isArray(hotels) && hotels.length > 0 ? hotels : placeholderNearby
//     const VISIBLE_PER_PAGE = 4

//     // Chunk hotels into pages of 4
//     const pages = React.useMemo(() => {
//         if (!data.length) return []
//         const chunks = []
//         for (let i = 0; i < data.length; i += VISIBLE_PER_PAGE) {
//             chunks.push(data.slice(i, i + VISIBLE_PER_PAGE))
//         }
//         return chunks
//     }, [data])

//     const total = data.length
//     const totalPages = pages.length
//     const [pageIndex, setPageIndex] = React.useState(0)

//     const handleNext = () => {
//         if (totalPages <= 1) return
//         setPageIndex((prev) => (prev + 1) % totalPages)
//     }

//     const handlePrev = () => {
//         if (totalPages <= 1) return
//         setPageIndex((prev) => (prev - 1 + totalPages) % totalPages)
//     }

//     if (!total) {
//         return (
//             <SectionCard
//                 title='Other Nearby Hotels'
//                 subtitle='Explore alternative options around this area.'
//             >
//                 <p className='text-sm text-gray-400'>N/A</p>
//             </SectionCard>
//         )
//     }

//     return (
//         <SectionCard
//             title='Other Nearby Hotels'
//             subtitle='Explore alternative options around this area.'
//         >
//             <div className='flex items-center justify-between mb-3'>
//                 <p className='text-xs text-gray-500'>
//                     Showing {Math.min((pageIndex + 1) * VISIBLE_PER_PAGE, total)} of {total}
//                 </p>

//                 {totalPages > 1 && (
//                     <div className='flex gap-2'>
//                         <button
//                             type='button'
//                             onClick={handlePrev}
//                             className='p-1.5 rounded-full border bg-white hover:bg-gray-50'
//                         >
//                             <ChevronLeft className='h-4 w-4' />
//                         </button>
//                         <button
//                             type='button'
//                             onClick={handleNext}
//                             className='p-1.5 rounded-full border bg-white hover:bg-gray-50'
//                         >
//                             <ChevronRight className='h-4 w-4' />
//                         </button>
//                     </div>
//                 )}
//             </div>

//             <div className='relative overflow-hidden py-3'>
//                 <div
//                     className='flex transition-transform duration-500 ease-out'
//                     style={{ transform: `translateX(-${pageIndex * 100}%)` }}
//                 >
//                     {pages.map((pageHotels, idx) => (
//                         <div
//                             key={idx}
//                             className='min-w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
//                         >
//                             {pageHotels.map((h, i) => (
//                                 <NearbyHotelCard
//                                     key={h.id || h.name || i}
//                                     hotel={h}
//                                 />
//                             ))}
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </SectionCard>
//     )
// }
/* END COMMENTED OUT - Nearby Hotels Section */

/**
 * MAIN PAGE: ManualHotelDetailsPage
 * - Receives hotel + tripContext via location.state
 * - Renders independent, detachable cards for each feature.
 * - For manual trip creation flow
 */
export default function ManualHotelDetailsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { slug } = useParams()
    const hotelFromState = location.state?.hotel || null
    const tripContext = location.state?.tripContext || null

    const { hotel, isLoading, error } = useHotelDetails(hotelFromState, tripContext)

    // Debug logging
    useEffect(() => {
        console.log('ManualHotelDetailsPage - hotelFromState:', hotelFromState)
        console.log('ManualHotelDetailsPage - tripContext:', tripContext)
        console.log('ManualHotelDetailsPage - hotel:', hotel)
        console.log('ManualHotelDetailsPage - isLoading:', isLoading)
        console.log('ManualHotelDetailsPage - error:', error)
    }, [hotelFromState, tripContext, hotel, isLoading, error])

    const fallbackHotelName = slugToTitle(slug) || 'hotel'
    const displayHotelName = hotelFromState?.HotelName || fallbackHotelName

    const scrollToMap = () => {
        const el = document.getElementById('hotel-map')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const handleSelectHotelForTrip = () => {
        try {
            const savedSession = sessionStorage.getItem('createTripSession')
            if (savedSession) {
                const parsed = JSON.parse(savedSession)
                // Update confirmedHotel
                // We use hotelFromState because it contains the original search result data (lat, lon, id)
                // which is needed for the map and other logic in CreateTrip
                parsed.confirmedHotel = hotelFromState
                sessionStorage.setItem('createTripSession', JSON.stringify(parsed))
                navigate('/create-trip')
            } else {
                // If no session, maybe just go back?
                navigate(-1)
            }
        } catch (e) {
            console.error('Error updating session:', e)
            navigate(-1)
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [location.pathname])

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
                <p className='text-red-500 text-sm'>Failed to load hotel details: {error}</p>
            </div>
        )
    }

    // Show basic info while loading API data (don't block the whole page)
    // Only show full loading screen if we don't have any hotel info at all
    if (isLoading && !hotelFromState) {
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
                <p className='text-gray-500 text-sm'>Loading hotel details...</p>
            </div>
        )
    }

    return (
        <div className='p-6 mx-auto md:px-20 lg:w-7xl space-y-6'>
            {/* Back button */}
            <div className=''>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate(-1)}
                    className='flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
            </div>

            {/* Hotel name, select button, photos carousel */}
            <SectionCard
                header={false}
                className="space-y-5"
            >
                <div className='space-y-1'>
                    <h1 className='text-2xl md:text-3xl font-bold flex items-center'>
                        {displayHotelName}
                        {hotel.hotelClass && typeof hotel.hotelClass === 'number' && hotel.hotelClass > 0 && (
                            <span className='ml-2 flex items-center'>
                                {[...Array(Math.min(Math.floor(hotel.hotelClass), 5))].map((_, i) => (
                                    <Star key={i} className='h-4 w-4 md:h-5 md:w-5 fill-yellow-400 text-yellow-400' />
                                ))}
                            </span>
                        )}
                    </h1>
                </div>

                <PhotoCarousel photos={hotel.Photos} altPrefix="Hotel photo" />

                {/* Property Description - moved below photos */}
                <div className='bg-gray-50 rounded-lg p-4 md:p-6 space-y-4'>
                    {/* Location row */}
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                        <div className='flex items-start gap-2'>
                            <MapPin className='h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5' />
                            <span className='text-sm md:text-base text-gray-700'>{hotel.HotelAddress}</span>
                        </div>
                        {hotel.gpsCoordinates && (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${hotel.gpsCoordinates.latitude},${hotel.gpsCoordinates.longitude}`}
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
                        {hotel.numberOfRooms && (
                            <div className='flex items-center gap-2'>
                                <Hotel className='h-4 w-4 text-gray-500' />
                                <span className='text-gray-700'>{hotel.numberOfRooms} rooms</span>
                            </div>
                        )}
                        {hotel.Contact?.phone && (
                            <div className='flex items-center gap-2'>
                                <span className='text-gray-500'>📞</span>
                                <span className='text-gray-700'>{hotel.Contact.phone}</span>
                            </div>
                        )}
                        {hotel.Contact?.website && (
                            <a 
                                href={hotel.Contact.website} 
                                target='_blank' 
                                rel='noopener noreferrer'
                                className='flex items-center gap-2 text-blue-600 hover:underline'
                            >
                                <span>🌐</span>
                                <span>Website</span>
                            </a>
                        )}
                    </div>

                    {/* Description */}
                    {hotel.Description && (
                        <div className='space-y-2 text-sm text-gray-700 leading-relaxed pt-2 border-t border-gray-200'>
                            {hotel.Description.split('\n\n').filter(p => p.trim()).map((p, idx) => (
                                <p key={idx}>{p}</p>
                            ))}
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Services & Amenities */}
            <ServicesAmenitiesCard rawAmenities={hotel.rawAmenities} />

            {/* Property Policies */}
            <PropertyPoliciesCard policies={hotel.policies} />

            {/* Rooms & prices */}
            <HotelRoomsSection
                hotelName={displayHotelName}
                checkInDate={tripContext?.userSelection?.startDate}
                checkOutDate={tripContext?.userSelection?.endDate}
                adults={tripContext?.userSelection?.adults}
                children={tripContext?.userSelection?.children}
                childrenAges={tripContext?.userSelection?.childrenAges}
                gl={'vn'}
                hl={'en'}
                currency={'USD'}
            />

            {/* Ratings & reviews */}
            <HotelReviewsSection 
                rating={hotel.reviewsData?.rating || hotel.Rating} 
                ratingCount={hotel.reviewsData?.ratingCount}
                ratingBreakdown={hotel.reviewsData?.ratingBreakdown}
                reviews={hotel.reviewsData?.reviews}
            />

            {/* Map & nearby places */}
            <HotelMapSection hotel={hotel} />

            {/* Nearby hotels - COMMENTED OUT for now
            <NearbyHotelsSection />
            */}
        </div>
    )
}
