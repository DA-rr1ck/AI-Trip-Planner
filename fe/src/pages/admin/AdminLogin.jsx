import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApi } from '@/lib/adminApi'
import { Toaster } from '@/components/ui/sonner.jsx'

export default function AdminLogin() {
    const navigate = useNavigate()
    const location = useLocation()

    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [err, setErr] = React.useState('')

    const from = location.state?.from || '/admin/dashboard'

    const onSubmit = async (e) => {
        e.preventDefault()
        setErr('')
        setLoading(true)
        try {
            await adminApi.auth.login({ email, password })
            navigate(from, { replace: true })
        } catch (e) {
            setErr(e.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 grid place-items-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold text-slate-900">Admin Login</h1>
                <p className="mt-1 text-sm text-slate-500">Sign in to manage system data.</p>

                <form onSubmit={onSubmit} className="mt-5 flex flex-col justify-between gap-4">
                    <div className='flex flex-col gap-2'>
                        <div>
                            <label className="text-sm text-slate-600">Email</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                placeholder="admin@email.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-600">Password</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    {err && (
                        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                            {err}
                        </div>
                    )}

                    <div>
                        <button
                            disabled={loading}
                            className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            {loading ? 'Signing in…' : 'Login'}
                        </button>
                    </div>
                </form>

                <div className="pt-4 text-center text-sm text-slate-600">
                    Not an Admin,{' '}
                    <a
                        href="/"
                        className="font-medium text-slate-900 underline underline-offset-4 transition hover:text-slate-500"
                    >
                        Click here!
                    </a>
                </div>
            </div>
        </div>
    )
}
