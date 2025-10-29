import React, { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { FcGoogle } from "react-icons/fc";
import { toast } from 'sonner'
import { api } from '@/lib/api'

function validateEmail(e) { 
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) 
}

/**
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open:boolean)=>void
 *  - onSuccess?: (user)=>void   // called after BE email/password success; user is {id,email,displayName,avatarUrl}
 *  - googleLogin?: ()=>void     // from @react-oauth/google useGoogleLogin
 */
export default function AuthDialog({ open, onOpenChange, onSuccess, googleLogin }) {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [form, setForm] = useState({ email: '', password: '', displayName: '' })
    const [err, setErr] = useState(null)
    const [loading, setLoading] = useState(false)

    const canSubmit = useMemo(() => {
        if (!validateEmail(form.email)) return false
        if ((mode === 'register') && form.displayName.trim().length === 0) return false
        return (form.password || '').length >= 6
    }, [form, mode])

    const submit = async (e) => {
        e?.preventDefault?.();
        setErr(null)
        setLoading(true)
        try {
            if (mode === 'register') {
                await api.post('/auth/register', {
                    email: form.email,
                    password: form.password,
                    displayName: form.displayName,
                })
            } else {
                await api.post('/auth/login', {
                    email: form.email,
                    password: form.password,
                })
            }
            const { data } = await api.get('/auth/me')
            localStorage.setItem('user', JSON.stringify(data.user))
            onSuccess?.(data.user)
            toast.success(mode === 'register' ? 'Account created' : 'Signed in')
            onOpenChange(false)
        } catch (e) {
            setErr(e?.response?.data?.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</DialogTitle>
                    <DialogDescription>
                        <div className='mt-4 space-y-4'>
                            {/* Toggle */}
                            <div className='flex gap-2'>
                                <Button type='button' variant={mode === 'login' ? 'default' : 'outline'} className='flex-1' onClick={() => setMode('login')}>Login</Button>
                                <Button type='button' variant={mode === 'register' ? 'default' : 'outline'} className='flex-1' onClick={() => setMode('register')}>Register</Button>
                            </div>

                            {/* Form */}
                            <form onSubmit={submit} className='space-y-3'>
                                {mode === 'register' && (
                                    <div>
                                        <label className='text-sm'>Display name</label>
                                        <Input placeholder='Your name' value={form.displayName} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} />
                                    </div>
                                )}
                                <div>
                                    <label className='text-sm'>Email</label>
                                    <Input type='email' placeholder='you@example.com' value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className='text-sm'>Password</label>
                                    <Input type='password' placeholder='••••••••' value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required />
                                </div>
                                {err && <div className='text-red-600 text-sm'>{err}</div>}
                                <Button className='w-full' disabled={!canSubmit || loading} type='submit'>
                                    {loading ? 'Please wait…' : (mode === 'register' ? 'Create account' : 'Sign in')}
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className='flex items-center gap-3'>
                                <div className='h-px flex-1 bg-gray-200' />
                                <span className='text-xs text-gray-500'>or</span>
                                <div className='h-px flex-1 bg-gray-200' />
                            </div>

                            {/* Continue with Google via FE OAuth */}
                            {googleLogin && (
                                <Button onClick={googleLogin} className='w-full'>
                                    <FcGoogle className='h-7 w-7' /> Continue with Google
                                </Button>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}