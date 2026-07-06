import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/usePermissions'
import { ROUTE_MODULE } from '../auth/types'

export default function ModuleGuard() {
  const { canView } = useAuth()
  const { pathname } = useLocation()
  const module = ROUTE_MODULE[pathname]
  if (module && !canView(module)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
