import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from '@/components/ui/sonner.jsx'

// Layout bits
import Header from '@/components/custom/Header.jsx'
import ScrollToTop from '@/components/custom/ScrollToTop.jsx'
import MobileBottomNav from '@/components/custom/MobileBottomNav.jsx'

// Context
import { AuthProvider } from '@/context/AuthContext.jsx'
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute.jsx'
import { LocaleProvider } from '@/context/LocaleContext.jsx'

// Pages
import Hero from '@/components/custom/Hero.jsx'                 // Landing content
import CreateTrip from '@/pages/create-trip/index.jsx'
import ViewTrip from '@/pages/view-trip/[tripId]/index.jsx'
import EditTrip from '@/pages/edit-trip/index.jsx'
import MyTrips from '@/pages/my-trips/index.jsx'
import ProfilePage from '@/pages/profile/index.jsx'

import HotelDetails from '@/pages/hotel-details/index.jsx'
import AttractionDetails from '@/pages/attraction-details/index.jsx'

// Root layout INSIDE the router so any component can use <Link/>
function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Toaster />
      <MobileBottomNav />
    </>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <LocaleProvider>
            <ScrollToTop />
            <Routes>
              <Route element={<RootLayout />}>
                <Route index
                  element={<Hero />}
                />

                <Route
                  path="create-trip"
                  element={<CreateTrip />}
                />

                <Route
                  path="view-trip/:tripId"
                  element={
                    <ProtectedRoute>
                      <ViewTrip />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="edit-trip"
                  element={
                    <ProtectedRoute>
                      <EditTrip />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="my-trips"
                  element={
                    <ProtectedRoute>
                      <MyTrips />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="hotel/:slug"
                  element={
                    <ProtectedRoute>
                      <HotelDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="attraction/:slug"
                  element={
                    <ProtectedRoute>
                      <AttractionDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </LocaleProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
