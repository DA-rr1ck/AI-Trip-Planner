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
} from 'lucide-react'

import { slugToTitle } from '@/lib/slugToTitle'
import SectionCard from '@/components/custom/SectionCard'
import PhotoCarousel from '@/components/custom/PhotoCarousel'
import { HOTEL_AMENITIES_CONFIG, PROPERTY_POLICY_FIELDS } from '@/constants/hotelAmenities'

// Safely convert rating (or any value) to a number
function toSafeNumber(value, fallback = null) {
    if (typeof value === 'number') return value;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
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

    useEffect(() => {
        if (!hotelName) {
            setRooms([])
            setError(null)
            return
        }

        const controller = new AbortController()

        async function fetchRooms() {
            try {
                setRooms(null)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', hotelName)
                params.set('check_in_date', checkInDate)
                params.set('check_out_date', checkOutDate)

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

/**
 * Stubbed "data layer" for hotel detail.
 * Later you can replace implementation with SerpAPI + Google Maps data,
 * without touching UI components.
 */
function useHotelDetails(initialHotel) {
    // TODO: replace this with real fetch to your Node backend (SerpAPI + Google)
    const placeholderHotel = {
        // HotelName: 'Hotel Name (placeholder)',
        HotelAddress: 'Hotel address will be loaded from Google / SerpAPI.',
        Rating: 4.4,
        Price: '$120 / night',
        Description:
            'Hotel description will appear here once data is loaded from APIs. For now this is just placeholder text.',
        Contact: {
            phone: '+00 000 000 000',
            email: 'contact@hotel.com',
            website: 'https://hotel-website.com',
        },
        Amenities: ['Free Wi-Fi', 'Breakfast included', 'Swimming pool', 'Gym', 'Airport shuttle'],
        Photos: ['/placeholder.jpg', '/landing2.jpg', '/landing3.jpg'],
    }

    return {
        hotel: { ...placeholderHotel, ...initialHotel },
        isLoading: false,
        error: null,
    }
}

// Services and Amenities card
function ServicesAmenitiesCard({ amenities }) {
    // amenities: array of ids from the API. If null/empty => show all as demo
    const amenitySet =
        Array.isArray(amenities) && amenities.length > 0 ? new Set(amenities) : null

    const shouldShow = (id) => !amenitySet || amenitySet.has(id)

    const renderItem = (item) => {
        if (!shouldShow(item.id)) return null

        const muted = amenitySet ? false : item.muted

        return (
            <li
                key={item.id}
                className={`flex items-center gap-2 text-sm ${muted ? 'text-gray-400' : 'text-gray-700'
                    }`}
            >
                <span className='text-base leading-none'>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                    <span className='ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100'>
                        {item.badge}
                    </span>
                )}
            </li>
        )
    }

    const chunkIntoColumns = (items, cols = 3) => {
        const visible = items.filter((i) => shouldShow(i.id))
        if (visible.length === 0) return []

        const result = Array.from({ length: cols }, () => [])
        visible.forEach((item, idx) => {
            result[idx % cols].push(item)
        })
        return result
    }

    const mostPopularCols = chunkIntoColumns(
        HOTEL_AMENITIES_CONFIG.mostPopular.items,
        3
    )

    // Distribute categories into 3 columns (like the screenshot: 3 big columns)
    const categoryColumns = (() => {
        const cols = [[], [], []]
        HOTEL_AMENITIES_CONFIG.categories.forEach((cat, idx) => {
            const visibleItems = cat.items.filter((i) => shouldShow(i.id))
            if (visibleItems.length === 0) return
            cols[idx % 3].push({ ...cat, items: visibleItems })
        })
        return cols
    })()

    const hasAny =
        mostPopularCols.length > 0 ||
        categoryColumns.some((col) => col.length > 0)

    return (
        <SectionCard
            title='Services & Amenities'
            subtitle='All services and amenities available at this property.'
        >
            {!hasAny ? (
                <p className='text-sm text-gray-400'>N/A</p>
            ) : (
                <div className='space-y-8'>
                    {/* Row 1: Most popular amenities */}
                    {mostPopularCols.length > 0 && (
                        <div className='space-y-3'>
                            <h3 className='font-semibold text-sm'>
                                {HOTEL_AMENITIES_CONFIG.mostPopular.title}
                            </h3>
                            <div className='grid md:grid-cols-3 gap-4'>
                                {mostPopularCols.map((group, colIdx) => (
                                    <ul key={colIdx} className='space-y-1'>
                                        {group.map(renderItem)}
                                    </ul>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Row 2: More amenities */}
                    {categoryColumns.some((col) => col.length > 0) && (
                        <div className='space-y-3'>
                            <h3 className='font-semibold text-sm'>
                                {HOTEL_AMENITIES_CONFIG.moreAmenitiesTitle}
                            </h3>
                            <div className='grid md:grid-cols-3 gap-6'>
                                {categoryColumns.map((col, colIdx) => (
                                    <div key={colIdx} className='space-y-4'>
                                        {col.map((cat) => (
                                            <div key={cat.id} className='space-y-1'>
                                                <h4 className='font-semibold text-sm'>{cat.title}</h4>
                                                <ul className='space-y-1'>
                                                    {cat.items.map(renderItem)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    )
}

// Property Policies card
function PolicyValue({ value }) {
    if (!value) {
        return <span className='text-sm text-gray-400'>N/A</span>
    }

    // Array of lines -> show each as separate <p>
    if (Array.isArray(value)) {
        return (
            <div className='space-y-1 text-sm text-gray-700'>
                {value.map((line, idx) => (
                    <p key={idx}>{line}</p>
                ))}
            </div>
        )
    }

    // Object e.g. { label: 'Deposit', text: 'No deposit required...' }
    if (typeof value === 'object') {
        return (
            <div className='text-sm text-gray-700'>
                {value.label && <span className='font-semibold mr-2'>{value.label}</span>}
                <span>{value.text || 'N/A'}</span>
            </div>
        )
    }

    // Plain string
    return <p className='text-sm text-gray-700'>{value}</p>
}

function PropertyPoliciesCard({ policies }) {
    const data = policies || {} // later: hotel.policies from Google

    return (
        <SectionCard
            title='Property Policies'
            subtitle='Important information about check-in, children, pets and more.'
        >
            <div className='space-y-4'>
                {PROPERTY_POLICY_FIELDS.map((row) => (
                    <div
                        key={row.id}
                        className='grid md:grid-cols-4 gap-4 text-sm items-start'
                    >
                        <div className='font-semibold text-gray-800'>
                            {row.label}
                        </div>
                        <div className='col-span-3'>
                            <PolicyValue value={data[row.field]} />
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    )
}

// Property Description card: combines contact info + description
function PropertyDescriptionCard({ description }) {
    // expected shape:
    // {
    //   numberOfRooms: number | string | null,
    //   phone: string | null,
    //   email: string | null,
    //   paragraphs: string[] | null
    // }

    const renderFieldRow = (label, value) => (
        <div className='flex flex-wrap gap-2 text-sm'>
            <span className='font-semibold'>{label}:</span>
            <span className={value ? 'text-gray-800' : 'text-gray-400'}>
                {value || 'N/A'}
            </span>
        </div>
    )

    const paragraphs =
        Array.isArray(description?.paragraphs) && description.paragraphs.length > 0
            ? description.paragraphs
            : null

    return (
        <SectionCard
            title='Property Description'
            subtitle='General information and a detailed description of this property.'
        >
            <div className='space-y-5'>
                {/* Top: fields each on its own row */}
                <div className='space-y-2'>
                    <div className=''>
                        {renderFieldRow('Number of Rooms', description?.numberOfRooms ?? null)}
                    </div>

                    <div className='flex md:flex-row md:gap-6'>
                        {renderFieldRow('Phone', description?.phone ?? null)}
                        {renderFieldRow('Email', description?.email ?? null)}
                    </div>
                </div>

                {/* Body text */}
                <div className='space-y-3 text-sm text-gray-700 leading-relaxed'>
                    {paragraphs ? (
                        paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
                    ) : (
                        <p className='text-gray-400'>N/A</p>
                    )}
                </div>
            </div>
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

    // If caller doesn’t give ratingCount, try reviews length, else placeholder
    const totalReviews =
        ratingCount ??
        (Array.isArray(reviews) ? reviews.length : null) ??
        124;

    // Breakdown: counts of each star 1–5
    const breakdown = ratingBreakdown || {
        5: 70,
        4: 30,
        3: 15,
        2: 6,
        1: 3,
    };

    const breakdownTotal =
        Object.values(breakdown).reduce((sum, v) => sum + v, 0) || 1;

    // Reviews list (right column)
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
            text: 'Placeholder review. You can replace this with actual review text.',
        },
        {
            user: 'Traveler C',
            date: '3 weeks ago',
            rating: 5,
            text: 'Another sample comment to demonstrate the layout.',
        },
        {
            user: 'Traveler D',
            date: '1 month ago',
            rating: 3,
            text: 'This will be loaded when clicking on “Load more comments”.',
        },
    ];

    const reviewList =
        (Array.isArray(reviews) && reviews.length > 0
            ? reviews
            : fallbackReviews) || [];

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

                    {/* Breakdown 1–5 stars */}
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
                </div>

                {/* RIGHT: comments list */}
                <div className="space-y-3">
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
                </div>
            </div>
        </SectionCard>
    );
}

/**
 * Map card: Google Map placeholder with room for:
 * - Hotel marker
 * - Transit / POI / shopping markers
 * - Path from hotel to selected pin
 */
function HotelMapSection({ mapRef }) {
    return (
        <SectionCard
            id='hotel-map'
            title='Location & Nearby Places'
            subtitle='Google Maps with transits, POIs and shopping areas around the hotel.'
            rightSlot={
                <div className='flex gap-2 text-xs text-gray-500'>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-blue-500' /> Transit
                    </span>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-green-500' /> POI
                    </span>
                    <span className='inline-flex items-center gap-1'>
                        <span className='h-2 w-2 rounded-full bg-pink-500' /> Shopping
                    </span>
                </div>
            }
        >
            <div ref={mapRef} className='space-y-4'>
                {/* Map container */}
                <div className='w-full h-72 md:h-80 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-sm'>
                    {/* TODO: replace this div with actual Google Maps JS API implementation */}
                    Google Map will be rendered here (hotel marker, nearby places & routes).
                </div>

                {/* Placeholder list of pins / route info */}
                <div className='grid md:grid-cols-2 gap-4 text-sm'>
                    <div className='space-y-2'>
                        <h4 className='font-semibold text-gray-800'>Nearby Highlights</h4>
                        <ul className='space-y-1 text-gray-600'>
                            <li>• Closest transit station will appear here.</li>
                            <li>• Nearby attractions and landmarks from Google Places.</li>
                            <li>• Shopping malls & markets around the hotel.</li>
                        </ul>
                    </div>
                    <div className='space-y-2'>
                        <h4 className='font-semibold text-gray-800'>Route Preview</h4>
                        <p className='text-gray-600'>
                            When user clicks on a pinned place, a walking / driving route from the hotel to that
                            place will be drawn on the map. Summary (distance, duration) can be shown here.
                        </p>
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

/**
 * Nearby hotels section.
 */
function NearbyHotelCard({ hotel }) {
    const openInNewTab = (hotel) => {
        const slug = encodeURIComponent(hotel.name || 'hotel')
        window.open(`/hotel/${slug}`, '_blank')
        console.log('Open nearby hotel detail (placeholder):', hotel)
    }

    return (
        <div
            className='border rounded-lg bg-gray-50 flex flex-col justify-between gap-4 hover:cursor-pointer hover:-translate-y-2 transition-all duration-300'
            onClick={() => openInNewTab(hotel)}
        >
            <img
                src='/placeholder.jpg'
                alt='Hotel photo'
                className='relative top-0 rounded-t-lg'
            />
            <div className='px-3 pb-3 flex flex-col justify-between gap-10'>
                <div>
                    <h4 className='font-semibold text-md'>{hotel.name}</h4>
                    <p className='text-sm text-gray-500 mt-1'>{hotel.distance}</p>
                </div>
                <button
                    type='button'
                    className='inline-flex items-center justify-end gap-1 text-xs text-blue-600 hover:underline'
                >
                    Open details in new tab
                    <ArrowRight className='h-3 w-3' />
                </button>
            </div>
        </div>
    )
}

/**
 * Nearby hotels section with smooth horizontal slide between pages of 4 cards
 */
function NearbyHotelsSection({ hotels }) {
    // TODO: real nearby hotels from Google Places / SerpAPI
    const placeholderNearby = [
        { name: 'Nearby Hotel 1', distance: '300m away' },
        { name: 'Nearby Hotel 2', distance: '700m away' },
        { name: 'Nearby Hotel 3', distance: '1.2km away' },
        { name: 'Nearby Hotel 4', distance: '1.5km away' },
        { name: 'Nearby Hotel 5', distance: '2.0km away' },
        { name: 'Nearby Hotel 6', distance: '2.5km away' },
    ]

    const data = Array.isArray(hotels) && hotels.length > 0 ? hotels : placeholderNearby
    const VISIBLE_PER_PAGE = 4

    // Chunk hotels into pages of 4
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
        setPageIndex((prev) => (prev - 1 + totalPages) % totalPages)
    }

    if (!total) {
        return (
            <SectionCard
                title='Other Nearby Hotels'
                subtitle='Explore alternative options around this area.'
            >
                <p className='text-sm text-gray-400'>N/A</p>
            </SectionCard>
        )
    }

    return (
        <SectionCard
            title='Other Nearby Hotels'
            subtitle='Explore alternative options around this area.'
        >
            <div className='flex items-center justify-between mb-3'>
                <p className='text-xs text-gray-500'>
                    Showing {Math.min((pageIndex + 1) * VISIBLE_PER_PAGE, total)} of {total}
                </p>

                {totalPages > 1 && (
                    <div className='flex gap-2'>
                        <button
                            type='button'
                            onClick={handlePrev}
                            className='p-1.5 rounded-full border bg-white hover:bg-gray-50'
                        >
                            <ChevronLeft className='h-4 w-4' />
                        </button>
                        <button
                            type='button'
                            onClick={handleNext}
                            className='p-1.5 rounded-full border bg-white hover:bg-gray-50'
                        >
                            <ChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                )}
            </div>

            <div className='relative overflow-hidden py-3'>
                <div
                    className='flex transition-transform duration-500 ease-out'
                    style={{ transform: `translateX(-${pageIndex * 100}%)` }}
                >
                    {pages.map((pageHotels, idx) => (
                        <div
                            key={idx}
                            className='min-w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
                        >
                            {pageHotels.map((h, i) => (
                                <NearbyHotelCard
                                    key={h.id || h.name || i}
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

    const mapRef = useRef(null)

    const { hotel, isLoading, error } = useHotelDetails(hotelFromState)

    const fallbackHotelName = slugToTitle(slug) || 'hotel'
    const displayHotelName = hotelFromState.HotelName || fallbackHotelName

    const scrollToMap = () => {
        const el = document.getElementById('hotel-map')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const handleSelectHotelForTrip = () => {
        // TODO: implement logic:
        // - navigate back to EditTrip with selected hotel info in state
        console.log('Select hotel for trip (placeholder):', {
            hotelFromState,
            tripContext,
        })
    }

    const propertyDescriptionData = {
        numberOfRooms: hotel.numberOfRooms ?? null,
        phone: hotel.Contact?.phone ?? null,
        email: hotel.Contact?.email ?? null,
        // for now just wrap Description in one paragraph;
        // later you can split from Google/SerpAPI text
        paragraphs: hotel.Description
            ? [hotel.Description]
            : null,
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
                <p className='text-red-500 text-sm'>Failed to load hotel details.</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className='p-6 mx-auto md:px-20 lg:w-7xl'>
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
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                    <div className='md:text-center'>
                        <h1 className='text-2xl md:text-3xl font-bold flex items-center'>
                            {displayHotelName}
                            {/* add right next to the hotel name the number of star icons based on star rating */}
                        </h1>
                        <div className='text-xs md:text-sm flex flex-col md:flex-row md:items-center text-gray-600 mt-1'>
                            <p className='flex flex-row items-center'>
                                <MapPin className='h-4 w-4' />
                                {hotel.HotelAddress}
                            </p>

                            <span onClick={scrollToMap} className='md:pl-1 md:inline font-semibold text-blue-600 hover:underline cursor-pointer'>View on map</span>
                        </div>
                    </div>

                    <div className='flex justify-end'>
                        <Button
                            onClick={handleSelectHotelForTrip}
                            className='text-md rounded-sm md:py-5 md:text-base bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        >
                            Use this hotel in trip
                        </Button>
                    </div>
                </div>

                <PhotoCarousel photos={hotel.Photos} altPrefix="Hotel photo" />
            </SectionCard>

            {/* Services & Amenities */}
            <ServicesAmenitiesCard amenities={hotel.amenities} />

            {/* Property Policies */}
            <PropertyPoliciesCard policies={hotel.policies} />

            {/* Property Description (contact + text) */}
            <PropertyDescriptionCard description={propertyDescriptionData} />

            {/* Rooms & prices */}
            <HotelRoomsSection
                hotelName={displayHotelName}
                checkInDate={tripContext?.userSelection.startDate}
                checkOutDate={tripContext?.userSelection.endDate}
                adults={tripContext?.userSelection.adults}
                children={tripContext?.userSelection.children}
                childrenAges={tripContext?.userSelection.childrenAges}
                gl={'vn'}
                hl={'en'}
                currency={'USD'}
            />

            {/* Ratings & reviews */}
            <HotelReviewsSection rating={hotel.Rating} />

            {/* Map & nearby places */}
            <HotelMapSection mapRef={mapRef} />

            {/* Nearby hotels */}
            <NearbyHotelsSection />
        </div>
    )
}
