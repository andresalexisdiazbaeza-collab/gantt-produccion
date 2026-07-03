import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAuthToken } from '../api/client'
import type { AuthUser } from './types'
import { canPlan, isAdmin } from './types'

const STORAGE_KEY = 'gantt-auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  canPlan: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const persist = useCallback((next: StoredAuth | null) => {
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setAuthToken(next.token)
      setToken(next.token)
      setUser(next.user)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      setAuthToken(null)
      setToken(null)
      setUser(null)
    }
  }, [])

  const logout = useCallback(() => persist(null), [persist])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    persist({ token: res.access_token, user: res.user })
  }, [persist])

  useEffect(() => {
    const stored = readStored()
    if (!stored?.token) {
      setLoading(false)
      return
    }
    setAuthToken(stored.token)
    setToken(stored.token)
    setUser(stored.user)
    api.me()
      .then((u) => persist({ token: stored.token, user: u }))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout, persist])

  const refreshUser = useCallback(async () => {
    const u = await api.me()
    const stored = readStored()
    if (stored?.token) persist({ token: stored.token, user: u })
  }, [persist])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
      canPlan: user ? canPlan(user.role) : false,
      isAdmin: user ? isAdmin(user.role) : false,
    }),
    [user, token, loading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
