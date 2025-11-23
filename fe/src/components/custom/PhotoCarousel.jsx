import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Simple, reusable photo carousel.
 * - `photos`: string[] (URLs)
 * - `altPrefix`: for accessibility
 */
export default function PhotoCarousel({ photos, altPrefix = 'Photo' }) {
    const [index, setIndex] = useState(0)
    const safePhotos = photos && photos.length > 0 ? photos : ['/placeholder.jpg']
    const total = safePhotos.length

    const prev = () =>
        setIndex(prevIndex => (prevIndex - 1 + total) % total)

    const next = () =>
        setIndex(prevIndex => (prevIndex + 1) % total)

    const goTo = (i) => setIndex(i)

    return (
        <div className='relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-gray-100'>
            {/* Sliding track */}
            <div
                className='flex h-full transition-transform duration-500 ease-out'
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {safePhotos.map((src, i) => (
                    <div
                        key={i}
                        className='min-w-full h-full flex items-center justify-center'
                    >
                        <img
                            src={src}
                            alt={`${altPrefix} ${i + 1}`}
                            className='w-full h-full object-contain'
                        />
                    </div>
                ))}
            </div>

            {/* Navs */}
            {total > 1 && (
                <>
                    <button
                        type='button'
                        className='absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2'
                        onClick={prev}
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </button>
                    <button
                        type='button'
                        className='absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2'
                        onClick={next}
                    >
                        <ChevronRight className='h-5 w-5' />
                    </button>

                    <div className='absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1'>
                        {safePhotos.map((_, i) => (
                            <button
                                key={i}
                                type='button'
                                onClick={() => goTo(i)}
                                className={`h-1.5 w-4 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
