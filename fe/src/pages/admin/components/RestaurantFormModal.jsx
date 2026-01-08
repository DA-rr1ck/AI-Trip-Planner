import React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import ChipInput from "./ChipInput"
import { Loader2 } from "lucide-react"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function coerceBestForToArray(v) {
    if (Array.isArray(v)) return v.filter(Boolean).map((x) => String(x))
    if (typeof v === "string" && v.trim()) {
        if (v.includes(",")) return v.split(",").map((s) => s.trim()).filter(Boolean)
        return [v.trim()]
    }
    return []
}

function toTitleCase(s) {
    const cleaned = String(s || "").trim().replace(/\s+/g, " ")
    if (!cleaned) return ""

    return cleaned
        .split(" ")
        .map((word) =>
            word
                .split("-")
                .map((part) => {
                    if (!part) return part
                    if (/^[A-Z0-9]{2,}$/.test(part)) return part
                    const lower = part.toLowerCase()
                    return lower.charAt(0).toUpperCase() + lower.slice(1)
                })
                .join("-")
        )
        .join(" ")
}

function normalizeBestForForSave(v) {
    const arr = coerceBestForToArray(v)
    const out = []
    const seen = new Set()

    for (const item of arr) {
        const raw = String(item ?? "").trim().replace(/\s+/g, " ")
        if (!raw) continue

        const normalized = toTitleCase(raw)
        const key = normalized.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)

        out.push(normalized)
    }

    return out
}

export default function RestaurantFormModal({
    open,
    onClose,
    mode,
    initial,
    provinceLocked,
    onSubmit,
}) {
    const [form, setForm] = React.useState(() => {
        const base = initial || {}
        return { ...base, best_for: coerceBestForToArray(base.best_for) }
    })
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        const base = initial || {}
        setForm({ ...base, best_for: coerceBestForToArray(base.best_for) })
    }, [initial])

    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
    const title = mode === "edit" ? "Edit restaurant" : "Add restaurant"

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (saving) return

        setSaving(true)
        try {
            const payload = { ...form }

                ;["rating", "latitude", "longitude"].forEach((k) => {
                    if (payload[k] === "" || payload[k] == null) return
                    const n = Number(payload[k])
                    if (Number.isFinite(n)) payload[k] = n
                })

            payload.days_open = Array.isArray(payload.days_open) ? payload.days_open : []

            // send as array + normalize on save
            payload.best_for = normalizeBestForForSave(payload.best_for)

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

                <form onSubmit={handleSubmit} className="space-y-5">
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
                                value={form.type || "Restaurant"}
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
                                placeholder="4.5"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Price range</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.price_range || ""}
                                onChange={(e) => set("price_range", e.target.value)}
                                placeholder="$$"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Signature dish</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.signature_dish || ""}
                                onChange={(e) => set("signature_dish", e.target.value)}
                                placeholder="Phở bò"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Open time</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.open_time || ""}
                                onChange={(e) => set("open_time", e.target.value)}
                                placeholder="06:00"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Close time</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.close_time || ""}
                                onChange={(e) => set("close_time", e.target.value)}
                                placeholder="22:00"
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
                                label="Best for"
                                value={form.best_for || []}
                                onChange={(v) => set("best_for", v)}
                                placeholder="e.g. Dinner, Couples, Studying..."
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

                        <div>
                            <div className="text-sm text-slate-600">Latitude</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.latitude ?? ""}
                                onChange={(e) => set("latitude", e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <div className="text-sm text-slate-600">Longitude</div>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={form.longitude ?? ""}
                                onChange={(e) => set("longitude", e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <DialogFooter>
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
