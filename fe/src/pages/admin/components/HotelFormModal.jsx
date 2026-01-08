import React from "react"
import ChipInput from "./ChipInput"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function HotelFormModal({
    open,
    onClose,
    mode,
    initial,
    provinceLocked,
    onSubmit,
}) {
    const [form, setForm] = React.useState(() => initial || {})
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        setForm(initial || {})
    }, [initial])

    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

    const title = mode === "edit" ? "Edit hotel" : "Add hotel"

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (saving) return

        setSaving(true)
        try {
            const payload = { ...form }

                ;["rating", "star_rating", "latitude", "longitude"].forEach((k) => {
                    if (payload[k] === "" || payload[k] == null) return
                    const n = Number(payload[k])
                    if (Number.isFinite(n)) payload[k] = n
                })

            payload.days_open = Array.isArray(payload.days_open) ? payload.days_open : []
            payload.room_types = Array.isArray(payload.room_types) ? payload.room_types : []
            payload.amenities = Array.isArray(payload.amenities) ? payload.amenities : []

            await onSubmit(payload)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v && !saving) onClose()
            }}
        >
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Basics */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-slate-600">Name <span className="text-red-500">*</span></div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.name || ""}
                                onChange={(e) => set("name", e.target.value)}
                                required
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Type</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.type || "Hotel"}
                                onChange={(e) => set("type", e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Province <span className="text-red-500">*</span></div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.province || ""}
                                onChange={(e) => set("province", e.target.value)}
                                required
                                disabled={provinceLocked || saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Rating</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.rating ?? ""}
                                onChange={(e) => set("rating", e.target.value)}
                                placeholder="4.8"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Star rating</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.star_rating ?? ""}
                                onChange={(e) => set("star_rating", e.target.value)}
                                placeholder="5"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Price range</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.price_range || ""}
                                onChange={(e) => set("price_range", e.target.value)}
                                placeholder="$$$"
                                disabled={saving}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="text-sm text-slate-600">Description</div>
                            <textarea
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                rows={3}
                                value={form.description || ""}
                                onChange={(e) => set("description", e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <div className="text-sm text-slate-600">Address</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.address || ""}
                                onChange={(e) => set("address", e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Latitude</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.latitude ?? ""}
                                onChange={(e) => set("latitude", e.target.value)}
                                placeholder="10.7731"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Longitude</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.longitude ?? ""}
                                onChange={(e) => set("longitude", e.target.value)}
                                placeholder="106.7049"
                                disabled={saving}
                            />
                        </div>
                    </div>

                    {/* Hotel-specific */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-slate-600">Check-in time</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.check_in_time || ""}
                                onChange={(e) => set("check_in_time", e.target.value)}
                                placeholder="14:00"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Check-out time</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.check_out_time || ""}
                                onChange={(e) => set("check_out_time", e.target.value)}
                                placeholder="12:00"
                                disabled={saving}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="text-sm text-slate-600">Days open</div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {DAYS.map((d) => {
                                    const checked = (form.days_open || []).includes(d)
                                    return (
                                        <label
                                            key={d}
                                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={saving}
                                                onChange={() => {
                                                    const cur = form.days_open || []
                                                    set("days_open", checked ? cur.filter((x) => x !== d) : [...cur, d])
                                                }}
                                            />
                                            {d}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <ChipInput
                                label="Room types"
                                value={form.room_types || []}
                                onChange={(v) => set("room_types", v)}
                                placeholder="Deluxe"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <ChipInput
                                label="Amenities"
                                value={form.amenities || []}
                                onChange={(v) => set("amenities", v)}
                                placeholder="Free Wi-Fi"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="text-sm text-slate-600">Phone number</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.phone_number || ""}
                                onChange={(e) => set("phone_number", e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-200 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving
                                ? (mode === "edit" ? "Saving..." : "Creating...")
                                : (mode === "edit" ? "Save changes" : "Create")}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
