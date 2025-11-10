import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from '@/components/ui/sonner.jsx'

// Layout bits
import Header from '@/components/custom/Header.jsx'

// Auth
import { AuthProvider } from '@/context/AuthContext.jsx'
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute.jsx'

// Pages (replace with your actual files)
import Hero from '@/components/custom/Hero.jsx'                 // Landing content
import CreateTrip from '@/pages/create-trip/index.jsx'
import ViewTrip from '@/pages/view-trip/[tripId]/index.jsx'
import EditTrip from '@/pages/edit-trip'
import MyTrips from '@/pages/my-trips/index.jsx'
import ProfilePage from '@/pages/profile/index.jsx'

// Root layout INSIDE the router so any component can use <Link/>
function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Toaster />
    </>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
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
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
