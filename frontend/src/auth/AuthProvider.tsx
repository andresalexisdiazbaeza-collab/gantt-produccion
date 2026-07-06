import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAuthToken } from '../api/client'
import {
  canManageUsers,
  canModifyItem,
  canModifyModule,
  canPlan,
  canViewModule,
  isAdmin,
  type AppModule,
  type AuthUser,
  type ItemPermissionField,
} from './types'
import { AuthContext, type AuthContextValue } from './authContext'

const STORAGE_KEY = 'gantt-auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

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

  const canView = useCallback((module: AppModule) => canViewModule(user, module), [user])
  const canModify = useCallback((module: AppModule) => canModifyModule(user, module), [user])
  const canModifyItemField = useCallback((field: ItemPermissionField) => canModifyItem(user, field), [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
      canPlan: user ? canPlan(user.role) : false,
      isAdmin: user ? isAdmin(user.role) : false,
      canView,
      canModify,
      canModifyItem: canModifyItemField,
      canManageUsers: canManageUsers(user),
    }),
    [user, token, loading, login, logout, refreshUser, canView, canModify, canModifyItemField],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { useAuth } from './usePermissions'
