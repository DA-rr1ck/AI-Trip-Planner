import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { Eye, EyeOff, Info } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { REGION_OPTIONS } from '@/constants/options'
import { FcGoogle } from "react-icons/fc";
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

// Helper: password must be >= 8 chars, with letters, numbers, and symbols
function validatePassword(pw) {
    const value = String(pw || "");
    if (value.length < 8) return false;
    if (!/[A-Za-z]/.test(value)) return false;
    if (!/\d/.test(value)) return false;
    if (!/[^A-Za-z0-9]/.test(value)) return false;
    return true;
}

function toDigitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
}

// Drop one leading trunk '0' if present
function phoneFrom(region, nationalDigits) {
    const r = REGION_OPTIONS.find(x => x.code === region) || REGION_OPTIONS[0];
    const nat = nationalDigits.startsWith('0') ? nationalDigits.slice(1) : nationalDigits;

    return `${r.cc}-${nat}`;
}

export default function AuthDialog({ open, onOpenChange, onSuccess }) {
    const { loginWithPassword, register, loginWithGoogle, isAuthenticated, user } = useAuth()

    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [region, setRegion] = useState('VN');

    const [touched, setTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
    const [err, setErr] = useState(null)
    const [loading, setLoading] = useState(false)

    const isPasswordValid = useMemo(
        () => validatePassword(form.password),
        [form.password]
    );

    const passwordError = touched && !isPasswordValid
        ? "Password must be at least 8 characters and include letters, numbers, and symbols."
        : "";

    const resetState = () => {
        setForm({ password: "" });
        setShowPassword(false);
        setTouched(false);
    };

    const selectedRegion = useMemo(
        () => REGION_OPTIONS.find(r => r.code === region) || REGION_OPTIONS[0],
        [region]
    );

    // Message for phone validity
    const phoneError = useMemo(() => {
        if (mode !== 'register') return '';
        const rawPhone = (form.phone || '').trim();
        if (!rawPhone) return '';

        const digits = toDigitsOnly(rawPhone);
        const nat = digits.startsWith('0') ? digits.slice(1) : digits;

        if (nat.length < selectedRegion.min || nat.length > selectedRegion.max) {
            const range =
                selectedRegion.min === selectedRegion.max
                    ? `${selectedRegion.min}`
                    : `${selectedRegion.min}-${selectedRegion.max}`;
            return `Phone number must be ${range} digits for ${selectedRegion.label}.`;
        }
        return '';
    }, [form.phone, mode, selectedRegion]);

    const canSubmit = useMemo(() => {
        if (!validateEmail(form.email)) return false;

        if (mode === 'register') {
            if (form.username.trim().length === 0) return false;
            if (phoneError) return false; // invalid phone
        }

        return (form.password || '').length >= 6;
    }, [form, mode, phoneError]);

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
                const natDigits = toDigitsOnly(form.phone || '');
                const fullPhone = natDigits ? phoneFrom(region, natDigits) : '';
                await register({
                    username: form.username,
                    email: form.email,
                    phone: fullPhone,
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
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen);
                if (!nextOpen) resetState();
            }}
        >
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
                                    <label className="text-sm">
                                        Username{" "}
                                        <span className="text-sm text-red-600">*</span>
                                    </label>
                                    <Input
                                        className="md:py-5"
                                        placeholder="Your name"
                                        value={form.username}
                                        onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                                    />
                                </div>

                                {/* Region + Phone (optional) */}
                                <div className="grid sm:grid-cols-5 gap-3">
                                    <div className="sm:col-span-1">
                                        <label className="text-sm">Region</label>
                                        <Select className="md:py-5" value={region} onValueChange={setRegion}>
                                            <SelectTrigger
                                                className="w-full"
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
                                        <label className="text-sm">
                                            Phone number
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="w-full md:py-5"
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
                                        <p className={`text-xs mt-1 ${phoneError ? 'text-red-600' : 'text-muted-foreground'}`}>
                                            {phoneError}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-sm">
                                Email{" "}
                                {mode === 'register' && (
                                    <>
                                        <span className="text-sm text-red-600">*</span>
                                    </>
                                )}
                            </label>
                            <Input
                                className="md:py-5"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm">
                                Password{" "}
                                {mode === 'register' && (
                                    <>
                                        <span className="text-sm text-red-600">*</span>
                                    </>
                                )}
                            </label>
                            <div className='relative'>
                                <Input
                                    className="md:py-5"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                    onBlur={() => setTouched(true)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 hover:cursor-pointer"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide new password"
                                            : "Show new password"
                                    }
                                >
                                    {showPassword ? (
                                        <Eye className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <EyeOff className="h-5 w-5 text-gray-500" />
                                    )}
                                </button>
                            </div>

                            {mode !== 'login' && (
                                <>
                                    {passwordError ? (
                                        <p className="mt-1 text-sm text-red-600">
                                            <Info className="h-5 w-5 inline pr-1" />
                                            {passwordError}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-800">
                                            Password needs to be at least 8 characters, including letters, numbers, and symbols
                                        </p>
                                    )}
                                </>
                            )}
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
