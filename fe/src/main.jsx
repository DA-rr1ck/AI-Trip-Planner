import './index.css'
import App from './App.jsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner.jsx'
import Header from '@/components/custom/Header.jsx'
import { AuthProvider } from '@/context/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import CreateTrip from '@/pages/create-trip/index.jsx'
import ViewTrip from '@/pages/view-trip/[tripId]/index.jsx'
import MyTrips from '@/pages/my-trips/index.jsx'

const router = createBrowserRouter([
  { 
    path: '/', element: <App /> 
  },
  { 
    path: '/create-trip', element: <CreateTrip /> 
  },
  { 
    path: '/view-trip/:tripId', element: <ViewTrip /> 
  },
  { 
    path: '/my-trips', element: <MyTrips /> 
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID}>
      <AuthProvider>
        <Header />
        <Toaster />
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
