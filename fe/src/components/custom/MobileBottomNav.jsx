import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Plus, Map, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import AuthDialog from '@/components/custom/AuthDialog'

function MobileBottomNav() {
    const { isAuthenticated } = useAuth()
    const [openDialog, setOpenDialog] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = [
        { id: 'home', label: 'Home', icon: Home, path: '/' },
        { id: 'create', label: 'Create', icon: Plus, path: '/create-trip' },
        { id: 'trips', label: 'Trips', icon: Map, path: '/my-trips', requireAuth: true },
        {
            id: 'account',
            label: isAuthenticated ? 'Profile' : 'Sign in',
            icon: User,
            path: '/profile',
        },
    ]

    const isActive = (item) => {
        if (item.id === 'home') return location.pathname === '/'
        if (item.id === 'create') return location.pathname.startsWith('/create-trip')
        if (item.id === 'trips') return location.pathname.startsWith('/my-trips')
        if (item.id === 'account') return location.pathname.startsWith('/profile')
        return false
    }

    const handleClick = (item) => {
        // Guard authenticated routes
        if ((item.requireAuth || item.id === 'account') && !isAuthenticated) {
            setOpenDialog(true)
            return
        }

        if (item.path) {
            navigate(item.path)
        }
    }

    return (
        <>
            <nav className="fixed inset-x-0 bottom-0 z-[9990] border-t bg-background/95 backdrop-blur md:hidden">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item)

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleClick(item)}
                                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]"
                            >
                                <div
                                    className={[
                                        'flex h-9 w-9 items-center justify-center rounded-full border transition',
                                        active
                                            ? 'border-primary/60 bg-primary/10 text-primary'
                                            : 'border-transparent text-muted-foreground hover:bg-muted/70',
                                    ].join(' ')}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span
                                    className={[
                                        'mt-0.5',
                                        active ? 'text-primary font-medium' : 'text-muted-foreground',
                                    ].join(' ')}
                                >
                                    {item.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* Auth dialog for bottom-nav actions */}
            <AuthDialog open={openDialog} onOpenChange={setOpenDialog} />
        </>
    )
}

export default MobileBottomNav
