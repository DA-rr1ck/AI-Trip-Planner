import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { FcGoogle } from "react-icons/fc";
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function AuthDialog({ open, onOpenChange, onSuccess }) {
    const { loginWithPassword, register, loginWithGoogle, isAuthenticated, user } = useAuth()

    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [form, setForm] = useState({ email: '', password: '', displayName: '' })
    const [err, setErr] = useState(null)
    const [loading, setLoading] = useState(false)

    const canSubmit = useMemo(() => {
        if (!validateEmail(form.email)) return false
        if ((mode === 'register') && form.displayName.trim().length === 0) return false
        return (form.password || '').length >= 6
    }, [form, mode])

    // Auto-close dialog after any successful auth (BE or Google)
    useEffect(() => {
        if (open && isAuthenticated) {
            onOpenChange(false)
            onSuccess?.(user)
        }
    }, [isAuthenticated, open, onOpenChange, onSuccess, user])

    const submit = async (e) => {
        e?.preventDefault?.();
        setErr(null)
        setLoading(true)
        try {
            if (mode === 'register') {
                await register({ email: form.email, password: form.password, displayName: form.displayName })
                toast.success('Account created!')
            } else {
                await loginWithPassword(form.email, form.password)
                toast.success('Signed in!')
            }
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</DialogTitle>
                    {/* Keep this as TEXT ONLY */}
                    <DialogDescription>
                        Use your email & password or continue with Google.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Toggle */}
                    <div className="flex gap-2">
                        <Button type="button" variant={mode === 'login' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('login')}>Login</Button>
                        <Button type="button" variant={mode === 'register' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('register')}>Register</Button>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-3">
                        {mode === 'register' && (
                            <div>
                                <label className="text-sm">Display name</label>
                                <Input placeholder="Your name" value={form.displayName} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} />
                            </div>
                        )}
                        <div>
                            <label className="text-sm">Email</label>
                            <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
                        </div>
                        <div>
                            <label className="text-sm">Password</label>
                            <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required />
                        </div>
                        {err && <div className="text-red-600 text-sm">{err}</div>}
                        <Button className="w-full" disabled={!canSubmit || loading} type="submit">
                            {loading ? 'Please wait…' : (mode === 'register' ? 'Create account' : 'Sign in')}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs text-gray-500">or</span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    {/* Google */}
                    <Button onClick={loginWithGoogle} className="w-full" type="button">
                        <FcGoogle className="h-7 w-7" /> Continue with Google
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
