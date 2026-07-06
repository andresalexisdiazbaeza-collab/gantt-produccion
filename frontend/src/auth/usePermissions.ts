import { useContext, useMemo } from 'react'
import { AuthContext } from './authContext'
import type { AppModule, AuthUser, ItemPermissionField, UserPermissions } from './types'
import {
  canManageUsers,
  canModifyItem,
  canModifyModule,
  canPlan,
  canViewModule,
  isAdmin,
} from './types'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function usePermissions(user: AuthUser | null) {
  return useMemo(
    () => ({
      canView: (module: AppModule) => canViewModule(user, module),
      canModify: (module: AppModule) => canModifyModule(user, module),
      canModifyItem: (field: ItemPermissionField) => canModifyItem(user, field),
      canManageUsers: () => canManageUsers(user),
      canPlan: user ? canPlan(user.role) : false,
      isAdmin: user ? isAdmin(user.role) : false,
    }),
    [user],
  )
}

export function emptyPermissions(): UserPermissions {
  return { modules: {}, items: {} }
}

export function applyRoleDefaults(
  role: string,
  defaults: Record<string, UserPermissions>,
): UserPermissions {
  return defaults[role] ?? defaults.sales ?? emptyPermissions()
}

export function togglePermission(
  perms: UserPermissions,
  group: 'modules' | 'items',
  key: string,
  field: 'view' | 'modify',
  value: boolean,
): UserPermissions {
  const current = perms[group][key] ?? { view: false, modify: false }
  const next = { ...current, [field]: value }
  if (field === 'view' && !value) next.modify = false
  if (field === 'modify' && value) next.view = true
  return {
    ...perms,
    [group]: { ...perms[group], [key]: next },
  }
}
