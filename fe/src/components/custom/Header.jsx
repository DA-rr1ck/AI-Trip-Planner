import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Map, User, LogOut } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Button from '@/components/ui/Button'
import AuthDialog from '@/components/custom/AuthDialog'
import LocaleToggle from '@/components/custom/LocaleToggle'
import avatarFallback from '@/assets/avatar.png'
import { useAuth } from '@/context/AuthContext'

function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const [openPopover, setOpenPopover] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const navigate = useNavigate()

  const avatarSrc = user?.avatar || avatarFallback
  const displayName = user?.username || user?.email || 'User'

  const handleLogoClick = () => navigate('/')
  const handleSignInClick = () => setOpenDialog(true)

  const handleSignOut = () => {
    setOpenPopover(false)
    logout()
  }

  return (
    <>
      <header className="sticky top-0 z-[9998] border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 md:h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: logo + brand */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="group flex items-center gap-2 rounded-full bg-transparent pr-2 transition hover:bg-muted/70"
          >
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
          </button>

          {/* Right: actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Locale toggle */}
            <LocaleToggle />

            {isAuthenticated ? (
              <>
                {/* Create Trip – only show on ≥ md, mobile will use bottom nav */}
                <Link to="/create-trip" className="hidden md:flex">
                  <Button className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm hover:shadow-md hover:opacity-95">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Create trip</span>
                  </Button>
                </Link>

                {/* My Trips – only show on ≥ md */}
                <Link to="/my-trips" className="hidden md:flex">
                  <Button
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/60 hover:bg-muted/80"
                  >
                    <Map className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">My trips</span>
                  </Button>
                </Link>

                {/* Profile (desktop/tablet) */}
                <Popover open={openPopover} onOpenChange={setOpenPopover}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm outline-none ring-2 ring-transparent transition hover:ring-indigo-400"
                      aria-label="Open profile menu"
                    >
                      <img
                        src={avatarSrc}
                        alt={displayName}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    className="w-72 overflow-hidden z-[9999] rounded-xl border bg-background/95 p-0 shadow-xl"
                  >
                    {/* Top gradient panel */}
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarSrc}
                          alt={displayName}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-white/80"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {displayName}
                          </div>
                          <div className="truncate text-xs opacity-90">
                            {user?.email ?? '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-1 p-2">
                      <Link
                        to="/profile"
                        onClick={() => setOpenPopover(false)}
                        className="block"
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 rounded-lg text-sm"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>

                      <div className="my-1 h-px bg-border/80" />

                      <Button
                        onClick={handleSignOut}
                        variant="destructive"
                        className="w-full justify-start gap-2 rounded-lg text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tiny avatar on very small mobile (no popover, bottom bar handles account) */}
                <button
                  type="button"
                  className="flex sm:hidden h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm"
                  onClick={() => navigate('/profile')}
                >
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-cover"
                  />
                </button>
              </>
            ) : (
              <Button
                onClick={handleSignInClick}
                className="rounded-full px-4 py-2 text-sm font-medium shadow-sm"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Auth dialog for header sign-in */}
      <AuthDialog open={openDialog} onOpenChange={setOpenDialog} />
    </>
  )
}

export default Header
