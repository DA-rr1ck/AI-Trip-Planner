import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
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
    Users,
    Check,
    Ban,
    Flame,
    Blocks,
} from 'lucide-react'
import {
    MainHotelMarkerIcon,
    TransportMarkerIcon,
    PoiMarkerIcon,
    DiningMarkerIcon,
} from '@/components/custom/MapMarkerIcons'
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { slugToTitle } from '@/lib/slugToTitle'
import { api } from '@/lib/api'
import SectionCard from '@/components/custom/SectionCard'
import PhotoCarousel from '@/components/custom/PhotoCarousel'
import ScrollTopButton from '@/components/custom/ScrollTopButton'
import SafeImage from '@/components/custom/SafeImage'
import { HOTEL_AMENITIES } from '@/constants/hotelAmenities'
import { useLocale } from '@/context/LocaleContext'

// Safely convert rating (or any value) to a number
function toSafeNumber(value, fallback = null) {
    if (typeof value === 'number') return value
    const num = parseFloat(value)
    return Number.isFinite(num) ? num : fallback
}

// Fetch full hotel details from backend /api/serp/hotel/details and normalize for the UI.
function useHotelDetails(hotel, tripContext) {
    const { language, currency } = useLocale()

    const [header, setHeader] = useState(null)
    const [amenities, setAmenities] = useState(null)
    const [policies, setPolicies] = useState(null)
    const [description, setDescription] = useState(null)
    const [rooms, setRooms] = useState([])
    const [ratingsReviews, setRatingsReviews] = useState(null)
    const [nearbyHighlights, setNearbyHighlights] = useState(null)
    const [nearbyHotels, setNearbyHotels] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const hotelName = hotel?.HotelName || hotel?.name || null
    const userSelection = tripContext?.userSelection || {}

    useEffect(() => {
        if (!hotelName) {
            // Nothing to fetch if we don't have the hotel name
            setHeader(null)
            setAmenities(null)
            setPolicies(null)
            setDescription(null)
            setRooms([])
            setRatingsReviews(null)
            setNearbyHighlights(null)
            setNearbyHotels(null)
            setError(null)
            return
        }

        async function fetchDetails() {
            try {
                setIsLoading(true)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', hotelName)
                params.set('check_in_date', userSelection.startDate)
                params.set('check_out_date', userSelection.endDate)
                params.set('adults', userSelection.adults)

                if (userSelection.children && userSelection.children > 0) {
                    params.set('children', userSelection.children)
                    params.set('children_ages', Array.isArray(userSelection.childrenAges)
                        ? userSelection.childrenAges.join(',')
                        : userSelection.childrenAges)
                }

                params.set('hl', language ?? 'en')
                params.set('currency', currency ?? 'USD')

                const res = await api.get(`/serp/hotel/details?${params.toString()}`)

                const status = res.status;

                if (status !== 200) {
                    const text = await res.text()
                    throw new Error(text || `Request failed with status ${status}`)
                }

                const json = res.data

                const headerData = json.header || {}
                const amenitiesData = json.amenities || null
                const policiesData = json.policies || null
                const descriptionData = json.description || null
                const roomsData = Array.isArray(json.rooms) ? json.rooms : []
                const ratingsReviewsData = json.ratings_reviews || null
                const nearbyHighlightsData = json.nearby_highlights || null
                const nearbyHotelsData = Array.isArray(json.nearby_hotels) ? json.nearby_hotels : []

                setHeader(headerData)
                setAmenities(amenitiesData)
                setPolicies(policiesData)
                setDescription(descriptionData)
                setRooms(roomsData)
                setRatingsReviews(ratingsReviewsData)
                setNearbyHighlights(nearbyHighlightsData)
                setNearbyHotels(nearbyHotelsData)
            } catch (err) {
                if (err.name === 'AbortError') return
                console.error('Failed to load hotel details', err)
                setError(err.message || 'Failed to load hotel details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDetails()
    }, [
        hotelName,
        userSelection.startDate,
        userSelection.endDate,
        userSelection.adults,
        userSelection.children,
        Array.isArray(userSelection.childrenAges)
            ? userSelection.childrenAges.join(',')
            : userSelection.childrenAges,
        language,
        currency,
    ])

    return {
        header,
        amenities,
        policies,
        description,
        rooms,
        ratingsReviews,
        nearbyHighlights,
        nearbyHotels,
        isLoading,
        error,
    }
}

// Header card with hotel name, star rating, address, photo carousel, and "Use this hotel" button
function HeaderCard({
    header,
    hotelFromState,
    slug,
    onMapClick,
    onSelectHotelForTrip,
}) {
    // Hotel name
    const fallbackHotelName = slug ? slugToTitle(slug) || 'hotel' : 'hotel'
    const displayHotelName =
        header?.name || hotelFromState?.HotelName || fallbackHotelName

    // Star rating
    const starCount = Math.round(toSafeNumber(header?.hotel_class, 0) || 0)

    // Address
    const addressText = header?.address || hotelFromState?.HotelAddress

    // Images
    const images =
        Array.isArray(header?.images) && header.images.length > 0
            ? header.images
            : ['/placeholder.jpg']

    return (
        <SectionCard header={false} className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    {/* Name + stars inline */}
                    <div className="flex flex-wrap items-center gap-0 md:gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold">
                            {displayHotelName}
                        </h1>

                        {starCount > 0 && (
                            <div className="flex items-center gap-0.5">
                                {Array.from({ length: starCount }).map(
                                    (_, idx) => (
                                        <Star
                                            key={idx}
                                            className="h-4 w-4 text-yellow-400 fill-yellow-400"
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Address + View on map inline */}
                    <div className="mt-1 text-xs md:text-sm text-gray-600">
                        <span className="inline-flex items-center">
                            <MapPin className="h-4 w-4" />
                            <span className="ml-1">
                                {addressText}
                                <span
                                    onClick={onMapClick}
                                    className="ml-1 font-semibold text-blue-600 active:underline hover:underline cursor-pointer whitespace-nowrap"
                                >
                                    View on map
                                </span>
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={onSelectHotelForTrip}
                        className="rounded-sm text-sm md:text-base md:py-5 bg-blue-600 hover:bg-blue-800 transition-all duration-150 active:scale-95 cursor-pointer"
                    >
                        Use this hotel in trip
                    </Button>
                </div>
            </div>

            <PhotoCarousel photos={images} altPrefix="Hotel photo" />
        </SectionCard>
    )
}

// Helper to normalize amenity keys
function normalizeAmenityKey(value) {
    if (!value) return ''
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '') // remove spaces, dashes, etc.
}

// Services and Amenities card
function ServicesAmenitiesCard({ amenities }) {
    // Raw lists from useHotelDetails → normalized here
    const popular =
        Array.isArray(amenities?.popular) && amenities.popular.length > 0
            ? amenities.popular
            : []
    const groups =
        Array.isArray(amenities?.groups) && amenities.groups.length > 0
            ? amenities.groups
            : []

    const hasAny = popular.length > 0 || groups.length > 0

    const [showAllMobile, setShowAllMobile] = useState(false)

    // Lookup map: config amenity id/label → config object
    const amenityMap = useMemo(() => {
        const map = new Map()
        HOTEL_AMENITIES.forEach(item => {
            if (item.label) {
                map.set(normalizeAmenityKey(item.label), item)
            }
            if (item.id) {
                map.set(normalizeAmenityKey(item.id), item)
            }
        })
        return map
    }, [])

    const findConfigForTitle = title => {
        if (!title) return null
        const key = normalizeAmenityKey(title)
        return amenityMap.get(key) || null
    }

    const renderLabelBadge = (label, available = true) => {
        if (!label) return null
        const isFree = String(label).toLowerCase() === 'free'

        const baseClass =
            'ml-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border'

        if (!available) {
            return (
                <span
                    className={`${baseClass} bg-red-50 text-red-600 border-red-200`}
                >
                    {label}
                </span>
            )
        }

        return (
            <span
                className={
                    baseClass +
                    ' ' +
                    (isFree
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200')
                }
            >
                {label}
            </span>
        )
    }

    const renderPopularItem = (amenity, idx) => {
        const title = amenity.title || 'Amenity'
        const available = amenity.available !== false
        const label = amenity.label

        const config = findConfigForTitle(title)
        const Icon = config?.icon || Check

        return (
            <li
                key={`${title}-${idx}`}
                className="flex items-center gap-2 text-sm"
            >
                {available ? (
                    <Icon className="h-4 w-4 text-gray-900" />
                ) : (
                    <Ban className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-900">{title}</span>
                {label && renderLabelBadge(label, available)}
            </li>
        )
    }

    const renderGroupItem = (item, idx) => {
        const title = item.title || 'Amenity'
        const available = item.available !== false
        const label = item.label

        return (
            <li
                key={`${title}-${idx}`}
                className="flex items-center gap-2 text-sm"
            >
                {available ? (
                    <Check className="h-4 w-4 text-gray-900" />
                ) : (
                    <Ban className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-900">{title}</span>
                {label && renderLabelBadge(label, available)}
            </li>
        )
    }

    // Split list into N columns (for "Most popular amenities")
    const splitIntoColumns = (items, cols = 3) => {
        if (!items.length) return []
        const result = Array.from({ length: cols }, () => [])
        items.forEach((item, index) => {
            result[index % cols].push(item)
        })
        return result
    }

    const popularColumns = useMemo(
        () => splitIntoColumns(popular, 3),
        [popular]
    )

    const groupColumns = useMemo(() => {
        if (!groups.length) return []
        const cols = [[], [], []]
        groups.forEach((group, index) => {
            if (!Array.isArray(group.list) || group.list.length === 0) return
            cols[index % 3].push(group)
        })
        // Remove empty columns at the end
        return cols.filter(col => col.length > 0)
    }, [groups])

    const renderMoreAmenitiesInner = () => (
        <>
            <h3 className="font-semibold text-lg">
                <Blocks className="inline-block mr-2 mb-2 h-5 w-5" />
                More amenities
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
                {groupColumns.map((col, colIdx) => (
                    <div key={colIdx} className="space-y-4">
                        {col.map(group => (
                            <div key={group.title} className="space-y-1">
                                <h4 className="font-semibold text-sm">
                                    {group.title}
                                </h4>
                                <ul className="space-y-1">
                                    {Array.isArray(group.list) &&
                                        group.list.map((item, idx) =>
                                            renderGroupItem(item, idx)
                                        )}
                                </ul>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </>
    )

    return (
        <SectionCard
            title="Services & Amenities"
            subtitle="All services and amenities available at this property."
        >
            {!hasAny ? (
                <p className="text-sm text-gray-400">N/A</p>
            ) : (
                <div className="space-y-4">
                    {/* Part 1: Most popular amenities */}
                    {popularColumns.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">
                                <Flame className="inline-block mr-2 mb-1 h-5 w-5" />
                                Most popular amenities
                            </h3>
                            <div className="grid md:grid-cols-3 gap-1 md:gap-6">
                                {popularColumns.map((col, colIdx) => (
                                    <ul key={colIdx} className="space-y-1">
                                        {col.map((item, idx) =>
                                            renderPopularItem(item, idx)
                                        )}
                                    </ul>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Part 2: More amenities */}
                    {groupColumns.length > 0 && (
                        <>
                            {/* Desktop: always visible */}
                            <div className="space-y-3 hidden md:block">
                                {renderMoreAmenitiesInner()}
                            </div>

                            {/* Mobile: toggled by Show more / Show less */}
                            <div
                                className={`space-y-3 md:hidden ${showAllMobile ? '' : 'hidden'}`}
                            >
                                {renderMoreAmenitiesInner()}
                            </div>

                            {/* Toggle button (mobile only) */}
                            <div className='w-full flex flex-row items-center justify-center'>
                                {showAllMobile ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAllMobile(prev => !prev)
                                        }
                                        className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold bg-blue-600 text-white transition-all duration-150 active:scale-95 md:hidden"
                                    >
                                        Show less amenities
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAllMobile(prev => !prev)
                                        }
                                        className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold text-blue-600 bg-white transition-all duration-150 active:scale-95 md:hidden"
                                    >
                                        Show more amenities
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </SectionCard>
    )
}

// Property Policies card
function PropertyPoliciesCard({ policies }) {
    // Times
    const checkIn = policies?.check_in_time || null
    const checkOut = policies?.check_out_time || null

    // Simple status flags
    const childrenStatus = policies?.children
    const petsStatus = policies?.pets

    // If backend ever sends more detailed text, prefer it
    const childrenText =
        (childrenStatus === 'allowed'
            ? 'Children of all ages are welcome at this property.'
            : childrenStatus === 'prohibited'
                ? 'Children are not allowed to stay at this property.'
                : 'Children policy information is not available for this property.')

    const petsText =
        (petsStatus === 'allowed'
            ? 'Pets are allowed at this property.'
            : petsStatus === 'prohibited'
                ? 'Pets are not allowed at this property.'
                : 'Pets policy information is not available for this property.')

    const ageText = 'The main guest checking in must be at least 18 years old.'

    const renderTimeRow = () => {
        const hasAny = !!checkIn || !!checkOut

        if (!hasAny) {
            return <p className="text-sm text-gray-400">Not specified</p>
        }

        return (
            <div className="flex flex-row justify-around md:flex-col md:space-y-1 rounded-md p-2 md:p-0 bg-gray-100 md:bg-white text-sm text-gray-700">
                <p>
                    <span className="font-semibold">Check-in: </span>
                    {checkIn || 'Not specified'}
                </p>
                <p>
                    <span className="font-semibold">Check-out: </span>
                    {checkOut || 'Not specified'}
                </p>
            </div>
        )
    }

    return (
        <SectionCard
            title="Property Policies"
            subtitle="Important information about check-in, children, pets and more."
        >
            <div className="space-y-4">
                {/* Check-in & Check-out */}
                <div className="grid md:grid-cols-4 gap-1 md:gap-4 text-sm items-start">
                    <div className="font-semibold text-black">
                        Check-in and Check-out Times
                    </div>
                    <div className="col-span-3">
                        {renderTimeRow()}
                    </div>
                </div>

                {/* Children */}
                <div className="grid md:grid-cols-4 gap-1 md:gap-4 text-sm items-start">
                    <div className="font-semibold text-black">
                        Child policies
                    </div>
                    <div className="col-span-3 text-gray-700">
                        <span className='mr-1 inline-block md:hidden'>•</span>
                        {childrenText}
                    </div>
                </div>

                {/* Pets */}
                <div className="grid md:grid-cols-4 gap-1 md:gap-4 text-sm items-start">
                    <div className="font-semibold text-black">
                        Pets
                    </div>
                    <div className="col-span-3 text-gray-700">
                        <span className='mr-1 inline-block md:hidden'>•</span>
                        {petsText}
                    </div>
                </div>

                {/* Age requirements */}
                <div className="grid md:grid-cols-4 gap-1 md:gap-4 text-sm items-start">
                    <div className="font-semibold text-black">
                        Age requirements
                    </div>
                    <div className="col-span-3 text-gray-700">
                        <span className='mr-1 inline-block md:hidden'>•</span>
                        {ageText}
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

// Property Description card
function PropertyDescriptionCard({ description }) {
    const phone = description?.phone ?? null
    const rawWebsite = description?.link ?? null
    const rawText = description?.description ?? null

    // Handle \n from backend: split on one or more newlines into paragraphs
    const paragraphs = rawText
        ? rawText
            .split(/\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
        : []

    const renderPhone = () => {
        if (!phone) {
            return <span className="text-gray-400">N/A</span>
        }
        return <span>{phone}</span>
    }

    // Normalize weird Google redirect URLs (idk y its like this???)
    const normalizeWebsite = url => {
        if (!url) return null
        let value = url.trim()

        try {
            // Pattern 1: relative Google redirect
            if (value.startsWith('/url?')) {
                const params = new URLSearchParams(value.slice('/url?'.length))
                const q = params.get('q')
                if (q) value = q
            }
            // Pattern 2: full Google URL
            else if (
                value.includes('://') &&
                value.includes('google.') &&
                value.includes('/url?')
            ) {
                const parsed = new URL(value)
                const q = parsed.searchParams.get('q')
                if (q) value = q
            }
        } catch (e) {
            // If parsing fails, just keep original value
        }

        return value
    }

    const website = normalizeWebsite(rawWebsite)

    // Format website for display
    const formatWebsiteDisplay = url => {
        if (!url) return ''

        try {
            const normalized = /^https?:\/\//i.test(url)
                ? url
                : `https://${url}`

            const { hostname, pathname } = new URL(normalized)

            // Remove leading "www."
            let host = hostname.replace(/^www\./i, '')

            if (!pathname || pathname === '/') {
                return host
            }

            const shortPath =
                pathname.length > 20 ? pathname.slice(0, 20) + '…' : pathname

            return `${host}${shortPath}`
        } catch (e) {
            // Fallback: strip protocol only
            return url.replace(/^https?:\/\//i, '')
        }
    }

    const renderWebsite = () => {
        if (!website) {
            return <span className="text-gray-400">N/A</span>
        }

        const display = formatWebsiteDisplay(website)
        const href = /^https?:\/\//i.test(website)
            ? website
            : `https://${website}`

        return (
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline break-all"
            >
                {display}
            </a>
        )
    }

    return (
        <SectionCard
            title="Property Description"
        >
            <div className="space-y-5">
                {/* Contact info */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-5 text-sm">
                    <div className="flex gap-2">
                        <span className="font-semibold">Phone:</span>
                        {renderPhone()}
                    </div>
                    <div className="flex gap-2">
                        <span className="font-semibold">Website:</span>
                        {renderWebsite()}
                    </div>
                </div>

                {/* Description text */}
                <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    {paragraphs.length > 0 ? (
                        paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
                    ) : rawText ? (
                        <p>{rawText}</p>
                    ) : (
                        <p className="text-gray-400">
                            No description available for this property.
                        </p>
                    )}
                </div>
            </div>
        </SectionCard>
    )
}

// Rooms list card
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
        setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : prev))
    }

    const handleNextMain = () => {
        setSelectedImageIndex((prev) =>
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
                    className="h-3 w-auto rounded-sm bg-white"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            )
        }

        return null
    }

    return (
        <div className="border rounded-lg p-0 md:p-3 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 bg-gray-100">
            {/* Image with hover zoom + dialog trigger */}
            <Dialog
                onOpenChange={(open) => {
                    if (open) setSelectedImageIndex(0)
                }}
            >
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className="relative w-full h-44 md:w-72 md:h-48 rounded-t-md md:rounded-md overflow-hidden bg-gray-200 flex-shrink-0 group cursor-pointer"
                    >
                        <img
                            src={previewImage}
                            alt={room.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
                            View photos ({images.length})
                        </span>
                    </button>
                </DialogTrigger>

                <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="mt-2 md:mt-0 text-left">
                            {room.name}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Scrollable content inside the constrained dialog */}
                    <div className="mt-2 md:mt-3 space-y-4 flex-1 overflow-y-auto">
                        {/* Big preview with arrows */}
                        <div className="relative w-full overflow-hidden rounded-lg bg-gray-200">
                            {showPrevArrow && (
                                <button
                                    type="button"
                                    onClick={handlePrevMain}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow p-1"
                                >
                                    <ChevronLeft className="h-5 w-5 text-gray-800" />
                                </button>
                            )}

                            <img
                                src={selectedImage}
                                alt={`${room.name} selected`}
                                className="w-full max-h-[50vh] object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />

                            {showNextArrow && (
                                <button
                                    type="button"
                                    onClick={handleNextMain}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow p-1"
                                >
                                    <ChevronRight className="h-5 w-5 text-gray-800" />
                                </button>
                            )}

                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-xs text-white">
                                {selectedImageIndex + 1}/{images.length}
                            </div>
                        </div>

                        {/* Thumbnails row – active thumb auto-scrolls into view */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((src, idx) => {
                                const isActive = idx === selectedImageIndex
                                return (
                                    <button
                                        type="button"
                                        key={idx}
                                        onClick={() =>
                                            setSelectedImageIndex(idx)
                                        }
                                        ref={isActive ? activeThumbRef : null}
                                        className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-20 overflow-hidden rounded-md bg-gray-100 border ${isActive
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : 'border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={src}
                                            alt={`${room.name} photo ${idx + 1
                                                }`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Content */}
            <div className="w-full md:flex-1 flex flex-col justify-around px-3 pb-3 md:px-0 md:pb-0">
                {/* Left: name, meta, description */}
                <div className="space-y-2 md:space-y-3">
                    <h4 className="font-semibold text-left text-md md:text-xl flex items-center gap-1">
                        <BedDouble className="h-4 w-4 md:h-5 md:w-5 text-gray-600 hidden md:block" />
                        {room.name}
                    </h4>

                    {hasMeta && (
                        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                            {room.numGuests && (
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                                    <span className="text-gray-600">
                                        Up to {room.numGuests} guest
                                        {room.numGuests > 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {room.official && (
                                <span className="px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                                    Official site
                                </span>
                            )}
                        </div>
                    )}

                    {room.description && (
                        <p className="text-xs md:text-sm text-gray-600">
                            {room.description}
                        </p>
                    )}
                </div>

                {/* Right: price, link, source */}
                <div className="flex flex-col items-end justify-center gap-2 mt-4">
                    <div>
                        <p className="text-xl md:text-2xl font-semibold text-blue-600 leading-tight">
                            {room.price || 'Price on request'} / Night
                        </p>

                        {isFallback && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                From lowest available rate
                            </p>
                        )}
                    </div>

                    {/* Link */}
                    {room.link && (
                        <div className="">
                            <a
                                href={room.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-blue-400 text-xs md:text-base font-medium text-blue-500 hover:bg-blue-700 hover:text-white transition-all duration-150"
                            >
                                View deal
                                <ArrowRight className="h-3 w-3 md:h-5 md:w-5" />
                            </a>
                        </div>
                    )}

                    {/* Source */}
                    {room.source && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-700 rounded-md px-2 py-0.5 bg-white">
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

// Rooms & Prices card
function HotelRoomsSection({ rooms, isLoading, error }) {
    const hasRooms = Array.isArray(rooms) && rooms.length > 0
    const [showAllMobile, setShowAllMobile] = React.useState(false)

    const visibleMobileRooms = React.useMemo(() => {
        if (!hasRooms) return []
        if (showAllMobile) return rooms
        return rooms.slice(0, 2)
    }, [rooms, hasRooms, showAllMobile])

    return (
        <SectionCard title="Rooms & Prices">
            {/* Loading state */}
            {rooms === null && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                    <span>Fetching live rooms and prices…</span>
                </div>
            )}

            {/* Either rooms empty or error */}
            {rooms !== null && !hasRooms && (
                <p className="mt-2 text-sm text-gray-600">
                    {error
                        ? 'Unable to load rooms right now. Please try again later or adjust your dates.'
                        : 'There are no available rooms for these dates with the current guest selection.'}
                </p>
            )}

            {/* Rooms list */}
            {rooms !== null && hasRooms && (
                <>
                    {/* Mobile: show up to 3, toggle for more/less */}
                    <div className="space-y-3 mt-2 md:hidden">
                        {visibleMobileRooms.map((room, idx) => (
                            <RoomCard
                                key={room.name || idx}
                                room={room}
                            />
                        ))}

                        {rooms.length > 2 && (
                            <div className='w-full flex flex-row items-center justify-center'>
                                {showAllMobile ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAllMobile(prev => !prev)
                                        }
                                        className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold bg-blue-600 text-white transition-all duration-150 active:scale-95 md:hidden"
                                    >
                                        Show less rooms
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAllMobile(prev => !prev)
                                        }
                                        className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold text-blue-600 bg-white transition-all duration-150 active:scale-95 md:hidden"
                                    >
                                        Show more rooms
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop: always show all rooms */}
                    <div className="space-y-3 mt-2 hidden md:block">
                        {rooms.map((room, idx) => (
                            <RoomCard
                                key={room.name || idx}
                                room={room}
                            />
                        ))}
                    </div>
                </>
            )}
        </SectionCard>
    )
}

// Single review card
function HotelReviewCard({ item }) {
    const source = item?.source || 'Review'
    const sourceIcon = item?.source_icon || null
    const sourceRating = toSafeNumber(item?.source_rating, null)

    const ur = item?.user_review || {}
    const userRating = toSafeNumber(ur?.rating, null)
    const displayRating = userRating ?? sourceRating

    const username = ur?.username || null
    const date = ur?.date || null
    const rawComment = typeof ur?.comment === 'string' ? ur.comment : ''

    const [expanded, setExpanded] = React.useState(false)

    const MAX_CHARS = 180
    const isLong = rawComment.length > MAX_CHARS
    const displayComment =
        expanded || !isLong
            ? rawComment
            : rawComment.slice(0, MAX_CHARS).trimEnd() + '…'

    const toggleExpanded = (e) => {
        e.stopPropagation()
        setExpanded((prev) => !prev)
    }

    const renderWithLineBreaks = (value) => {
        if (!value) return null
        const lines = value.split(/\r?\n/)
        return lines.map((line, idx) => (
            <React.Fragment key={idx}>
                {line}
                {idx < lines.length - 1 && <br />}
            </React.Fragment>
        ))
    }

    return (
        <div className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm">
            {/* Top: source + rating */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {sourceIcon && (
                        <img
                            src={sourceIcon}
                            alt={source}
                            className="h-5 w-5 rounded-sm object-contain"
                        />
                    )}
                    <span className="text-sm font-semibold text-gray-800">
                        {source}
                    </span>
                </div>

                {displayRating != null && (
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                        <span>{displayRating.toFixed(1)}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                )}
            </div>

            {/* Middle: username + date */}
            {(username || date) && (
                <p className="mt-1 text-xs text-gray-500">
                    {username && <span>{username}</span>}
                    {username && date && <span> • </span>}
                    {date && <span>{date}</span>}
                </p>
            )}

            {/* Comment with excerpt & line breaks */}
            {rawComment && (
                <div className="mt-2 text-sm text-gray-700 leading-relaxed">
                    <p>{renderWithLineBreaks(displayComment)}</p>

                    {isLong && (
                        <button
                            type="button"
                            onClick={toggleExpanded}
                            className="mt-1 text-[11px] text-blue-600 hover:underline font-medium"
                        >
                            {expanded ? 'Show less' : 'Load more'}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// Ratings & reviews card.
function HotelReviewsSection({ ratingsReviews }) {
    const [visibleCount, setVisibleCount] = useState(2)

    const rr = ratingsReviews || {}

    // --- Overall rating ---
    const overallRating = toSafeNumber(rr.overall_rating, null)

    // --- Total reviews ---
    let totalReviews = null

    if (typeof rr.reviews === 'number' && Number.isFinite(rr.reviews)) {
        totalReviews = rr.reviews
    } else if (Array.isArray(rr.user_reviews)) {
        const sumFromSources = rr.user_reviews.reduce((sum, item) => {
            const n = Number(item?.reviews)
            return Number.isFinite(n) ? sum + n : sum
        }, 0)
        if (sumFromSources > 0) {
            totalReviews = sumFromSources
        }
    }

    if (totalReviews == null) {
        totalReviews = 0
    }

    // --- Detailed ratings (categories or star distribution) ---
    const rawRatingItems = Array.isArray(rr.ratings) ? rr.ratings : []

    const hasStarDistribution = rawRatingItems.some(
        (item) => typeof item?.stars === 'number'
    )

    let starDistribution = null
    let categoryRatings = []

    if (hasStarDistribution) {
        const dist = {}
        rawRatingItems.forEach((item) => {
            const star = item?.stars
            const count = Number(item?.count ?? item?.reviews ?? 0)
            if (typeof star === 'number' && Number.isFinite(count)) {
                dist[star] = (dist[star] || 0) + count
            }
        })
        starDistribution = dist
    } else {
        categoryRatings = rawRatingItems
            .map((item) => {
                const label =
                    item?.name ??
                    item?.label ??
                    item?.category ??
                    item?.source ??
                    null

                const value = toSafeNumber(
                    item?.value ?? item?.rating_score,
                    null
                )

                const max =
                    toSafeNumber(
                        item?.max_rating ??
                        item?.max ??
                        item?.out_of ??
                        5,
                        5
                    ) || 5

                if (!label || value == null) return null
                return { label, value, max }
            })
            .filter(Boolean)
    }

    // --- User reviews ---
    const userReviewsRaw = Array.isArray(rr.user_reviews)
        ? rr.user_reviews
        : []

    const hasUserReviews = userReviewsRaw.length > 0

    // Section-level "show first 3, then Load more"
    const visibleReviews = userReviewsRaw.slice(0, visibleCount)
    const canLoadMore = userReviewsRaw.length > visibleCount

    const handleLoadMore = () => {
        setVisibleCount(userReviewsRaw.length)
    }

    const handleLoadLess = () => {
        setVisibleCount(2)
    }

    // --- Check if we have any data to show at all ---
    const hasAnyData =
        overallRating != null ||
        totalReviews > 0 ||
        categoryRatings.length > 0 ||
        (starDistribution && Object.keys(starDistribution).length > 0) ||
        hasUserReviews

    if (!hasAnyData) {
        return (
            <SectionCard
                title="Ratings & Reviews"
                subtitle="Guest ratings and reviews for this property."
            >
                <p className="text-sm text-gray-400">
                    No rating information available for this property yet.
                </p>
            </SectionCard>
        )
    }

    // --- Render helpers ---
    const renderStarDistribution = () => {
        if (!starDistribution) return null

        const total = Object.values(starDistribution).reduce(
            (sum, c) => sum + c,
            0
        )
        if (!total) return null

        const stars = [5, 4, 3, 2, 1]

        return (
            <div className="space-y-1">
                {stars.map((star) => {
                    const count = starDistribution[star] ?? 0
                    const percent = total ? (count / total) * 100 : 0

                    return (
                        <div
                            key={star}
                            className="flex items-center gap-2 text-xs"
                        >
                            <span className="w-6 flex items-center text-gray-600">
                                {star}
                                <Star className="inline-block h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <span className="w-10 text-right">
                                {count}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderCategoryRatings = () => {
        if (categoryRatings.length === 0) return null

        return (
            <div className="grid grid-cols-2 gap-3 text-xs">
                {categoryRatings.map((item, idx) => {
                    const pct = Math.min(
                        100,
                        (item.value / item.max) * 100
                    )

                    return (
                        <div key={idx} className="space-y-1">
                            <p className="font-medium text-gray-700">
                                {item.label}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right text-gray-700">
                                    {item.value.toFixed(1)}/{item.max}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // --- Render ---
    return (
        <SectionCard
            title="Ratings & Reviews"
            subtitle="Guest ratings and recent reviews from popular travel sites."
        >
            <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8">
                {/* Left: Summary + breakdown */}
                <div className="space-y-6">
                    {/* Overall rating */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-yellow-50 border border-yellow-200">
                            {overallRating != null ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {overallRating.toFixed(1)}
                                    </span>
                                    <div className="flex">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">
                                    N/A
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-800">
                                Guest rating
                            </p>
                            <p className="text-sm text-gray-600">
                                {totalReviews > 0
                                    ? `Based on ${totalReviews.toLocaleString()} review${totalReviews > 1 ? 's' : ''}.`
                                    : 'No reviews yet.'}
                            </p>
                        </div>
                    </div>

                    {/* Star distribution or category ratings */}
                    {renderStarDistribution()}
                    {renderCategoryRatings()}
                </div>

                {/* Right: recent guest reviews with Load more */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Recent guest reviews
                    </p>

                    {!hasUserReviews ? (
                        <p className="text-sm text-gray-400">
                            Couldn't fetch any guest reviews for this property.
                        </p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {visibleReviews.map((item, idx) => (
                                    <HotelReviewCard
                                        key={idx}
                                        item={item}
                                    />
                                ))}
                            </div>

                            {canLoadMore ? (
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    className="mt-2 text-xs text-blue-600 transition-all duration-150 active:scale-95 hover:underline font-medium"
                                >
                                    Load more reviews
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleLoadLess}
                                    className="mt-2 text-xs text-blue-600 transition-all duration-150 active:scale-95 hover:underline font-medium"
                                >
                                    Load less reviews
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </SectionCard>
    )
}

// Helper: move map when selected highlight changes
function MapViewController({ hotelPosition, selectedHighlight }) {
    const map = useMap()

    React.useEffect(() => {
        if (selectedHighlight && selectedHighlight.position) {
            map.flyTo(selectedHighlight.position, 15)
        } else if (hotelPosition) {
            map.setView(hotelPosition, 13)
        }
    }, [hotelPosition, selectedHighlight, map])

    return null
}

function ResizeOnExpand({ isMapExpanded }) {
    const map = useMap()

    React.useEffect(() => {
        setTimeout(() => {
            map.invalidateSize()
        }, 0)
    }, [isMapExpanded, map])

    return null
}

/**
 * Map card:
 * - Map on the left (centered on hotel)
 * - Tabs on the right: Transport, POIs, Dining
 * - Active tab controls markers + list
 * - Click highlight → draw simple route (polyline) from hotel to highlight
 *   + external Google Maps directions link
 */
function HotelMapSection({ nearbyHighlights, header, hotelFromState }) {
    const [activeTab, setActiveTab] = useState('transport')
    const [selectedHighlight, setSelectedHighlight] = useState(null)
    const [routeCoords, setRouteCoords] = useState([])
    const [isMapExpanded, setIsMapExpanded] = useState(false)

    if (!nearbyHighlights) {
        return (
            <SectionCard
                id="hotel-map"
                title="Location & Nearby Places"
                subtitle="Explore where the property is located and what’s nearby."
            >
                <p className="text-sm text-gray-400">
                    Map is not available for this property.
                </p>
            </SectionCard>
        )
    }

    // Helper to safely convert hotel_coordinates -> { lat, lng }
    const toLatLng = (gps) => {
        if (!gps) return null
        const lat = Number(gps.latitude)
        const lng = Number(gps.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return { lat, lng }
    }

    // Hotel coordinates: nearby_highlights.hotel_coordinates
    const hotelPosition = toLatLng(nearbyHighlights.hotel_coordinates) || null;

    if (!hotelPosition) {
        return (
            <SectionCard
                id="hotel-map"
                title="Location & Nearby Places"
                subtitle="Explore where the property is located and what’s nearby."
            >
                <p className="text-sm text-gray-400">
                    We couldn’t determine the exact location of this property.
                </p>
            </SectionCard>
        )
    }

    const normalizePlaceList = (list, categoryKey) => {
        if (!Array.isArray(list)) return []
        return list
            .map((place, index) => {
                const gps = place.gps_coordinates
                const pos = toLatLng(gps)
                if (!pos) return null

                // Use first transportation entry (if any) for a small hint
                const firstTrans =
                    Array.isArray(place.transportations) &&
                        place.transportations.length > 0
                        ? place.transportations[0]
                        : null

                const durationText =
                    typeof firstTrans?.duration === 'string'
                        ? firstTrans.duration
                        : null

                const typeText =
                    typeof firstTrans?.type === 'string'
                        ? firstTrans.type
                        : null

                return {
                    id: `${categoryKey}-${index}-${place.name || 'place'}`,
                    name: place.name || 'Nearby place',
                    category: place.category || null,
                    position: pos,
                    rating:
                        place.rating != null
                            ? Number(place.rating)
                            : null,
                    reviews:
                        place.reviews != null
                            ? Number(place.reviews)
                            : null,
                    thumbnail: place.thumbnail || null,
                    durationText,
                    typeText,
                }
            })
            .filter(Boolean)
    }

    const transportList = React.useMemo(
        () => normalizePlaceList(nearbyHighlights.transport, 'transport'),
        [nearbyHighlights.transport]
    )

    const poisList = React.useMemo(
        () => normalizePlaceList(nearbyHighlights.pois, 'pois'),
        [nearbyHighlights.pois]
    )

    const diningList = React.useMemo(
        () => normalizePlaceList(nearbyHighlights.dining, 'dining'),
        [nearbyHighlights.dining]
    )

    // Pick first non-empty category as default tab
    const initialTab = useMemo(() => {
        if (transportList.length > 0) return 'transport'
        if (poisList.length > 0) return 'pois'
        if (diningList.length > 0) return 'dining'
        return 'transport'
    }, [transportList.length, poisList.length, diningList.length])

    // Keep activeTab in sync when data changes
    useEffect(() => {
        setActiveTab(initialTab)
        setSelectedHighlight(null)
        setRouteCoords([])
    }, [initialTab])

    const activeList = useMemo(() => {
        switch (activeTab) {
            case 'transport':
                return transportList
            case 'pois':
                return poisList
            case 'dining':
                return diningList
            default:
                return []
        }
    }, [activeTab, transportList, poisList, diningList])

    const fetchRoute = useCallback(
        async (highlight) => {
            if (!highlight) {
                setRouteCoords([])
                return
            }

            try {
                setRouteCoords([])

                const url = `https://router.project-osrm.org/route/v1/driving/${hotelPosition.lng},${hotelPosition.lat};${highlight.position.lng},${highlight.position.lat}?overview=full&geometries=geojson`

                const res = await fetch(url)
                const json = await res.json()

                if (
                    json.code === 'Ok' &&
                    json.routes &&
                    json.routes[0]?.geometry?.coordinates
                ) {
                    const coords =
                        json.routes[0].geometry.coordinates.map(
                            ([lng, lat]) => [lat, lng]
                        )
                    setRouteCoords(coords)
                } else {
                    console.warn('OSRM routing failed:', json)
                }
            } catch (err) {
                console.error('Error fetching route from OSRM:', err)
            }
        },
        [hotelPosition.lat, hotelPosition.lng]
    )

    const handleSelectHighlight = (item) => {
        setSelectedHighlight(item)
        fetchRoute(item)
    }

    const buildGoogleMapsDirUrl = (highlight) => {
        if (!highlight) return '#'
        const origin = `${hotelPosition.lat},${hotelPosition.lng}`
        const dest = `${highlight.position.lat},${highlight.position.lng}`
        return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            origin
        )}&destination=${encodeURIComponent(dest)}`
    }

    const renderTabs = () => (
        <div className="h-7 flex gap-2 mb-3">
            {[
                { id: 'transport', label: 'Transport' },
                { id: 'pois', label: 'POIs' },
                { id: 'dining', label: 'Dining' },
            ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id)
                            setSelectedHighlight(null)
                            setRouteCoords([])
                        }}
                        className={`px-3 py-1 text-xs rounded-full border ${isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )

    const renderList = () => (
        <div className="flex flex-col h-full">
            {renderTabs()}

            {activeList.length === 0 ? (
                <p className="text-xs text-gray-400">
                    No nearby places for this category.
                </p>
            ) : (
                <div className="flex flex-col-reverse md:flex-col">
                    <div className="space-y-2 overflow-y-auto max-h-80 md:max-h-[640px] pr-1">
                        {activeList.map((item) => {
                            const isActive = selectedHighlight?.id === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectHighlight(item)}
                                    className={`w-full text-left p-2 rounded-md border text-xs ${isActive
                                        ? 'border-blue-600 bg-blue-100'
                                        : 'border-gray-300 bg-white hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {item.thumbnail && (
                                            <SafeImage
                                                src={item.thumbnail}
                                                alt={item.name}
                                                loading='lazy'
                                                referrerPolicy='no-referrer'
                                                className="w-20 h-20 rounded object-cover flex-shrink-0"
                                            />
                                        )}

                                        <div className="flex-1">
                                            <p className="font-semibold text-base md:text-lg leading-5 text-black">
                                                {item.name}
                                            </p>
                                            {item.category && (
                                                <p className="text-[11px] text-gray-500">
                                                    {item.category}
                                                </p>
                                            )}
                                            {item.rating != null && (
                                                <span className="flex items-center gap-1 mt-1 text-md md:text-sm font-bold text-gray-600">
                                                    <p className='rounded-full rounded-tr-none bg-blue-600 text-white px-2 py-0.5'>
                                                        {item.rating.toFixed(1)}/5
                                                    </p>
                                                    <p className='text-blue-600'>
                                                        {item.reviews ? `${item.reviews} reviews` : ''}
                                                    </p>
                                                </span>
                                            )}
                                            {item.durationText && (
                                                <p className="mt-1 text-[11px] text-gray-600">
                                                    Around {item.durationText} by {item.typeText || 'transportation'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {selectedHighlight && (
                        <a
                            href={buildGoogleMapsDirUrl(selectedHighlight)}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 md:mb-0 md:mt-3 text-[11px] text-blue-600 transition-all duration-150 active:scale-95 hover:underline"
                        >
                            View route in Google Maps
                        </a>
                    )}
                </div>
            )}
        </div>
    )

    // Marker icon based on active tab
    const getMarkerIconForTab = () => {
        switch (activeTab) {
            case 'transport':
                return TransportMarkerIcon
            case 'pois':
                return PoiMarkerIcon
            case 'dining':
                return DiningMarkerIcon
            default:
                return TransportMarkerIcon
        }
    }

    const markerIconForTab = getMarkerIconForTab()

    return (
        <SectionCard
            id="hotel-map"
            title="Location & Nearby Places"
            subtitle="See where this property is located and what’s nearby."
            rightSlot={
                <div className="flex gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500 " />{' '}
                        Hotel
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />{' '}
                        Transport
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />{' '}
                        POIs
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500" />{' '}
                        Dining
                    </span>
                </div>
            }
            className="md:mt-5 md:h-[750px]"
        >
            <div
                className={`h-full grid gap-4 ${isMapExpanded
                    ? 'md:grid-cols-1'
                    : 'md:grid-cols-[minmax(0,3fr)_minmax(0,1.4fr)]'
                    }`}
            >
                {/* Map */}
                <div className="relative h-100 md:h-full rounded-lg overflow-hidden border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setIsMapExpanded(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-[1000] hidden md:flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-gray-200 shadow-md text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                    >
                        {isMapExpanded ? (
                            <ChevronLeft className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>

                    <MapContainer
                        center={hotelPosition}
                        zoom={15}
                        scrollWheelZoom={false}
                        className="h-full w-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapViewController
                            hotelPosition={hotelPosition}
                            selectedHighlight={selectedHighlight}
                        />

                        <ResizeOnExpand isMapExpanded={isMapExpanded} />

                        {/* Hotel marker */}
                        <Marker
                            position={hotelPosition}
                            icon={MainHotelMarkerIcon}
                        >
                            <Popup>
                                <div className="text-xs">
                                    <p className="font-semibold">
                                        {header?.name || hotelFromState?.HotelName || 'Hotel'}
                                    </p>
                                    {header?.address || hotelFromState?.HotelAddress ? (
                                        <p className="text-gray-600">
                                            {header?.address || hotelFromState?.HotelAddress}
                                        </p>
                                    ) : null}
                                </div>
                            </Popup>
                        </Marker>

                        {/* Active tab markers */}
                        {activeList.map((item) => (
                            <Marker
                                key={item.id}
                                position={item.position}
                                icon={markerIconForTab}
                                eventHandlers={{
                                    click: () => handleSelectHighlight(item),
                                }}
                            >
                                <Popup>
                                    <div className="flex flex-col gap-1 w-60 text-md">
                                        {item.thumbnail && (
                                            <SafeImage
                                                src={item.thumbnail}
                                                alt={item.name}
                                                loading='lazy'
                                                referrerPolicy='no-referrer'
                                                className="h-full rounded object-cover flex-shrink-0"
                                            />
                                        )}
                                        <p className="!m-0 font-semibold text-lg leading-5 text-black">
                                            {item.name}
                                        </p>
                                        {item.category && (
                                            <p className="!m-0 text-gray-600">
                                                {item.category}
                                            </p>
                                        )}
                                        {item.rating != null && (
                                            <span className="flex items-center gap-1 text-md md:text-sm font-bold text-gray-600">
                                                <p className='!m-0 rounded-full rounded-tr-none bg-blue-600 text-white px-2 py-0.5'>
                                                    {item.rating.toFixed(1)}/5
                                                </p>
                                                <p className='!m-0 text-blue-600'>
                                                    {item.reviews ? `${item.reviews} reviews` : ''}
                                                </p>
                                            </span>
                                        )}
                                        {item.durationText && (
                                            <p className="!m-0 text-[11px] text-gray-600">
                                                Around {item.durationText}
                                            </p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Real route line (OSRM) */}
                        {routeCoords.length > 0 && (
                            <Polyline
                                positions={routeCoords}
                                pathOptions={{
                                    color: '#2563eb',
                                    weight: 4,
                                    opacity: 0.8,
                                }}
                            />
                        )}
                    </MapContainer>
                </div>

                {/* Right side: tabs + list */}
                {!isMapExpanded && (
                    <div className="flex flex-col text-sm">
                        <p className="mb-2 text-xs text-gray-600 hidden md:block">
                            Centered at:{' '}
                            {hotelFromState?.HotelAddress || hotelFromState?.HotelName || 'This property'}
                        </p>
                        {renderList()}
                    </div>
                )}
            </div>
        </SectionCard>
    )
}

// Single nearby hotel card
function NearbyHotelCard({ hotel }) {
    const navigate = useNavigate()
    const location = useLocation()
    const tripContext = location.state?.tripContext || null

    const name = hotel?.name || 'Hotel'

    const imageUrl = hotel?.thumbnail ?? '/placeholder.jpg'

    const ratingValue = toSafeNumber(hotel?.overall_rating, null)

    const reviewsText =
        typeof hotel?.reviews === 'number'
            ? `${hotel.reviews.toLocaleString()} reviews`
            : hotel?.reviews || null

    const priceText = hotel?.price || null

    const openInNewTab = useCallback(() => {
        const slug = encodeURIComponent(name || 'hotel');
        navigate(`/hotel/${slug}`, {
            state: {
                hotel,
                tripContext
            },
        })
    }, [navigate])

    return (
        <button
            type="button"
            onClick={() => openInNewTab(hotel)}
            className="w-full text-left"
        >
            <div className="h-fit md:h-[360px] border border-gray-300 rounded-lg overflow-hidden bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col md:gap-3 cursor-pointer">
                {/* Thumbnail */}
                <div className="w-full h-36 md:h-44 flex-shrink-0 bg-gray-200">
                    <SafeImage
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between gap-1 px-4 py-2">
                    <div>
                        <h4 className="font-semibold text-sm md:text-base line-clamp-2">
                            {name}
                        </h4>

                        <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] md:text-xs text-gray-600">
                            {ratingValue != null && (
                                <span className="inline-flex items-center gap-1">
                                    <span className="font-semibold">
                                        {ratingValue.toFixed(1)}
                                    </span>
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                </span>
                            )}

                            {reviewsText && (
                                <span className="text-gray-500">
                                    • {reviewsText}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="inline-flex flex-col items-end gap-1 self-end text-[11px] md:text-xs text-blue-600">
                        {priceText && (
                            <p className="mt-1 text-lg md:text-2xl text-black font-medium">
                                {priceText}
                            </p>
                        )}
                        <span className='flex flex-row items-center gap-1 hover:underline'>
                            View details <ArrowRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </div>
        </button>
    )
}

// Nearby hotels section with pagination
function NearbyHotelsSection({ nearbyHotels }) {
    const data = Array.isArray(nearbyHotels) ? nearbyHotels : []
    const hasData = data.length > 0

    if (!hasData) {
        return (
            <SectionCard
                title="Other Nearby Hotels"
                subtitle="Explore alternative options around this area."
            >
                <p className="text-sm text-gray-400">
                    No nearby hotels found.
                </p>
            </SectionCard>
        )
    }

    const VISIBLE_PER_PAGE = 4

    // Chunk hotels into pages of 4 (for desktop)
    const pages = React.useMemo(() => {
        if (!data.length) return []
        const chunks = []
        for (let i = 0; i < data.length; i += VISIBLE_PER_PAGE) {
            chunks.push(data.slice(i, i + VISIBLE_PER_PAGE))
        }
        return chunks
    }, [data])

    const total = data.length
    const totalPages = pages.length
    const [pageIndex, setPageIndex] = React.useState(0)

    const handleNext = () => {
        if (totalPages <= 1) return
        setPageIndex((prev) => (prev + 1) % totalPages)
    }

    const handlePrev = () => {
        if (totalPages <= 1) return
        setPageIndex((prev) =>
            prev === 0 ? totalPages - 1 : prev - 1
        )
    }

    // Mobile data: always just first 4
    const mobileData = data.slice(0, 4)

    return (
        <SectionCard
            title="Other Nearby Hotels"
            subtitle="Explore alternative options around this area."
        >
            {/* Header row: desktop nav */}
            <div className="flex justify-end gap-2 mb-3">
                {totalPages > 1 && (
                    <div className="hidden md:flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="p-1.5 rounded-full border bg-white hover:bg-gray-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="p-1.5 rounded-full border bg-white hover:bg-gray-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* MOBILE: no nav, max 4 cards in a single column */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {mobileData.map((h, i) => (
                    <NearbyHotelCard
                        key={h.id || h.property_token || h.name || i}
                        hotel={h}
                    />
                ))}
            </div>

            {/* DESKTOP: nav + all hotels via paged slider */}
            <div className="hidden md:block relative overflow-hidden py-3">
                <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                        transform: `translateX(-${pageIndex * 100}%)`,
                    }}
                >
                    {pages.map((pageHotels, idx) => (
                        <div
                            key={idx}
                            className="min-w-full grid grid-cols-2 lg:grid-cols-4 gap-3"
                        >
                            {pageHotels.map((h, i) => (
                                <NearbyHotelCard
                                    key={h.name || `${idx}-${i}`}
                                    hotel={h}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </SectionCard>
    )
}

/**
 * MAIN PAGE: HotelDetailPage
 * - Receives hotel + tripContext via location.state
 * - Renders independent, detachable cards for each feature.
 */
export default function HotelDetailsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { slug } = useParams()
    const hotelFromState = location.state?.hotel || null
    const tripContext = location.state?.tripContext || null

    const {
        header,
        amenities,
        policies,
        description,
        rooms,
        ratingsReviews,
        nearbyHighlights,
        nearbyHotels,
        isLoading,
        error,
    } = useHotelDetails(hotelFromState, tripContext)

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

    if (isLoading) {
        return (
            <div className="w-full flex justify-center items-center gap-2 mt-20 md:px-20">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                <span className="text-gray-600 text-md">
                    Loading hotel details...
                </span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 md:px-20 lg:px-40">
                <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <p className='text-red-500 text-sm text-center'>
                    {error}
                </p>
            </div>
        )
    }

    return (
        <div className='p-6 mx-auto md:px-20 lg:w-7xl space-y-6'>
            {/* Back button */}
            <div className="">
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate(-1)}
                    className='flex items-center gap-2'
                >
                    <ArrowLeft className='h-4 w-4' /> Back to trip
                </Button>
            </div>

            <HeaderCard
                header={header}
                hotelFromState={hotelFromState}
                slug={slug}
                onMapClick={scrollToMap}
                onSelectHotelForTrip={handleSelectHotelForTrip}
            />

            <ServicesAmenitiesCard amenities={amenities} />

            <PropertyPoliciesCard policies={policies} />

            <PropertyDescriptionCard description={description} />

            <HotelRoomsSection
                rooms={rooms}
                isLoading={isLoading}
                error={error}
            />

            <HotelReviewsSection ratingsReviews={ratingsReviews} />

            <HotelMapSection
                nearbyHighlights={nearbyHighlights}
                header={header}
                hotelFromState={hotelFromState}
            />

            <NearbyHotelsSection
                nearbyHotels={nearbyHotels}
            />

            <ScrollTopButton />
        </div>
    )
}
