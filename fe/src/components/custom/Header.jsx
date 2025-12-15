import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Map, User, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Button from '@/components/ui/Button'
import avatarFallback from '@/assets/avatar.png'
import AuthDialog from '@/components/custom/AuthDialog'
import { useAuth } from '@/context/AuthContext'

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [openPopover, setOpenPopover] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const navigate = useNavigate();

  const avatarSrc = user?.avatar || avatarFallback;
  const displayName = user?.username || user?.email || 'User';

  return (
    <div className='h-20 px-5 shadow-sm flex justify-between items-center'>
      <img
        src='/webicon.jpg'
        height={40}
        width={63}
        alt='logo'
        className='cursor-pointer'
        onClick={() => (navigate('/'))}
      />

      <div>
        {isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/create-trip">
              <Button
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm hover:shadow-md hover:opacity-95"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Trip
              </Button>
            </Link>

            <Link to="/my-trips">
              <Button variant="outline" className="rounded-full">
                <Map className="h-4 w-4 mr-1" />
                My Trips
              </Button>
            </Link>

            <Link to="/smart-trip">
              <Button variant="outline" className="rounded-full">
                <Map className="h-4 w-4 mr-1" />
                Smart Trip Generator
              </Button>
            </Link>


            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <button
                  className="relative rounded-full outline-none ring-2 ring-transparent transition hover:ring-indigo-400"
                  aria-label="Open profile menu"
                >
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    loading='lazy'
                    referrerPolicy='no-referrer'
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  {/* online dot */}
                  {/* <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" /> */}
                </button>
              </PopoverTrigger>

              <PopoverContent className="w-72 p-0 overflow-hidden rounded-xl shadow-xl border">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      loading='lazy'
                      referrerPolicy='no-referrer'
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/80"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{displayName}</div>
                      <div className="text-xs opacity-90 truncate">
                        {user?.email ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link onClick={() => setOpenPopover(false)} to="/profile" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>

                  {/* <Link to="/my-trips" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Map className="h-4 w-4" />
                      My Trips
                    </Button>
                  </Link> */}

                  <div className="my-2 h-px bg-border" />

                  <Button
                    onClick={logout}
                    variant="destructive"
                    className="w-full justify-start gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <>
            <Button onClick={() => setOpenDialog(true)}>Sign in</Button>
            <AuthDialog open={openDialog} onOpenChange={setOpenDialog} />
          </>
        )}
      </div>
    </div>
  )
}

export default Header
