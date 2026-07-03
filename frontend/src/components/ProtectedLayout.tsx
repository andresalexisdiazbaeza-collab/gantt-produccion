import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function ProtectedLayout() {
  const { token, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">...</div>
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}
