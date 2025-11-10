import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { REGION_OPTIONS } from '@/constants/options'
import { FcGoogle } from "react-icons/fc";
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function toDigitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
}
function e164From(region, nationalDigits) {
    const r = REGION_OPTIONS.find(x => x.code === region) || REGION_OPTIONS[0];
    // Drop one leading trunk '0' if present
    const nat = nationalDigits.startsWith('0') ? nationalDigits.slice(1) : nationalDigits;
    return `+${r.cc}${nat}`;
}

export default function AuthDialog({ open, onOpenChange, onSuccess }) {
    const { loginWithPassword, register, loginWithGoogle, isAuthenticated, user } = useAuth()

    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [region, setRegion] = useState('VN');
    const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
    const [err, setErr] = useState(null)
    const [loading, setLoading] = useState(false)

    const selectedRegion = useMemo(
        () => REGION_OPTIONS.find(r => r.code === region) || REGION_OPTIONS[0],
        [region]
    );

    const canSubmit = useMemo(() => {
        if (!validateEmail(form.email)) return false;
        if (mode === 'register') {
            if (form.username.trim().length === 0) return false;
            const digits = toDigitsOnly(form.phone);
            const nat = digits.startsWith('0') ? digits.slice(1) : digits;
            if (nat.length < selectedRegion.min || nat.length > selectedRegion.max) return false;
        }
        return (form.password || '').length >= 6;
    }, [form, mode, selectedRegion]);

    // Auto-close dialog after successful auth
    useEffect(() => {
        if (open && isAuthenticated) {
            onOpenChange(false)
            onSuccess?.(user)
        }
    }, [isAuthenticated, open, onOpenChange, onSuccess, user])

    const submit = async (e) => {
        e?.preventDefault?.();
        setErr(null);
        setLoading(true);
        try {
            if (mode === 'register') {
                const natDigits = toDigitsOnly(form.phone);
                const phoneE164 = e164From(region, natDigits);
                await register({
                    username: form.username,
                    email: form.email,
                    phone: phoneE164,
                    password: form.password,
                });
                toast.success('Account created!');
            } else {
                await loginWithPassword(form.email, form.password);
                toast.success('Signed in!');
            }
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Authentication failed!';
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</DialogTitle>
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
                            <>
                                <div>
                                    <label className="text-sm">Username</label>
                                    <Input
                                        placeholder="Your name"
                                        value={form.username}
                                        onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                                    />
                                </div>

                                {/* Region + Phone */}
                                <div className="grid sm:grid-cols-5 gap-3">
                                    <div className="sm:col-span-1">
                                        <label className="text-sm">Region</label>
                                        <Select value={region} onValueChange={setRegion}>
                                            <SelectTrigger
                                                className="w-full h-10 justify-between"
                                                aria-label="Select region calling code"
                                            >
                                                <span className="text-sm">+{selectedRegion.cc}</span>
                                            </SelectTrigger>

                                            <SelectContent>
                                                {REGION_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.code} value={opt.code}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="text-sm">Phone number</label>
                                        <div className="flex items-center gap-2">
                                            {/* <span className="h-10 inline-flex items-center rounded-md border border-input bg-muted/40 px-3 text-sm select-none">
                                                +{selectedRegion.cc}
                                            </span> */}
                                            <Input
                                                className="w-full h-10"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder={`eg. ${selectedRegion.example}`}
                                                value={form.phone}
                                                onChange={(e) => {
                                                    const digits = toDigitsOnly(e.target.value);
                                                    setForm(f => ({ ...f, phone: digits }));
                                                }}
                                            />
                                        </div>
                                        {/* <p className="text-xs text-muted-foreground mt-1">
                                            Enter your phone number (no spaces).
                                        </p> */}
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-sm">Email</label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                            />
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
