const DEFAULT_PLACEHOLDER = '/placeholder.jpg'

export function handleBadImage(url, placeholder = DEFAULT_PLACEHOLDER) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') {
            resolve(placeholder)
            return
        }

        const trimmed = url.trim()
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
            resolve(placeholder)
            return
        }

        const img = new Image()

        img.onload = () => {
            resolve(trimmed)
        }

        img.onerror = () => {
            resolve(placeholder)
        }

        img.src = trimmed
    })
}
