import React from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function Card({ title, desc, cta, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`text-left rounded-2xl border p-5 shadow-sm transition ${disabled
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow hover:bg-gray-100 hover:cursor-pointer'
                }`}
        >
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-sm">{desc}</div>
            <div className="mt-4 text-sm font-medium flex items-center gap-1">
                {cta} <ArrowRight className='h-5 w-5'/>
            </div>
        </button>
    )
}

export default function AdminDashboard() {
    const navigate = useNavigate()

    return (
        <div>
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Quick access to admin tools.
                    </p>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
                <Card
                    title="Manage Datasets"
                    desc="Hotels / Places / Restaurants by province."
                    cta="Open"
                    onClick={() => navigate('/admin/manage/datasets')}
                />
                <Card
                    title="Manage Users"
                    desc="CRUD users, update roles."
                    cta="Coming soon"
                    disabled
                />
                <Card
                    title="Manage Users’ Trips"
                    desc="Browse and manage trips."
                    cta="Coming soon"
                    disabled
                />
            </div>
        </div>
    )
}
