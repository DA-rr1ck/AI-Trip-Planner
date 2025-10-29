import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'

const AuthCtx = createContext({
  user: null,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }) {
  // initialize from localStorage so header/UX has a user immediately if Google FE login was used
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })

  const refresh = async () => {
    // Try BE cookie session first (email/password). If 401, fall back to FE Google localStorage profile.
    try {
      const { data } = await api.get('/auth/me') // { user: { id, email, displayName, avatarUrl } }
      const u = data?.user
      setUser({
        id: u?.id,
        email: u?.email,
        name: u?.displayName || u?.email,
        picture: u?.avatarUrl || '/avatar-fallback.png',
      })
      // keep a lightweight snapshot for UI components that read from localStorage
      localStorage.setItem('user', JSON.stringify({
        email: u?.email,
        name: u?.displayName || u?.email,
        picture: u?.avatarUrl || '/avatar-fallback.png',
      }))
    } catch (e) {
      const s = localStorage.getItem('user')
      if (s) {
        setUser(JSON.parse(s))
      } else {
        setUser(null)
      }
    }
  }

  useEffect(() => { refresh() }, [])

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
