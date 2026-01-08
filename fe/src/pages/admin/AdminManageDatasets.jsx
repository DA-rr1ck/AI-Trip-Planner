import React from 'react'
import { adminApi } from '@/lib/adminApi'
import { VIETNAM_PROVINCES } from '@/constants/options'
import { toast } from "sonner"
import JsonViewModal from './components/JsonViewModal'

import HotelFormModal from './components/HotelFormModal'
import PlaceFormModal from './components/PlaceFormModal'
import RestaurantFormModal from './components/RestaurantFormModal'

const TABS = [
    { key: 'hotels', label: 'Hotels' },
    { key: 'places', label: 'Places' },
    { key: 'restaurants', label: 'Restaurants' },
]

const SINGULAR_LABEL = {
    hotels: 'Hotel',
    places: 'Place',
    restaurants: 'Restaurant',
}

const COL_LABELS = {
    name: 'Name',
    type: 'Type',
    rating: 'Rating',
    star_rating: 'Star Rating',
    price_range: 'Price Range',
    best_for: 'Best For',
    open_time: 'Open Time',
    updatedAt: 'Updated',
}

function prettyKey(key) {
    if (!key) return ''
    return String(key)
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

function colLabel(key) {
    return COL_LABELS[key] || prettyKey(key) || key
}

function normalizeText(s = '') {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function fmtTs(ts) {
    if (!ts) return '-'
    const sec = ts._seconds ?? ts.seconds
    if (typeof sec === 'number') return new Date(sec * 1000).toLocaleString()
    if (typeof ts === 'string') return new Date(ts).toLocaleString()
    return '-'
}

export default function AdminManageDatasets() {
    const [province, setProvince] = React.useState('')
    const [tab, setTab] = React.useState('hotels')
    const [items, setItems] = React.useState([])
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState('')

    // Province dropdown
    const [provinceOpen, setProvinceOpen] = React.useState(false)
    const provinceBoxRef = React.useRef(null)

    const [formOpen, setFormOpen] = React.useState(false)
    const [formMode, setFormMode] = React.useState('create') // create | edit
    const [editing, setEditing] = React.useState(null)

    const [viewOpen, setViewOpen] = React.useState(false)
    const [viewData, setViewData] = React.useState(null)

    const filteredProvinces = React.useMemo(() => {
        const q = normalizeText(province.trim())
        if (!q) return VIETNAM_PROVINCES
        return VIETNAM_PROVINCES.filter(p => normalizeText(p).includes(q))
    }, [province])

    React.useEffect(() => {
        const onDocMouseDown = (e) => {
            if (!provinceBoxRef.current) return
            if (!provinceBoxRef.current.contains(e.target)) setProvinceOpen(false)
        }
        document.addEventListener('mousedown', onDocMouseDown)
        return () => document.removeEventListener('mousedown', onDocMouseDown)
    }, [])

    const fetchList = React.useCallback(async () => {
        if (!province.trim()) {
            setItems([])
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await adminApi.datasets.list(tab, province.trim())
            setItems(res.items || [])
        } catch (e) {
            setError(e.message || 'Failed to load')
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [tab, province])

    React.useEffect(() => { fetchList() }, [fetchList])

    const openCreate = () => {
        setFormMode('create')

        if (tab === 'hotels') setEditing({ province, days_open: [], room_types: [], amenities: [] })
        else if (tab === 'restaurants') setEditing({ province, days_open: [], best_for: [] })
        else setEditing({ province, days_open: [] })

        setFormOpen(true)
    }

    const openEdit = (item) => {
        setFormMode('edit')

        if (tab === 'restaurants') {
            const bf = item.best_for
            const best_for = Array.isArray(bf)
                ? bf
                : (typeof bf === 'string' && bf.trim()
                    ? bf.split(',').map(s => s.trim()).filter(Boolean)
                    : [])
            setEditing({ ...item, best_for })
        } else {
            setEditing(item)
        }

        setFormOpen(true)
    }

    const onSubmitForm = async (payload) => {
        const isEdit = formMode === "edit"
        const toastId = toast.loading(isEdit ? "Saving changes..." : "Creating...")

        try {
            if (!isEdit) {
                await adminApi.datasets.create(tab, payload)
                toast.success("Created successfully", { id: toastId })
            } else {
                await adminApi.datasets.update(tab, editing.id, payload)
                toast.success("Saved successfully", { id: toastId })
            }

            setFormOpen(false)
            setEditing(null)
            await fetchList()
        } catch (e) {
            toast.error(e?.message || "Something went wrong", { id: toastId })
            throw e
        }
    }

    const onDelete = async (item) => {
        const ok = window.confirm(`Delete "${item.name}"? This cannot be undone.`)
        if (!ok) return

        const toastId = toast.loading("Deleting...")
        try {
            await adminApi.datasets.remove(tab, item.id)
            toast.success("Deleted", { id: toastId })
            await fetchList()
        } catch (e) {
            toast.error(e?.message || "Delete failed", { id: toastId })
        }
    }

    const cols = React.useMemo(() => {
        if (tab === 'hotels') return ['name', 'star_rating', 'rating', 'price_range', 'updatedAt']
        if (tab === 'restaurants') return ['name', 'rating', 'price_range', 'best_for', 'updatedAt']
        return ['name', 'type', 'rating', 'open_time', 'updatedAt']
    }, [tab])

    const selectProvince = (p) => {
        setProvince(p)
        setProvinceOpen(false)
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Manage Datasets</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Select a province, then manage Hotels / Places / Restaurants.
                    </p>
                </div>

                {/* Province search-select box */}
                <div className="w-full md:w-[360px]" ref={provinceBoxRef}>
                    <label className="text-sm text-slate-600">Province</label>
                    <div className="relative mt-1">
                        <input
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                            value={province}
                            onChange={(e) => {
                                setProvince(e.target.value)
                                setProvinceOpen(true)
                            }}
                            onFocus={() => setProvinceOpen(true)}
                            placeholder="Type in or select a province..."
                        />

                        <button
                            type="button"
                            onClick={() => setProvinceOpen(v => !v)}
                            className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-slate-900"
                            aria-label="Toggle province dropdown"
                        >
                            ▾
                        </button>

                        {provinceOpen && (
                            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                <div className="max-h-64 overflow-auto py-1">
                                    {filteredProvinces.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-slate-500">
                                            No matching provinces.
                                        </div>
                                    ) : (
                                        filteredProvinces.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => selectProvince(p)}
                                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                            >
                                                {p}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`rounded-full px-4 py-2 text-sm transition ${tab === t.key
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-300'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}

                <div className="flex-1" />

                <button
                    onClick={openCreate}
                    disabled={!province.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
                >
                    + Add {SINGULAR_LABEL[tab] || 'Item'}
                </button>
            </div>

            {/* Content */}
            <div className="mt-4 flex-1 min-h-0 border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                    <div className="text-sm text-slate-600">
                        {province.trim() ? (
                            <span>
                                Showing <b>{items.length}</b> items for <b>{province}</b>
                            </span>
                        ) : (
                            <span>Select a province to view items.</span>
                        )}
                    </div>

                    <button
                        onClick={fetchList}
                        disabled={!province.trim() || loading}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-200 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
                        {error}
                    </div>
                )}

                {/* Scroll container */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white sticky top-0">
                            <tr className="border-b">
                                {cols.map((c) => (
                                    <th key={c} className="px-4 py-3 text-left font-medium text-slate-600">
                                        {colLabel(c)}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right font-medium text-slate-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            {loading ? (
                                <tr>
                                    <td className="px-4 py-6 text-slate-500" colSpan={cols.length + 1}>
                                        Loading…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-slate-500" colSpan={cols.length + 1}>
                                        No items.
                                    </td>
                                </tr>
                            ) : (
                                items.map((it) => (
                                    <tr key={it.id} className="border-b last:border-b-0">
                                        {cols.map((c) => (
                                            <td key={c} className="px-4 py-3 text-slate-800">
                                                {(() => {
                                                    if (c === 'updatedAt') return fmtTs(it.updatedAt)
                                                    if (c === 'best_for') {
                                                        const v = it.best_for
                                                        if (Array.isArray(v)) return v.join(', ')
                                                        if (typeof v === 'string') {
                                                            return v.split(',').map(s => s.trim()).filter(Boolean).join(', ')
                                                        }
                                                        return '-'
                                                    }
                                                    return it[c] ?? '-'
                                                })()}
                                            </td>
                                        ))}

                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {/* <button
                                                    onClick={() => { setViewData(it); setViewOpen(true) }}
                                                    className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-slate-200"
                                                >
                                                    View
                                                </button> */}
                                                <button
                                                    onClick={() => openEdit(it)}
                                                    className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-slate-200"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => onDelete(it)}
                                                    className="rounded-lg border border-red-300 px-3 py-1.5 text-red-700 transition hover:text-white hover:bg-red-500"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* <JsonViewModal
                open={viewOpen}
                onClose={() => { setViewOpen(false); setViewData(null) }}
                title="Item details"
                data={viewData}
            /> */}

            {tab === 'hotels' && (
                <HotelFormModal
                    open={formOpen}
                    onClose={() => { setFormOpen(false); setEditing(null) }}
                    mode={formMode}
                    initial={editing}
                    provinceLocked={true}
                    onSubmit={onSubmitForm}
                />
            )}

            {tab === 'places' && (
                <PlaceFormModal
                    open={formOpen}
                    onClose={() => { setFormOpen(false); setEditing(null) }}
                    mode={formMode}
                    initial={editing}
                    provinceLocked={true}
                    onSubmit={onSubmitForm}
                />
            )}

            {tab === 'restaurants' && (
                <RestaurantFormModal
                    open={formOpen}
                    onClose={() => { setFormOpen(false); setEditing(null) }}
                    mode={formMode}
                    initial={editing}
                    provinceLocked={true}
                    onSubmit={onSubmitForm}
                />
            )}
        </div>
    )
}
