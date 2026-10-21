import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, User } from '../types'
import { loadCurrentUser, login as serviceLogin, logout as serviceLogout } from '../services/meritService'

interface AppContextValue {
  user: User | null
  sessionLoading: boolean
  signIn: (email: string, password: string, role: Role) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}
const AppContext = createContext<AppContextValue | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('merite:unauthorized', handleUnauthorized)
    if (!sessionStorage.getItem('merite_token')) {
      sessionStorage.removeItem('merite_user')
      setSessionLoading(false)
      return () => window.removeEventListener('merite:unauthorized', handleUnauthorized)
    }
    loadCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        sessionStorage.setItem('merite_user', JSON.stringify(currentUser))
      })
      .catch(() => {
        sessionStorage.removeItem('merite_token')
        sessionStorage.removeItem('merite_user')
      })
      .finally(() => setSessionLoading(false))
    return () => window.removeEventListener('merite:unauthorized', handleUnauthorized)
  }, [])
  async function signIn(email: string, password: string, role: Role) {
    const next = await serviceLogin(email, password, role)
    setUser(next)
    sessionStorage.setItem('merite_user', JSON.stringify(next))
  }
  async function signOut() {
    try {
      await serviceLogout()
    } finally {
      setUser(null)
      sessionStorage.removeItem('merite_user')
      sessionStorage.removeItem('merite_token')
    }
  }
  async function refreshUser() {
    const currentUser = await loadCurrentUser()
    setUser(currentUser)
    sessionStorage.setItem('merite_user', JSON.stringify(currentUser))
  }
  const value = useMemo(() => ({ user, sessionLoading, signIn, signOut, refreshUser }), [user, sessionLoading])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp precisa estar dentro de AppProvider')
  return value
}
