import React from "react"
import Button from "@/components/ui/Button"
import { Toaster } from "@/components/ui/sonner"
import { LogOut } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { adminApi } from "@/lib/adminApi"

const navItemClass = ({ isActive }) =>
    `px-4 py-3 rounded-lg text-lg transition ${isActive
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`

export default function AdminLayout() {
    const navigate = useNavigate()

    const onLogout = async () => {
        try {
            await adminApi.auth.logout()
        } catch { }
        navigate("/admin/login", { replace: true })
    }

    return (
        <div className="h-screen bg-slate-50">
            <Toaster position="bottom-right" richColors />

            {/* Fixed sidebar */}
            <aside className="fixed inset-y-0 left-0 w-[280px] border-r border-slate-200 bg-white">
                <div className="h-full p-4 flex flex-col">
                    <div className="group flex items-center gap-2 rounded-full bg-transparent transition hover:bg-gray-200">
                        <div className="flex h-10 w-10 md:h-16 md:w-16 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
                            <img
                                src="/webicon.jpg"
                                height={40}
                                width={40}
                                alt="AI Travel Planner logo"
                                className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                        </div>
                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[13px] font-semibold tracking-tight leading-none">
                                AI Travel Planner
                            </span>
                            <span className="mt-0.5 text-[11px] text-muted-foreground leading-none">
                                Plan · Track · Explore
                            </span>
                        </div>
                    </div>

                    <div className="py-4 text-center font-bold text-2xl text-black">
                        Admin Panel
                    </div>

                    <nav className="flex flex-col gap-4">
                        <NavLink to="/admin/dashboard" className={navItemClass}>
                            Dashboard
                        </NavLink>

                        <NavLink to="/admin/manage/datasets" className={navItemClass}>
                            Manage Datasets
                        </NavLink>

                        <button
                            className="w-full rounded-lg px-4 py-3 text-lg text-left transition text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                            disabled
                            title="Coming soon"
                        >
                            Manage Users
                        </button>

                        <button
                            className="w-full rounded-lg px-4 py-3 text-lg text-left transition text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                            disabled
                            title="Coming soon"
                        >
                            Manage Trips
                        </button>
                    </nav>

                    <div className="mt-auto pt-4">
                        <Button
                            onClick={onLogout}
                            variant="destructive"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-white hover:bg-red-500 hover:cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="ml-[260px] h-screen">
                <main className="h-full overflow-y-auto p-6">
                    {/* keep a max width container inside main */}
                    <div className="mx-auto h-full max-w-7xl">
                        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
