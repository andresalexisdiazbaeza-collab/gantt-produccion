export type UserRole = 'admin' | 'sales' | 'quality' | 'confection' | 'production'

export interface AuthUser {
  username: string
  role: UserRole
  display_name: string
  email?: string | null
}

export const PLANNING_ROLES: UserRole[] = ['admin', 'production']

export function canPlan(role: UserRole): boolean {
  return PLANNING_ROLES.includes(role)
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}
