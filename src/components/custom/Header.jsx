import React, { useEffect, useState } from 'react'
import Button from '../ui/Button'
import { useGoogleLogin } from '@react-oauth/google';
import { FcGoogle } from "react-icons/fc";
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { googleLogout } from '@react-oauth/google';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function Header() {
  const [user, setUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // console.log(parsedUser);
    }
  }, []);

  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo?.access_token}`,
        Accept: 'application/json'
      }
    }).then((res) => {
       console.log(res);
      localStorage.setItem('user', JSON.stringify(res.data));
      setOpenDialog(false);
      window.location.reload();
    })
  }

  const handleSignOut = () => {
    googleLogout();
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };
  const login = useGoogleLogin({
    onSuccess: (codeResp) => GetUserProfile(codeResp),
    onError: (error) => console.log('Login Failed:', error)
  })

  return (
    <div className='p-2 shadow-sm flex justify-between items-center'>

      <img
        src='/webicon.jpg'
        height={40} width={63}
        alt="logo"
        className="cursor-pointer"
        onClick={() => window.location.href = '/'}
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
                <img
                  src={user?.picture}
                  alt={user?.name}
                  className='h-[35px] w-[35px] rounded-full cursor-pointer'
                />
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <Button
                  onClick={handleSignOut}
                  className="w-full"
                  variant="destructive"
                >
                  Sign Out
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Button onClick={() => setOpenDialog(true)}>Sign in</Button>
        )}
      </div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>

        <DialogContent>
          <DialogHeader>

            <DialogDescription>
              <img src="webicon.jpg" height={40} width={63}></img>
              <h2 className='font-bold text-lg mt-7'>Sign in with Google</h2>
              <p>Sign in to the app with Google authentication</p>
              <Button
                onClick={login}
                className='w-full mt-5 flex gap-4 items-center'>
                <FcGoogle className='h-7 w-7' /> Sign in with Google</Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Header
