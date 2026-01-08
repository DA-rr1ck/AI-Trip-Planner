import React from 'react'

export default function ChipInput({ label, value = [], onChange, placeholder }) {
    const [text, setText] = React.useState('')

    const add = () => {
        const v = text.trim()
        if (!v) return
        if (value.includes(v)) { setText(''); return }
        onChange([...value, v])
        setText('')
    }

    const remove = (v) => onChange(value.filter(x => x !== v))

    return (
        <div>
            {label && <div className="text-sm text-slate-600">{label}</div>}
            <div className="mt-1 flex flex-wrap gap-2">
                {value.map((v) => (
                    <span key={v} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm">
                        {v}
                        <button type="button" onClick={() => remove(v)} className="text-slate-500 hover:text-slate-900">×</button>
                    </span>
                ))}
            </div>

            <div className="mt-2 flex gap-2">
                <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder || 'Type and press Add'}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); add() }
                    }}
                />
                <button
                    type="button"
                    onClick={add}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                    Add
                </button>
            </div>
        </div>
    )
}
