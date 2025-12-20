import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { handleBadImage } from '@/lib/imageUtils'

/** Cleanup & fallback so only usable images show */
function normalizePhotos(photos) {
    const PLACEHOLDER = '/placeholder.jpg'

    const input = Array.isArray(photos) ? photos : []
    if (input.length === 0) return [PLACEHOLDER]

    // Preserve order and count to keep "fetched" vs "rotatable" in sync.
    // Convert supported objects (SerpAPI-style) to URLs; replace invalid entries with placeholders.
    return input.map((p) => {
        let src = ''

        if (typeof p === 'string') {
            src = p.trim()
        } else if (p && typeof p === 'object') {
            // Common shapes: { original, thumbnail }, { url }, { src }, { image }, etc.
            src = String(
                p.original ||
                p.thumbnail ||
                p.url ||
                p.src ||
                p.image ||
                p.link ||
                ''
            ).trim()
        }

        if (!src || src === 'null' || src === 'undefined') return PLACEHOLDER
        return src
    })
}

/**
 * photos: string[] of URLs
 * altPrefix?: string
 */
export default function PhotoCarousel({ photos, altPrefix = 'Photo' }) {
    const [validPhotos, setValidPhotos] = useState(() =>
        normalizePhotos(photos)
    )
    // position is the index in the rendered track (includes clones)
    // track: [lastClone, ...validPhotos, firstClone]
    // so the first real slide starts at position = 1
    const [position, setPosition] = useState(1)
    const [transitionEnabled, setTransitionEnabled] = useState(true)

    // layout.base: offset to center a slide
    // layout.step: distance between slide centers
    const [layout, setLayout] = useState({ base: 0, step: 0 })

    const containerRef = useRef(null)
    const firstSlideRef = useRef(null)

    // Re-validate photos with handleBadImage whenever `photos` changes
    useEffect(() => {
        let cancelled = false

        async function preparePhotos() {
            // basic cleanup / dedupe
            const normalized = normalizePhotos(photos)

            // check each image URL; fall back to placeholder if bad
            const checked = await Promise.all(
                normalized.map(src => handleBadImage(src))
            )

            // clean again (remove dupes, handle all-placeholder edge cases)
            const cleaned = normalizePhotos(checked)

            if (!cancelled) {
                setValidPhotos(cleaned)
                setTransitionEnabled(false)
                setPosition(1)
                // re-enable transition on next frame so the snap isn't animated
                requestAnimationFrame(() => setTransitionEnabled(true))
            }
        }

        preparePhotos()

        return () => {
            cancelled = true
        }
    }, [photos])

    const total = validPhotos.length

    // Derive the "real" index (0..total-1) from the track position
    const index = (() => {
        if (total <= 0) return 0
        if (position === 0) return total - 1
        if (position === total + 1) return 0
        return Math.min(Math.max(position - 1, 0), total - 1)
    })()

    const goPrev = () => {
        if (total <= 1) return
        setPosition(p => {
            const next = p - 1
            return next < 0 ? 0 : next
        })
    }

    const goNext = () => {
        if (total <= 1) return
        setPosition(p => {
            const next = p + 1
            return next > total + 1 ? total + 1 : next
        })
    }

    const goTo = i => {
        if (i < 0 || i >= total) return
        setPosition(i + 1)
    }

    useEffect(() => {
        if (total <= 1) return
        const id = setInterval(() => {
            setPosition(p => {
                const next = p + 1
                return next > total + 1 ? total + 1 : next
            })
        }, 10000)
        return () => clearInterval(id)
    }, [total])

    // Measure layout for smooth centered sliding
    useEffect(() => {
        const measure = () => {
            if (!containerRef.current || !firstSlideRef.current) return
            const containerWidth = containerRef.current.offsetWidth
            const slideWidth = firstSlideRef.current.offsetWidth

            const gap = 16 // must match gap style below
            const base = containerWidth / 2 - slideWidth / 2
            const step = slideWidth + gap

            setLayout({ base, step })
        }

        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [validPhotos.length])

    // Seamless looping:
    // - If we land on the first clone (position=0), snap to last real slide (position=total)
    // - If we land on the last clone (position=total+1), snap to first real slide (position=1)
    useEffect(() => {
        if (total <= 1) return
        if (position === 0) {
            setTransitionEnabled(false)
            setPosition(total)
            requestAnimationFrame(() => setTransitionEnabled(true))
        } else if (position === total + 1) {
            setTransitionEnabled(false)
            setPosition(1)
            requestAnimationFrame(() => setTransitionEnabled(true))
        }
    }, [position, total])

    // translate by the current track position (includes clones)
    const translateX =
        layout.step === 0 ? 0 : layout.base - position * layout.step

    if (!total) return null

    // Build track with clones at both ends for peek looping
    const last = validPhotos[validPhotos.length - 1]
    const first = validPhotos[0]
    const trackPhotos = [last, ...validPhotos, first]

    return (
        <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden">
            <div
                ref={containerRef}
                className="relative aspect-[4/3] md:aspect-[21/9] flex items-center"
            >
                {/* Sliding track */}
                <div
                    className="flex h-full items-center"
                    style={{
                        transform: `translateX(${translateX}px)`,
                        transition: transitionEnabled
                            ? 'transform 500ms ease-out'
                            : 'none',
                        gap: 16, // must match gap used in layout measurement
                    }}
                >
                    {trackPhotos.map((src, i) => (
                        <div
                            key={`${src}-${i}`}
                            ref={i === 1 ? firstSlideRef : null}
                            className="shrink-0 h-full w-full md:w-[72%]"
                        >
                            <div className="h-full rounded-xl overflow-hidden shadow-md">
                                <img
                                    src={src}
                                    alt={`${altPrefix} ${Math.min(Math.max(i - 1, 0), total - 1) + 1}`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={e => {
                                        e.currentTarget.src = '/placeholder.jpg'
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Arrows */}
                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}

                {/* Dots */}
                {total > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                        {validPhotos.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => goTo(i)}
                                className={`h-1.5 w-4 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
