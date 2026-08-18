export type UserRole = 'admin' | 'sales' | 'quality' | 'confection' | 'production'

export type AppModule =
  | 'dashboard'
  | 'gantt'
  | 'active_orders'
  | 'optimize'
  | 'import'
  | 'completed'
  | 'materials'
  | 'machines'
  | 'users'
  | 'confection_dashboard'
  | 'confection_gantt'
  | 'confection_orders'
  | 'confection_optimize'
  | 'confection_import'
  | 'confection_completed'
  | 'confection_teams'

export type ItemPermissionField =
  | 'machine'
  | 'start_date'
  | 'pieces'
  | 'piece_length'
  | 'notes'
  | 'meters_produced'
  | 'complete'
  | 'delete_all'

export interface PermissionEntry {
  view: boolean
  modify: boolean
}

export interface UserPermissions {
  modules: Record<string, PermissionEntry>
  items: Record<string, PermissionEntry>
}

export interface AuthUser {
  username: string
  role: UserRole
  display_name: string
  email?: string | null
  permissions: UserPermissions
}

export const PLANNING_ROLES: UserRole[] = ['admin', 'production']

export function canPlan(role: UserRole): boolean {
  return PLANNING_ROLES.includes(role)
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewModule(user: AuthUser | null, module: AppModule): boolean {
  if (!user?.permissions) return false
  if (user.role === 'admin') return true
  return user.permissions.modules[module]?.view ?? false
}

export function canModifyModule(user: AuthUser | null, module: AppModule): boolean {
  if (!user?.permissions) return false
  if (user.role === 'admin') return true
  return user.permissions.modules[module]?.modify ?? false
}

export function canModifyItem(user: AuthUser | null, field: ItemPermissionField): boolean {
  if (!user?.permissions) return false
  if (user.role === 'admin') return true
  return user.permissions.items[field]?.modify ?? false
}

export function canManageUsers(user: AuthUser | null): boolean {
  return canModifyModule(user, 'users')
}

export const MODULE_ROUTES: Record<AppModule, string> = {
  dashboard: '/',
  gantt: '/gantt',
  active_orders: '/ordenes',
  optimize: '/optimizar',
  import: '/importar',
  completed: '/terminadas',
  materials: '/materiales',
  machines: '/maquinas',
  users: '/usuarios',
  confection_dashboard: '/confeccion',
  confection_gantt: '/confeccion/gantt',
  confection_orders: '/confeccion/ordenes',
  confection_optimize: '/confeccion/optimizar',
  confection_import: '/confeccion/importar',
  confection_completed: '/confeccion/terminadas',
  confection_teams: '/confeccion/equipos',
}

export const ROUTE_MODULE: Record<string, AppModule> = Object.fromEntries(
  Object.entries(MODULE_ROUTES).map(([k, v]) => [v, k as AppModule]),
) as Record<string, AppModule>

export function moduleForPath(pathname: string): AppModule | undefined {
  if (ROUTE_MODULE[pathname]) return ROUTE_MODULE[pathname]
  const match = Object.entries(MODULE_ROUTES)
    .filter(([, route]) => route !== '/' && pathname.startsWith(route + '/'))
    .sort((a, b) => b[1].length - a[1].length)[0]
  return match ? (match[0] as AppModule) : undefined
}
