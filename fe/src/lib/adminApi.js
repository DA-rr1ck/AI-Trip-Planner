const API_BASE = import.meta.env.VITE_API_BASE_DEV_WEB || ''

async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    })

    let data = null
    try {
        data = await res.json()
    } catch (_) { }

    if (!res.ok) {
        const msg = data?.message || `Request failed: ${res.status}`
        const err = new Error(msg)
        err.status = res.status
        throw err
    }

    return data
}

export const adminApi = {
    auth: {
        login: (payload) => request('/api/admin/auth/login', { method: 'POST', body: payload }),
        me: () => request('/api/admin/auth/me'),
        logout: () => request('/api/admin/auth/logout', { method: 'POST' }),
    },
    datasets: {
        list: (collection, province) =>
            request(`/api/admin/datasets/${collection}?province=${encodeURIComponent(province)}`),
        get: (collection, id) => request(`/api/admin/datasets/${collection}/${id}`),
        create: (collection, payload) =>
            request(`/api/admin/datasets/${collection}`, { method: 'POST', body: payload }),
        update: (collection, id, payload) =>
            request(`/api/admin/datasets/${collection}/${id}`, { method: 'PUT', body: payload }),
        remove: (collection, id) =>
            request(`/api/admin/datasets/${collection}/${id}`, { method: 'DELETE' }),
    },
}
