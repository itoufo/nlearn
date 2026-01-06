import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { DocPage } from './pages/DocPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AuthCallback from './pages/auth/AuthCallback'
import DashboardPage from './pages/dashboard/DashboardPage'
import CourseCatalogPage from './pages/courses/CourseCatalogPage'
import ProfileSettingsPage from './pages/settings/ProfileSettingsPage'
import NotificationSettingsPage from './pages/settings/NotificationSettingsPage'
import LINESettingsPage from './pages/settings/LINESettingsPage'
import EnrollPage from './pages/enroll/EnrollPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="doc/:docId" element={<DocPage />} />
            <Route path="courses" element={<CourseCatalogPage />} />
          </Route>

          {/* Auth routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
          </Route>

          {/* Settings routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="notifications" element={<NotificationSettingsPage />} />
            <Route path="line" element={<LINESettingsPage />} />
          </Route>

          {/* Enrollment route */}
          <Route
            path="/enroll/:slug"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EnrollPage />} />
          </Route>

          {/* Checkout route */}
          <Route
            path="/checkout/:slug"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CheckoutPage />} />
          </Route>

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
