import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api"
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    Info,
    SquarePen
} from 'lucide-react';
import { REGION_OPTIONS } from "@/constants/options";
import avatarFallback from "@/assets/avatar.png";

function toDigitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
}

// Drop one leading trunk '0' if present
function phoneFrom(region, nationalDigits) {
    const r = REGION_OPTIONS.find(x => x.code === region) || REGION_OPTIONS[0];
    const nat = nationalDigits.startsWith('0') ? nationalDigits.slice(1) : nationalDigits;

    return `${r.cc}-${nat}`;
}

// Helper to mask current phone like
function maskPhone(phone) {
    if (!phone) return "—";

    // Phone format: cc-digits
    let cc = "";
    let digits = "";

    const parts = phone.trim().split("-");
    cc = parts[0];
    digits = toDigitsOnly(parts[1]);

    // If digits length ≤ 6 → minimal masking
    if (digits.length <= 6) {
        if (digits.length <= 2) return `${cc}-${digits}`;
        const first = digits.slice(0, 2);
        const last = digits.slice(-1);
        const stars = "*".repeat(digits.length - 3);
        return `${cc}-${first}${stars}${last}`;
    }

    // Standard masking
    const first4 = digits.slice(0, 4);
    const last2 = digits.slice(-2);
    const stars = "*".repeat(digits.length - 6);

    return `${cc}-${first4}${stars}${last2}`;
}

