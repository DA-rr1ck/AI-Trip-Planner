import React, { useEffect, useState } from 'react'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import Button from '@/components/ui/Button'
import axios from 'axios'
import AuthDialog from './AuthDialog'

function Header() {
  const [user, setUser] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)

  const GetUserProfile = (tokenInfo) => {
    axios
      .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`, {
        headers: { Authorization: `Bearer ${tokenInfo?.access_token}`, Accept: 'application/json' },
      })
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.data))
        setUser(res.data)
        setOpenDialog(false)
      })
  }

  const login = useGoogleLogin({ onSuccess: GetUserProfile, onError: () => console.log('Login Failed') })

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleSignOut = () => {
    googleLogout()
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <div className='p-2 shadow-sm flex justify-between items-center'>
      <img
        src='/webicon.jpg'
        height={40}
        width={63}
        alt='logo'
        className='cursor-pointer'
        onClick={() => (window.location.href = '/')}
      />

      <div>
        {user ? (
          <div className='flex items-center gap-3'>
            <a href='/create-trip'>
              <Button variant="outline" className='rounded-full'>+ Create Trips</Button>
            </a>
            <a href='/my-trips'>
              <Button variant="outline" className='rounded-full'>My Trips</Button>
            </a>

            <Popover>
              <PopoverTrigger asChild>
                <img src={user?.picture || '/avatar-fallback.png'} alt={user?.name || user?.displayName || user?.email} className='h-[35px] w-[35px] rounded-full cursor-pointer object-cover' />
              </PopoverTrigger>
              <PopoverContent className='w-44'>
                <div className='mb-2 text-sm break-words'>
                  {user?.name || user?.displayName || user?.email}
                </div>
                <Button onClick={handleSignOut} className='w-full' variant='destructive'>Sign Out</Button>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>Sign in</Button>
            </DialogTrigger>
            <AuthDialog
              open={openDialog}
              onOpenChange={setOpenDialog}
              googleLogin={login}
              onSuccess={(beUser) => {
                // unify UI: store BE user profile for header/avatar usage
                localStorage.setItem('user', JSON.stringify({
                  email: beUser?.email,
                  name: beUser?.displayName || beUser?.email,
                  picture: beUser?.avatarUrl || '/avatar-fallback.png'
                }))
                setUser(JSON.parse(localStorage.getItem('user')))
              }}
            />
          </Dialog>
        )}
      </div>
    </div>
  )
}

export default Header
