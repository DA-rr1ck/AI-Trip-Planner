import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { handleBadImage } from '@/lib/imageUtils'

/** Cleanup & fallback so only usable images show */
function normalizePhotos(photos) {
    const cleaned = (photos || [])
        .filter(Boolean)
        .map(p => (typeof p === 'string' ? p.trim() : ''))
        .filter(p => p && p !== 'null' && p !== 'undefined')

    const unique = Array.from(new Set(cleaned))
    return unique.length ? unique : ['/placeholder.jpg']
}

/**
 * photos: string[] of URLs
 * altPrefix?: string
 */
export default function PhotoCarousel({ photos, altPrefix = 'Photo' }) {
    const [validPhotos, setValidPhotos] = useState(() =>
        normalizePhotos(photos)
    )
    const [index, setIndex] = useState(0)

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
                setIndex(0)
            }
        }

        preparePhotos()

        return () => {
            cancelled = true
        }
    }, [photos])

    const total = validPhotos.length

    const goPrev = () => {
        if (total <= 1) return
        setIndex(i => (i - 1 + total) % total)
    }

    const goNext = () => {
        if (total <= 1) return
        setIndex(i => (i + 1) % total)
    }

    const goTo = i => {
        if (i < 0 || i >= total) return
        setIndex(i)
    }

    useEffect(() => {
        if (total <= 1) return
        const id = setInterval(() => {
            setIndex(i => (i + 1) % total)
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

    // Because we add a clone at the start, the "visual" position is index + 1
    const translateX =
        layout.step === 0 ? 0 : layout.base - (index + 1) * layout.step

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
                        transition: 'transform 500ms ease-out',
                        gap: 16, // must match gap used in layout measurement
                    }}
                >
                    {trackPhotos.map((src, i) => (
                        <div
                            key={`${src}-${i}`}
                            ref={i === 0 ? firstSlideRef : null}
                            className="shrink-0 h-full w-full md:w-[72%]"
                        >
                            <div className="h-full rounded-xl overflow-hidden shadow-md">
                                <img
                                    src={src}
                                    alt={`${altPrefix} ${i + 1}`}
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
