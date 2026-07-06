import { createContext } from 'react'
import type { AppModule, AuthUser, ItemPermissionField } from './types'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  canPlan: boolean
  isAdmin: boolean
  canView: (module: AppModule) => boolean
  canModify: (module: AppModule) => boolean
  canModifyItem: (field: ItemPermissionField) => boolean
  canManageUsers: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
