import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'learner' | 'instructor' | 'admin'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, isConfigured } = useAuth()
  const location = useLocation()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  // If Supabase not configured, allow access (development mode)
  if (!isConfigured) {
    return <>{children}</>
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  }

  // Check role if required
  if (requiredRole && profile) {
    const roleHierarchy = ['learner', 'instructor', 'admin']
    const userRoleIndex = roleHierarchy.indexOf(profile.role)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    if (userRoleIndex < requiredRoleIndex) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
