import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Button from '@/components/ui/Button'
import avatarFallback from '@/assets/avatar.png'
import AuthDialog from '@/components/custom/AuthDialog'
import { useAuth } from '@/context/AuthContext'

function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const navigate = useNavigate();

  const avatarSrc = user?.avatar || user?.avatarUrl || user?.picture || avatarFallback
  const displayName = user?.name || user?.displayName || user?.email || 'User'

  return (
    <div className='p-3 shadow-sm flex justify-between items-center'>
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
          <div className='flex items-center gap-3'>
            <Link to='/create-trip'>
              <Button variant="outline" className='rounded-full'>+ Create Trips</Button>
            </Link>
            <Link to='/my-trips'>
              <Button variant="outline" className='rounded-full'>My Trips</Button>
            </Link>

            <Popover>
              <PopoverTrigger asChild>
                <img src={avatarSrc} alt={displayName} className='h-[35px] w-[35px] rounded-full cursor-pointer object-cover' />
              </PopoverTrigger>
              <PopoverContent className='w-44'>
                <div className='mb-2 text-sm break-words'>{displayName}</div>
                <Button onClick={logout} className='w-full' variant='destructive'>Sign Out</Button>
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
