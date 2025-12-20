import React, { useState, useEffect } from 'react'
import { handleBadImage } from '@/lib/imageUtils'

export default function SafeImage({
    src,
    placeholder = '/placeholder.jpg',
    alt = '',
    ...imgProps
}) {
    const [safeSrc, setSafeSrc] = useState(placeholder)

    useEffect(() => {
        let cancelled = false

        // If no src, just stick with placeholder
        if (!src) {
            setSafeSrc(placeholder)
            return
        }

        handleBadImage(src, placeholder).then(finalUrl => {
            if (!cancelled) {
                setSafeSrc(finalUrl)
            }
        })

        return () => {
            cancelled = true
        }
    }, [src, placeholder])

    return (
        <img
            src={safeSrc}
            alt={alt}
            onError={e => {
                // Extra safety: if something still breaks at render time
                e.currentTarget.src = placeholder
            }}
            {...imgProps}
        />
    )
}