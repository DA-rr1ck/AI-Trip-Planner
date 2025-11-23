export function slugToTitle(slug) {
    if (!slug) return ''
    const decoded = decodeURIComponent(slug)

    return decoded
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase())
}