function PhoneUpdateDialog({ currentPhone, onUpdated }) {
    const [open, setOpen] = useState(false);
    const [region, setRegion] = useState(() => REGION_OPTIONS[0]);
    const [phone, setPhone] = useState("");
    const [touched, setTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isValid = useMemo(() => {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= region.min && digits.length <= region.max;
    }, [phone, region]);

    const helpText =
        touched && !isValid
            ? `Phone must be ${region.min === region.max ? region.min : `${region.min}-${region.max}`} digits for ${region.label}.`
            : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!isValid || submitting) return;

        try {
            setSubmitting(true);
            const natDigits = toDigitsOnly(phone);
            const newPhone = phoneFrom(region, natDigits);

            const res = await api.patch("/profile/update/phone", { newPhone });

            const status = res.status;

            if (status !== 200) {
                const message = res.message;
                throw new Error(message);
            }

            const user = res.data.user;

            const updatedPhone = user?.phone || newPhone;

            if (onUpdated) {
                onUpdated(updatedPhone);
            }

            toast.success("Your phone number was updated successfully!");

            setOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Could not update phone number. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-sm text-blue-600 hover:underline hover:cursor-pointer">
                    Update
                </button>
            </DialogTrigger>

            <DialogContent className="md:max-w-md md:px-10 md:pb-8">
                <DialogHeader className='mt-4 space-y-3'>
                    <DialogTitle className='text-center text-xl'>Enter New Phone Number</DialogTitle>
                    <DialogDescription>
                        {currentPhone ? (
                            <>
                                Your account is currently linked to{" "}
                                <span className="font-semibold">
                                    {maskPhone(currentPhone)}
                                </span>
                                . Please enter a new phone number if you want to change it.
                            </>
                        ) : (
                            "Please enter a phone number to link to your account."
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                        {/* Region select */}
                        <div className="flex gap-3">
                            <div className="w-20">
                                <label className="sr-only">Region</label>
                                <Select
                                    value={region.cc}
                                    onValueChange={(value) => {
                                        const r = REGION_OPTIONS.find((opt) => opt.cc === value);
                                        if (r) setRegion(r);
                                    }}
                                >
                                    <SelectTrigger className="md:h-full text-sm md:text-base font-medium">
                                        <span>+{region.cc}</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.code} value={opt.cc}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Phone number input */}
                            <div className="flex-1">
                                <label className="sr-only">Phone number</label>
                                <input
                                    type="tel"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 md:py-4 text-sm md:text-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="Please enter a phone number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onBlur={() => setTouched(true)}
                                />
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {helpText}
                        </p>
                    </div>

                    <DialogFooter>
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="inline-flex w-full items-center justify-center rounded-sm bg-blue-600 px-4 py-2 text-md font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-200"
                        >
                            {submitting ? "Saving..." : "Continue"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
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

function PasswordUpdateDialog() {
    const [open, setOpen] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [touchedNew, setTouchedNew] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isPasswordValid = useMemo(
        () => validatePassword(newPassword),
        [newPassword]
    );

    const isValid = currentPassword.length > 0 && isPasswordValid;

    const newPasswordError = touchedNew && !isPasswordValid
        ? "Password must be at least 8 characters and include letters, numbers, and symbols."
        : "";

    const resetState = () => {
        setCurrentPassword("");
        setNewPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setTouchedNew(false);
        setFormError("");
        setSubmitting(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouchedNew(true);
        setFormError("");

        if (!isValid || submitting) return;

        try {
            setSubmitting(true);

            const res = await api.patch("/profile/update/password", { currentPassword, newPassword });

            const status = res.status;

            if (status !== 200) {
                const message = res.message;
                setFormError(message);
                throw new Error(message);
            }

            toast.success("Your password was changed successfully!");

            // Close dialog & reset sensitive fields
            setOpen(false);
            resetState();
        } catch (err) {
            console.error(err);
            if (!formError) {
                setFormError(err?.message || "Could not update password. Please try again.");
            }

            toast.error("Could not update password. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) resetState();
            }}
        >
            <DialogTrigger asChild>
                <button className="text-sm text-blue-600 hover:underline hover:cursor-pointer">
                    Update
                </button>
            </DialogTrigger>

            <DialogContent className="md:max-w-md md:px-10 md:pb-8">
                <DialogHeader className='mt-4 space-y-3'>
                    <DialogTitle className='text-center text-xl'>Reset Password</DialogTitle>
                    <DialogDescription>
                        Verify your current password to set a new one
                    </DialogDescription>
                </DialogHeader>

                <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-6">
                            {/* Old password input */}
                            <div className="flex-1">
                                <label className="sr-only">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 md:py-4 text-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="Current Password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 hover:cursor-pointer"
                                        onClick={() =>
                                            setShowCurrentPassword((prev) => !prev)
                                        }
                                        aria-label={
                                            showCurrentPassword
                                                ? "Hide current password"
                                                : "Show current password"
                                        }
                                    >
                                        {showCurrentPassword ? (
                                            <Eye className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New password input */}
                            <div className="flex-1">
                                <label className="sr-only">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 md:py-4 text-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        onBlur={() => setTouchedNew(true)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 hover:cursor-pointer"
                                        onClick={() =>
                                            setShowNewPassword((prev) => !prev)
                                        }
                                        aria-label={
                                            showNewPassword
                                                ? "Hide new password"
                                                : "Show new password"
                                        }
                                    >
                                        {showNewPassword ? (
                                            <Eye className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>

                                {newPasswordError ? (
                                    <p className="mt-1 text-sm text-red-600">
                                        <Info className="h-5 w-5 inline pr-1" />
                                        {newPasswordError}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-800">
                                        Password needs to be at least 8 characters, including letters, numbers, and symbols
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <p className="text-sm text-red-600">
                            {formError}
                        </p>
                    )}

                    <DialogFooter>
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="inline-flex w-full items-center justify-center rounded-sm bg-blue-600 px-4 py-2 text-md font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-200"
                        >
                            {submitting ? "Saving..." : "Set New Password"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [editingUsername, setEditingUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);

    useEffect(() => {
        let fetched = false;

        async function fetchProfile() {
            try {
                const res = await api.get("/auth/me");

                const status = res.status;

                if (status !== 200) {
                    console.error("Failed to load profile: ", res);
                    if (!fetched) {
                        setProfile(null);
                    }
                    return;
                }

                const user = res.data.user;

                if (!fetched) {
                    setProfile(user || null);
                }
            } catch (err) {
                console.error("Error loading profile:", err);
                if (!fetched) setProfile(null);
            } finally {
                if (!fetched) setLoading(false);
            }
        }

        fetchProfile();

        return () => {
            fetched = true;
        };
    }, []);

    const startEditUsername = () => {
        if (!profile) return;
        setUsernameInput(profile.username || "");
        setEditingUsername(true);
    };

    const stopEditUsername = () => {
        setEditingUsername(false);
    };

    const handleSaveUsername = async () => {
        const newUsername = usernameInput.trim();
        if (!profile || !newUsername || newUsername === profile.username) return;

        try {
            setSavingUsername(true);

            const res = await api.patch("/profile/update/username", { newUsername });

            const status = res.status;

            if (status !== 200) {
                const message = res.message || "Failed to update username.";
                throw new Error(message);
            }

            const updatedUser = res.data.user;

            const updatedUsername = updatedUser?.username || newUsername;

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        username: updatedUsername,
                    }
                    : prev
            );

            toast.success("Your username was updated successfully!");

            setEditingUsername(false);
        } catch (err) {
            console.error(err);
            const msg = err?.message || "Could not update username. Please try again.";

            toast.error(msg);
        } finally {
            setSavingUsername(false);
        }
    };

    return (
        <div className="h-[calc(100vh-5rem)] bg-gray-100">
            <div className="w-full md:max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-5">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                ) : (
                    <>
                        <div className="w-full md:w-xl md:h-60 rounded-2xl p-4 flex items-center md:items-start bg-white">
                            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                                <img
                                    src={profile?.avatar || avatarFallback}
                                    alt={profile?.username || "avatar"}
                                    loading='lazy'
                                    referrerPolicy='no-referrer'
                                    className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-400"
                                />

                                <div className="h-full md:h-14 flex flex-col items-center md:justify-between">
                                    {/* Username + inline edit */}
                                    <div className="flex flex-col md:flex-row items-center gap-2">
                                        {editingUsername ? (
                                            <>
                                                <input
                                                    className="w-50 md:w-40 border rounded-sm px-2 py-0.5 text-lg font-semibold bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    value={usernameInput}
                                                    onChange={(e) => setUsernameInput(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex flex-row gap-3 md:flex-none md:gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveUsername}
                                                        disabled={
                                                            savingUsername ||
                                                            !usernameInput.trim() ||
                                                            usernameInput.trim() === (profile?.username || "")
                                                        }
                                                        className="text-sm px-3 py-1.5 w-20 rounded-md bg-blue-600 text-white disabled:bg-blue-200 cursor-pointer disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200"
                                                    >
                                                        {savingUsername ? "Saving..." : "Save"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={stopEditUsername}
                                                        className="text-sm px-3 py-1.5 rounded-md bg-gray-100 text-black cursor-pointer hover:bg-gray-200 transition-all duration-200"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-row items-center gap-1">
                                                    <span className="text-xl font-semibold">
                                                        {profile?.username || "—"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={startEditUsername}
                                                        className="rounded-full hover:bg-gray-100"
                                                        aria-label="Edit username"
                                                    >
                                                        <SquarePen className="h-5 w-5 text-gray-600" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {user?.provider ? (
                                            <span className="inline-flex items-center gap-2">
                                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                                {user.provider === "google" ? "Signed in with Google" : "Signed in with Email"}
                                            </span>
                                        ) : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-5xl">
                            <div className="rounded-2xl p-6 bg-white">
                                <div className="mb-4 text-2xl font-semibold">
                                    Account Security
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="rounded-lg p-4 bg-slate-100">
                                        <div className="text-sm uppercase text-muted-foreground flex items-center gap-2">
                                            <Mail className="h-4 w-4 inline" /> Email
                                        </div>
                                        <div className="mt-1 font-medium">{profile?.email || "—"}</div>
                                    </div>
                                    <div className="rounded-lg p-4 flex flex-row items-center justify-between bg-slate-100">
                                        <div>
                                            <div className="text-sm uppercase text-muted-foreground flex items-center gap-2">
                                                <Phone className="h-4 w-4 inline" /> Phone
                                            </div>
                                            <div className="mt-1 font-medium">{maskPhone(profile?.phone)}</div>
                                        </div>

                                        <PhoneUpdateDialog
                                            currentPhone={profile?.phone}
                                            onUpdated={(newPhone) =>
                                                setProfile((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            phone: newPhone,
                                                        }
                                                        : prev
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="rounded-lg p-4 flex flex-row items-center justify-between bg-slate-100">
                                        <div>
                                            <div className="text-sm uppercase text-muted-foreground flex items-center gap-2">
                                                <Lock className="h-4 w-4 inline" /> Password
                                            </div>
                                            <div className="mt-1 font-medium">********</div>
                                        </div>

                                        {user?.provider === 'email' ? (
                                            <PasswordUpdateDialog />
                                        ) : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
