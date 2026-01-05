import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import {
    ArrowLeft,
    MapPin,
    Clock3,
    Ticket,
    Star,
    Info,
    Contact,
    ExternalLink,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import {
    HotelMarkerIcon,
    MainAttractionMarkerIcon,
    AttractionMarkerIcon,
    RestaurantMarkerIcon
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
import { useLocale } from '@/context/LocaleContext'

// Helper to parse number values safely
function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
        const num = parseFloat(value.replace(',', '.'))
        return Number.isFinite(num) ? num : null
    }
    return null
}

// Helper to parse review count values safely
const parseReviewCount = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
        const digits = value.replace(/[^\d]/g, '')
        if (!digits) return null
        const num = parseInt(digits, 10)
        return Number.isNaN(num) ? null : num
    }
    return null
}

/**
 * Fetches data from /api/serp/attraction/details
 */
function fetchAttractionDetails(attraction) {
    const { language } = useLocale()

    const [header, setHeader] = useState(null)
    const [description, setDescription] = useState(null)
    const [ticketsPasses, setTicketsPasses] = useState([])
    const [ratingsReviews, setRatingsReviews] = useState(null)
    const [nearbyPlaces, setNearbyPlaces] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const attractionName = attraction?.PlaceName || attraction?.name || null

    useEffect(() => {
        if (!attractionName) {
            // Nothing to fetch if we don't have the attraction name
            setHeader(null)
            setDescription(null)
            setTicketsPasses([])
            setRatingsReviews(null)
            setNearbyPlaces(null)
            setError(null)
            return
        }

        async function fetchDetails() {
            try {
                setIsLoading(true)
                setError(null)

                const params = new URLSearchParams()
                params.set('q', attractionName)
                params.set('hl', language ?? 'en')

                const res = await api.get(`/serp/attraction/details?${params.toString()}`)

                const status = res.status;

                if (status !== 200) {
                    const text = await res.text()
                    throw new Error(text || `Request failed with status ${status}`)
                }

                const json = res.data

                const headerData = json.header || {}
                const descriptionData = json.description || null
                const ticketsPassesData = Array.isArray(json.tickets_passes) ? json.tickets_passes : []
                const ratingsReviewsData = json.ratings_reviews || null
                const nearbyPlacesData = json.nearby_places || null

                setHeader(headerData)
                setDescription(descriptionData)
                setTicketsPasses(ticketsPassesData)
                setRatingsReviews(ratingsReviewsData)
                setNearbyPlaces(nearbyPlacesData)
            } catch (err) {
                if (err.name === 'AbortError') return
                console.error('Failed to load attraction details', err)
                setError(err.message || 'Failed to load attraction details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDetails()
    }, [
        attractionName,
        language,
    ])

    return {
        header,
        description,
        ticketsPasses,
        ratingsReviews,
        nearbyPlaces,
        isLoading,
        error,
    }
}

/**
 * Info card inside the header: Operating time, Address, Visiting hours, Contacts
 * - Normalizes data from both `header` (SerpApi) and `attraction` (trip activity)
 */
function AttractionInfoCard({ header, onScrollToMap }) {
    const operatingHours = header?.operating_time
    const recommendedVisit = header?.visiting_hours_recommendation || null
    const address = header?.address || null

    const formatHours = (hours) => {
        if (!hours) return 'N/A'
        if (typeof hours === 'string') return hours

        // common SerpApi shapes
        if (Array.isArray(hours)) {
            // sometimes an array of objects with weekday keys
            const mondayEntry = hours.find((h) => h && (h.monday || h.Monday))
            if (mondayEntry) {
                return mondayEntry.monday || mondayEntry.Monday
            }
            return 'N/A'
        }

        if (typeof hours === 'object') {
            // sometimes an object with open/close keys
            if (hours.open && hours.close) {
                return `${hours.open} - ${hours.close}`
            }
            if (hours.monday || hours.Monday) {
                return hours.monday || hours.Monday
            }
        }

        return 'N/A'
    }

    const contacts = header?.contacts || {}
    const phone = contacts?.phone ?? null
    const rawWebsite = contacts?.website ?? null

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
                className="text-blue-600 hover:underline hover:text-blue-800 transition-all duration-150 active:scale-95 break-all"
            >
                {display}
            </a>
        )
    }

    return (
        <div className="space-y-2 md:space-y-4 text-sm">
            <div className="grid md:grid-cols-2 gap-2 md:gap-4">
                {/* Operating time */}
                <div className="flex items-start gap-2 text-black">
                    <Clock3 className="h-4 w-4 mt-0.5" />
                    <div>
                        <div className="font-semibold">Operating Time</div>
                        <div className="text-gray-600">
                            {formatHours(operatingHours)}
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-0 md:gap-2 text-black">
                    <MapPin className="h-7 w-7 md:h-4 md:w-4 mt-0 md:mt-0.5 pr-2 md:pr-0 pb-2 md:pb-0" />
                    <div>
                        <div className="font-semibold">
                            Address
                        </div>
                        <div className="flex flex-col text-gray-600">
                            <p>
                                {address || 'N/A'}
                            </p>

                            <span
                                onClick={onScrollToMap}
                                className="w-fit text-blue-600 hover:underline hover:text-blue-800 transition-all duration-150 active:scale-95 cursor-pointer"
                            >
                                View on map
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2 md:gap-4">
                {/* Recommended visit time */}
                <div className="flex items-start gap-2 text-black">
                    <Info className="h-4 w-4 mt-0.5" />
                    <div>
                        <div className="font-semibold">
                            Visiting Hours Recommendation
                        </div>
                        <div className="text-gray-600">
                            {recommendedVisit || 'Not available'}
                        </div>
                    </div>
                </div>

                {/* Contacts */}
                <div className="flex items-start gap-2 text-black">
                    <Contact className="h-4 w-4 mt-0.5" />
                    <div className="space-y-1">
                        <div className="font-semibold">
                            Contacts
                        </div>
                        {!phone && !website ? (
                            <span className="text-gray-600">N/A</span>
                        ) : (
                            <div className="space-y-1">
                                {phone && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="font-medium">Phone:</span>
                                        <span className='text-gray-600'>{phone}</span>
                                    </div>
                                )}
                                {website && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="font-medium">Website:</span>
                                        <span className='text-gray-600'>{renderWebsite()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * HeaderCard
 * - Photo carousel
 * - Title + rating + CTA
 * - AttractionInfoCard
 */
function HeaderCard({
    header,
    attractionFromState,
    slug,
    ratingsReviews,
    onSelectAttraction,
    onScrollToMap,
}) {
    const fallbackAttractionName = slug ? slugToTitle(slug) || 'attraction' : 'attraction'
    const name = header?.name || attractionFromState?.PlaceName || fallbackAttractionName

    // Rating priority: API ratings_reviews -> attraction.Rating
    const ratingFromApi = parseNumber(ratingsReviews?.rating)
    const rating = ratingFromApi

    // Photos priority: SerpApi header.images -> attraction.Photos
    const images =
        (Array.isArray(header?.images) && header.images.length > 0
            ? header.images
            : [])

    return (
        <SectionCard header={false} className="space-y-5">
            {/* Photo carousel */}
            <PhotoCarousel
                photos={images}
                altPrefix="Attraction photo"
            />

            {/* Title + rating + CTA */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        {name}
                        {rating != null && (
                            <span className="inline-flex items-center gap-1 text-yellow-500">
                                <Star className="h-5 w-5 fill-yellow-400" />
                                <span className='text-lg'>{rating.toFixed(1)}</span>
                            </span>
                        )}
                    </h1>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={onSelectAttraction}
                        className="text-md rounded-sm md:py-5 md:text-base bg-blue-600 hover:bg-blue-700 transition-all duration-150 active:scale-95 cursor-pointer"
                    >
                        Use this attraction in trip
                    </Button>
                </div>
            </div>

            <hr className="w-full bg-gray-500" />

            {/* Info block: hours, address, contacts */}
            <AttractionInfoCard
                header={header}
                onScrollToMap={onScrollToMap}
            />
        </SectionCard>
    )
}

/**
 * Card: Description
 */
function AttractionDescriptionCard({ description, attraction }) {
    const finalDescription =
        (typeof description === 'string' && description.trim())
            ? description.trim()
            : (typeof attraction?.PlaceDetails === 'string' && attraction.PlaceDetails.trim())
                ? attraction.PlaceDetails.trim()
                : null

    // If no description at all → hide the entire card
    if (!finalDescription) {
        return null
    }

    return (
        <SectionCard
            title="Attraction Description"
            subtitle="Overview, highlights and what to expect when visiting."
        >
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>{finalDescription}</p>
            </div>
        </SectionCard>
    )
}

// Ticket Card
function TicketPassCard({ ticket }) {
    const {
        name,
        price,
        thumbnail,
        rating,
        reviews,
        link,
        source,
        icon,
    } = ticket || {}

    const hasRating = typeof rating === 'number' && Number.isFinite(rating)
    const hasReviews = typeof reviews === 'number' && Number.isFinite(reviews)

    const SourceIcon = icon || null

    const renderLogo = () => {
        if (!SourceIcon) return null

        // assume url string from BE
        if (typeof SourceIcon === 'string') {
            return (
                <img
                    src={SourceIcon}
                    alt={SourceIcon || 'provider logo'}
                    className="h-3 w-auto rounded-sm bg-white"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            )
        }

        return null
    }

    const handleOpenCard = () => {
        if (!link) return
        window.open(link, '_blank', 'noopener,noreferrer')
    }

    return (
        <button
            type="button"
            onClick={handleOpenCard}
            className="w-full border rounded-lg p-0 md:p-3 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 bg-gray-100 hover:border-blue-500 hover:shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
        >
            {/* Thumbnail */}
            <div className="w-full h-44 md:w-72 md:h-48 rounded-t-md md:rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={name || 'Ticket image'}
                        className="w-full h-full object-cover"
                        loading='lazy'
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Ticket className="h-20 w-20" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="w-full md:flex-1 flex flex-col justify-around px-3 pb-3 md:px-0 md:pb-0">
                <div className="flex flex-col gap-2">
                    <h4 className="font-semibold text-left text-md md:text-xl">
                        {name || 'Ticket option'}
                    </h4>

                    {(hasRating || hasReviews) && (
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            {hasRating && (
                                <span className="inline-flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-400" />
                                    <span className="font-medium text-blue-600">
                                        {rating.toFixed(1)}/5
                                    </span>
                                </span>
                            )}
                            {hasReviews && (
                                <span className="text-blue-600">
                                    {reviews.toLocaleString()} reviews
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className='flex flex-col items-end justify-center gap-2 mt-0 md:mt-4'>
                    {price && (
                        <div className="flex flex-col items-end flex-shrink-0">
                            <span className="text-xl md:text-2xl font-semibold text-blue-600 leading-tight">
                                {price}
                            </span>
                        </div>
                    )}
                    {source && (
                        <div className="inline-flex items-center gap-1 text-xs text-gray-700 rounded-md px-2 py-0.5 bg-white">
                            <span>via</span>
                            {renderLogo()}
                            <span>{source}</span>
                        </div>
                    )}
                    {/* Bottom row: link hint */}
                    {link && (
                        <div className="flex items-center gap-1 text-sm md:text-md text-blue-600 hover:underline hover:text-blue-800 transition-all duration-150 active:scale-95 cursor-pointer">
                            <ExternalLink className="h-4 w-4" />
                            <span>View details</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    )
}

/**
 * TicketsPassesSection
 */
function TicketsPassesSection({ ticketsPasses }) {
    const normalizeTickets = React.useCallback(() => {
        const source = Array.isArray(ticketsPasses) ? ticketsPasses : []
        const result = []

        // Map SerpApi experiences -> normalized tickets
        source.forEach((t) => {
            const name = t.title || 'Ticket option'
            const price = t.price || null
            const thumbnail = t.thumbnail || null
            const ratingNum = parseNumber(t.rating)
            const reviewsCount = parseReviewCount(t.reviews)
            const link = t.link || null
            const sourceName = t.source || null
            const sourceIcon = t.icon || null

            const hasAnyContent =
                name ||
                price ||
                thumbnail ||
                ratingNum != null ||
                reviewsCount != null ||
                link ||
                sourceName ||
                sourceIcon

            if (!hasAnyContent) return

            result.push({
                name,
                price,
                thumbnail,
                rating: ratingNum,
                reviews: reviewsCount,
                link,
                source: sourceName,
                icon: sourceIcon,
            })
        })

        return result
    }, [ticketsPasses])

    const tickets = React.useMemo(() => normalizeTickets(), [normalizeTickets])

    // If don’t have anything meaningful → hide the whole card
    if (!Array.isArray(tickets) || tickets.length === 0) {
        return null
    }

    const [showAllMobile, setShowAllMobile] = React.useState(false)

    const visibleMobileTickets = React.useMemo(() => {
        if (!tickets.length) return []
        return showAllMobile ? tickets : tickets.slice(0, 2)
    }, [tickets, showAllMobile])

    return (
        <SectionCard
            title="Tickets & Passes"
            subtitle="Ticket types and indicative prices collected from external sources."
        >
            {/* Mobile: 2 cards + toggle */}
            <div className="space-y-3 mt-2 md:hidden">
                {visibleMobileTickets.map(t => (
                    <TicketPassCard
                        key={`${t.name}-${t.link || ''}`}
                        ticket={t}
                    />
                ))}

                {tickets.length > 2 && (
                    <div className='w-full flex flex-row items-center justify-center'>
                        {showAllMobile ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAllMobile(prev => !prev)
                                }
                                className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold bg-blue-600 text-white transition-all duration-150 active:scale-95 md:hidden"
                            >
                                Show less tickets
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAllMobile(prev => !prev)
                                }
                                className="rounded-md border border-blue-600 px-4 py-1 text-sm font-semibold text-blue-600 bg-white transition-all duration-150 active:scale-95 md:hidden"
                            >
                                Show more tickets
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Desktop: show all tickets */}
            <div className="space-y-3 mt-2 hidden md:block">
                {tickets.map(t => (
                    <TicketPassCard
                        key={`${t.name}-${t.link || ''}`}
                        ticket={t}
                    />
                ))}
            </div>
        </SectionCard>
    )
}

// Single review card
function RatingsReviewsCard({ review }) {
    const { user, date, rating, text } = review || {}
    const [expanded, setExpanded] = React.useState(false)

    const rawText = typeof text === 'string' ? text : ''
    const MAX_CHARS = 180

    const isLong = rawText.length > MAX_CHARS
    const displayText =
        expanded || !isLong
            ? rawText
            : rawText.slice(0, MAX_CHARS).trimEnd() + '…'

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
            <div className="flex items-center justify-between gap-3 mb-1">
                <div className="font-semibold text-sm text-gray-800">
                    {user || 'Traveler'}
                </div>
                {rating != null && (
                    <div className="flex items-center gap-1 text-xs text-yellow-500">
                        <span>
                            {typeof rating === 'number'
                                ? rating.toFixed(1)
                                : rating}
                        </span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                )}
            </div>

            {date && (
                <div className="text-[11px] text-gray-500 mb-1">
                    {date}
                </div>
            )}

            {rawText && (
                <div className="text-xs md:text-sm text-gray-700">
                    <p>{renderWithLineBreaks(displayText)}</p>

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

/**
 * Card: Reviews
 */
function AttractionReviewsSection({ ratingsReviews }) {
    const rr = ratingsReviews || {}

    const normalizeStarDistribution = (raw) => {
        if (!raw) return null

        const base = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

        if (Array.isArray(raw)) {
            raw.forEach((item) => {
                const starVal = item?.stars ?? item?.rating ?? item?.star ?? item?.label
                const star = parseInt(starVal, 10)
                const count = parseReviewCount(
                    item?.amount ?? item?.count ?? item?.review_count ?? item?.reviews
                )
                if (star >= 1 && star <= 5 && typeof count === 'number') {
                    base[star] += count
                }
            })

            const total = Object.values(base).reduce((s, v) => s + v, 0)
            return total > 0 ? base : null
        }

        return null
    }

    const normalizeUserReviews = (rawList) => {
        if (!Array.isArray(rawList)) return []

        return rawList
            .map((r) => {
                const user =
                    r.username ||
                    r.author_name ||
                    r.profile_name ||
                    r.user ||
                    'Traveler'

                const rating = parseNumber(r.rating ?? r.stars)

                const text =
                    r.description ||
                    r.comment ||
                    r.review ||
                    ''

                const date =
                    r.date ||
                    r.time ||
                    r.published_date ||
                    r.published_time ||
                    r.published_at ||
                    null

                return {
                    user,
                    rating,
                    text,
                    date,
                }
            })
            .filter((r) => r.text || r.rating != null)
    }

    // Overall rating: from rr.rating
    const overallRating = parseNumber(rr.rating)

    // Total reviews: from rr.reviews, fall back to user_reviews length
    let totalReviews = parseReviewCount(rr.reviews)
    if (totalReviews == null && Array.isArray(rr.user_reviews)) {
        totalReviews = rr.user_reviews.length || 0
    }
    if (totalReviews == null) totalReviews = 0

    // Star distribution from rating_summary
    const starDistribution = normalizeStarDistribution(rr.rating_summary)

    // User reviews from rr.user_reviews
    const allUserReviews = normalizeUserReviews(rr.user_reviews)
    const hasUserReviews = allUserReviews.length > 0

    // Check if we have anything to show at all
    const hasAnyData =
        overallRating != null ||
        totalReviews > 0 ||
        (starDistribution && Object.keys(starDistribution).length > 0) ||
        hasUserReviews

    // If truly no data, show a minimal card
    if (!hasAnyData) {
        return (
            <SectionCard
                title="Ratings & Reviews"
                subtitle="Visitor ratings and reviews for this attraction."
            >
                <p className="text-sm text-gray-400">
                    No rating information available for this attraction yet.
                </p>
            </SectionCard>
        )
    }

    // ---------- render helpers ----------
    const renderStarDistribution = () => {
        if (!starDistribution) return null

        const total = Object.values(starDistribution).reduce(
            (sum, c) => sum + (typeof c === 'number' ? c : 0),
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
                            <span className="w-10 text-right text-gray-600">
                                {count}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }

    // ---------- load-more logic for reviews ----------
    const [visibleCount, setVisibleCount] = useState(2)

    const visibleReviews = allUserReviews.slice(0, visibleCount)
    const canLoadMore = allUserReviews.length > visibleCount

    const handleLoadMore = () => {
        setVisibleCount(allUserReviews.length)
    }

    const handleLoadLess = () => {
        setVisibleCount(2)
    }

    // ---------- render ----------
    return (
        <SectionCard
            title="Ratings & Reviews"
            subtitle="Visitor ratings and recent reviews from Google / external sources."
        >
            <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8">
                {/* Left: summary + distribution */}
                <div className="space-y-6">
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
                                Visitor rating
                            </p>
                            <p className="text-sm text-gray-600">
                                {totalReviews > 0
                                    ? `Based on ${totalReviews.toLocaleString()} review${totalReviews > 1 ? 's' : ''}.`
                                    : 'No reviews yet.'}
                            </p>
                        </div>
                    </div>

                    {renderStarDistribution()}
                </div>

                {/* Right: reviews list + load more */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Recent visitor reviews
                    </p>

                    {!hasUserReviews ? (
                        <p className="text-sm text-gray-400">
                            No written reviews available.
                        </p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {visibleReviews.map((r, idx) => (
                                    <RatingsReviewsCard
                                        key={`${r.user || 'Traveler'}-${idx}`}
                                        review={r}
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
function MapViewController({ attractionPosition, selectedHighlight }) {
    const map = useMap()

    React.useEffect(() => {
        if (selectedHighlight && selectedHighlight.position) {
            map.flyTo(selectedHighlight.position, 16)
        } else if (attractionPosition) {
            map.setView(attractionPosition, 15)
        }
    }, [attractionPosition, selectedHighlight, map])

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

// Map card
function AttractionMapSection({ nearbyPlaces, header }) {
    const [activeTab, setActiveTab] = useState('hotels') // hotels | attractions | restaurants
    const [selectedPlace, setSelectedPlace] = useState(null)
    const [routeCoords, setRouteCoords] = useState([])
    const [isMapExpanded, setIsMapExpanded] = useState(false)

    // --- Helpers ---
    const toLatLng = (gps) => {
        if (!gps) return null
        const lat = Number(gps.latitude ?? gps.lat)
        const lng = Number(gps.longitude ?? gps.lng ?? gps.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return { lat, lng }
    }

    const normalizePlaceList = (list, categoryKey) => {
        if (!Array.isArray(list)) return []

        return list
            .map((place, index) => {
                const pos = toLatLng(place.gps_coordinates)
                if (!pos) return null

                const rating =
                    place.rating != null && Number.isFinite(Number(place.rating))
                        ? Number(place.rating)
                        : null

                const reviews =
                    place.reviews != null && Number.isFinite(Number(place.reviews))
                        ? Number(place.reviews)
                        : null

                return {
                    id: `${categoryKey}-${index}-${place.title || place.name || 'place'}`,
                    name: place.title || place.name || 'Nearby place',
                    category: place.type || place.category || null,
                    address: place.address || null,
                    position: pos,
                    rating,
                    reviews,
                    thumbnail: place.thumbnail || null,
                    categoryKey,
                }
            })
            .filter(Boolean)
    }

    // --- Center: attraction position ---
    const attractionPosition = toLatLng(header?.gps_coordinates) || null

    // --- Normalized lists ---
    const hotelsList = normalizePlaceList(
        nearbyPlaces?.hotels,
        'hotels'
    )
    const attractionsList = normalizePlaceList(
        nearbyPlaces?.attractions,
        'attractions'
    )
    const restaurantsList = normalizePlaceList(
        nearbyPlaces?.restaurants,
        'restaurants'
    )

    const hasAnyNearby =
        hotelsList.length > 0 ||
        attractionsList.length > 0 ||
        restaurantsList.length > 0

    // --- Initial tab based on data ---
    const initialTab = (() => {
        if (hotelsList.length > 0) return 'hotels'
        if (attractionsList.length > 0) return 'attractions'
        if (restaurantsList.length > 0) return 'restaurants'
        return 'hotels'
    })()

    // Keep activeTab + selection in sync when data changes
    useEffect(() => {
        setActiveTab(initialTab)
        setSelectedPlace(null)
        setRouteCoords([])
    }, [initialTab])

    // --- Active list by tab ---
    const activeList = (() => {
        switch (activeTab) {
            case 'hotels':
                return hotelsList
            case 'attractions':
                return attractionsList
            case 'restaurants':
                return restaurantsList
            default:
                return []
        }
    })()

    // --- Routing (OSRM) ---
    const fetchRoute = React.useCallback(
        async (place) => {
            if (!place || !attractionPosition) {
                setRouteCoords([])
                return
            }

            try {
                setRouteCoords([])

                const url = `https://router.project-osrm.org/route/v1/driving/${attractionPosition.lng},${attractionPosition.lat};${place.position.lng},${place.position.lat}?overview=full&geometries=geojson`

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
        [attractionPosition?.lat, attractionPosition?.lng]
    )

    const handleSelectPlace = (item) => {
        setSelectedPlace(item)
        fetchRoute(item)
    }

    const buildGoogleMapsDirUrl = (place) => {
        if (!place || !attractionPosition) return '#'
        const origin = `${attractionPosition.lat},${attractionPosition.lng}`
        const dest = `${place.position.lat},${place.position.lng}`
        return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            origin
        )}&destination=${encodeURIComponent(dest)}`
    }

    // --- Marker icon based on active tab ---
    const getMarkerIconForTab = () => {
        switch (activeTab) {
            case 'hotels':
                return HotelMarkerIcon
            case 'attractions':
                return AttractionMarkerIcon
            case 'restaurants':
                return RestaurantMarkerIcon
            default:
                return AttractionMarkerIcon
        }
    }

    const markerIconForTab = getMarkerIconForTab()
    const centerMarkerIcon = MainAttractionMarkerIcon

    // --- Tabs + list render helpers ---
    const renderTabs = () => (
        <div className="flex gap-2 mb-3">
            {[
                { id: 'hotels', label: 'Hotels' },
                { id: 'attractions', label: 'Attractions' },
                { id: 'restaurants', label: 'Restaurants' },
            ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id)
                            setSelectedPlace(null)
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

            {!hasAnyNearby ? (
                <p className="text-xs text-gray-400">
                    No nearby places found for this attraction.
                </p>
            ) : activeList.length === 0 ? (
                <p className="text-xs text-gray-400">
                    No places for this category.
                </p>
            ) : (
                <div className="flex flex-col-reverse md:flex-col">
                    <div className="space-y-2 overflow-y-auto max-h-80 md:max-h-[640px] pr-1">
                        {activeList.map((item) => {
                            const isActive = selectedPlace?.id === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectPlace(item)}
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
                                                className="w-20 h-20 md:w-24 md:h-24 rounded object-cover flex-shrink-0"
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
                                            {item.address && (
                                                <p className="mt-1 text-[11px] text-gray-600">
                                                    {item.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {selectedPlace && (
                        <a
                            href={buildGoogleMapsDirUrl(selectedPlace)}
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

    // --- If we have no center position, show a short fallback inside the card ---
    return (
        <SectionCard
            id="attraction-map"
            title="Location & Nearby Places"
            subtitle="See where this attraction is located and what’s nearby."
            rightSlot={
                <div className="flex gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />{' '}
                        Hotels
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />{' '}
                        Attractions
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500" />{' '}
                        Restaurants
                    </span>
                </div>
            }
            className="md:h-[750px]"
        >
            {!attractionPosition ? (
                <p className="text-sm text-gray-400">
                    We couldn’t determine the exact location of this attraction.
                </p>
            ) : (
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
                            center={attractionPosition}
                            zoom={15}
                            scrollWheelZoom={false}
                            className="h-full w-full"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapViewController
                                attractionPosition={attractionPosition}
                                selectedHighlight={selectedPlace}
                            />

                            <ResizeOnExpand isMapExpanded={isMapExpanded} />

                            {/* Attraction marker */}
                            <Marker
                                position={attractionPosition}
                                icon={centerMarkerIcon}
                            >
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-semibold">
                                            {header?.name || 'Attraction'}
                                        </p>
                                        {header?.address ? (
                                            <p className="text-gray-600">
                                                {header?.address}
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
                                        click: () => handleSelectPlace(item),
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
                                            {item.address && (
                                                <p className="!m-0 text-[11px] text-gray-600">
                                                    {item.address}
                                                </p>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* OSRM route polyline */}
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
                                {header?.address || header?.name || 'This attraction'}
                            </p>
                            {renderList()}
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    )
}

/**
 * MAIN PAGE: AttractionDetailPage
 * - Receives attraction + tripContext via location.state
 * - Renders independent, detachable cards for each feature.
 */
export default function AttractionDetailsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { slug } = useParams()
    const attractionFromState = location.state?.activity || null
    const tripContext = location.state?.tripContext || null

    const {
        header,
        description,
        ticketsPasses,
        ratingsReviews,
        nearbyPlaces,
        isLoading,
        error,
    } = fetchAttractionDetails(attractionFromState)

    const scrollToMap = () => {
        const el = document.getElementById('attraction-map')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const handleSelectAttractionForTrip = () => {
        // TODO: implement logic:
        // - navigate back to EditTrip with selected attraction info in state
        console.log('Use attraction in trip (placeholder)', {
            attractionFromState,
        })
    }

    // const handleOpenHotel = (hotel) => {
    //     const slug = encodeURIComponent(hotel.name || 'hotel')
    //     window.open(`/hotel/${slug}`, '_blank')
    //     console.log('Open nearby hotel in new tab (placeholder)', {
    //         hotel,
    //         tripContext,
    //     })
    // }

    // const handleOpenAttraction = (place) => {
    //     const slug = encodeURIComponent(place.name || 'attraction')
    //     window.open(`/attraction/${slug}`, '_blank')
    //     console.log('Open nearby attraction in new tab (placeholder)', {
    //         place,
    //         tripContext,
    //     })
    // }

    if (isLoading) {
        return (
            <div className="w-full flex justify-center items-center gap-2 mt-20 md:px-20">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                <span className="text-gray-600 text-md">
                    Loading attraction details...
                </span>
            </div>
        )
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
                <p className='text-red-500 text-sm text-center'>
                    {error}
                </p>
            </div>
        )
    }

    return (
        <div className='p-6 mx-auto pb-20 md:pb-0 md:px-20 lg:w-7xl space-y-4 md:space-y-6'>
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

            {/* Header card */}
            <HeaderCard
                header={header}
                attractionFromState={attractionFromState}
                slug={slug}
                ratingsReviews={ratingsReviews}
                onScrollToMap={scrollToMap}
                onSelectAttraction={handleSelectAttractionForTrip}
            />

            <AttractionDescriptionCard
                description={description}
                attraction={attractionFromState}
            />

            <TicketsPassesSection ticketsPasses={ticketsPasses} />

            <AttractionReviewsSection ratingsReviews={ratingsReviews} />

            <AttractionMapSection
                nearbyPlaces={nearbyPlaces}
                header={header}
            />

            <ScrollTopButton />
        </div>
    )
}
