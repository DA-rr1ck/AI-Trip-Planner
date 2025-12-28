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
import PreviewTrip from '@/pages/preview-trip/index.jsx'
import EditTrip from '@/pages/edit-trip/[tripId]/index.jsx'
import MyTrips from '@/pages/my-trips/index.jsx'
import ProfilePage from '@/pages/profile/index.jsx'
import SmartTripPage from './pages/smart-trip'
import HotelDetails from '@/pages/hotel-details/index.jsx'
import AttractionDetails from '@/pages/attraction-details/index.jsx'
import ManualHotelDetails from '@/pages/manual/hotel-details/index.jsx'
import ManualAttractionDetails from '@/pages/manual/attraction-details/index.jsx'

import TripTracking from '@/pages/trip-tracking/index.jsx'
import ViewSmartTrip from './pages/smart-trip/view'
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
                path="preview-trip"
                element={
                  <ProtectedRoute>
                    <PreviewTrip />
                  </ProtectedRoute>
                }
              />  

                <Route
                  path="view-trip/:tripId"
                  element={
                    <ProtectedRoute>
                      <ViewTrip />
                    </ProtectedRoute>
                  }
                />

              <Route path='/smart-trip' 
                element={
                  <ProtectedRoute>
                <SmartTripPage />
                  </ProtectedRoute>
                }
                 />

              <Route path='/smart-trip/view/:tripId' 
                element={
                  <ProtectedRoute>
                <ViewSmartTrip />
                  </ProtectedRoute>
                }
                 />

              <Route
                path="edit-trip/:tripId"
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

                {/* Manual trip creation detail pages */}
                <Route
                  path="manual/hotel/:slug"
                  element={
                    <ProtectedRoute>
                      <ManualHotelDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="manual/attraction/:slug"
                  element={
                    <ProtectedRoute>
                      <ManualAttractionDetails />
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

              <Route
                path="/trip/:tripId/track"
                element={
                  <ProtectedRoute>
                    <TripTracking />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </LocaleProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
