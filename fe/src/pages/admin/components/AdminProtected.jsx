import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminApi } from '@/lib/adminApi'

export default function AdminProtected({ children }) {
    const location = useLocation()
    const [state, setState] = React.useState({ loading: true, admin: null })

    React.useEffect(() => {
        let alive = true
        adminApi.auth.me()
            .then((res) => {
                if (!alive) return
                setState({ loading: false, admin: res.admin })
            })
            .catch(() => {
                if (!alive) return
                setState({ loading: false, admin: null })
            })
        return () => { alive = false }
    }, [])

    if (state.loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-50">
                <div className="flex items-center gap-3 text-slate-600">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    <span>Checking admin session…</span>
                </div>
            </div>
        )
    }

    if (!state.admin) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    }

    return children
}
