import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/usePermissions'
import { moduleForPath } from '../auth/types'

export default function ModuleGuard() {
  const { canView } = useAuth()
  const { pathname } = useLocation()
  const module = moduleForPath(pathname)
  if (module && !canView(module)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
