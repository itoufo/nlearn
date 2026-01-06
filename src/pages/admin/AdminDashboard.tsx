import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './AdminPages.css'

interface DashboardStats {
  totalUsers: number
  totalCourses: number
  totalEnrollments: number
  totalRevenue: number
  pendingCertifications: number
  activeUsers: number
}

interface RecentActivity {
  id: string
  type: 'enrollment' | 'completion' | 'certification' | 'payment'
  description: string
  timestamp: string
  userId?: string
  userName?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    pendingCertifications: 0,
    activeUsers: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data
        setStats({
          totalUsers: 1234,
          totalCourses: 12,
          totalEnrollments: 3456,
          totalRevenue: 987600,
          pendingCertifications: 23,
          activeUsers: 456
        })
        setRecentActivity([
          { id: '1', type: 'enrollment', description: '山田太郎さんがAI基礎コースに登録', timestamp: new Date().toISOString() },
          { id: '2', type: 'completion', description: '佐藤花子さんがチャプター5を完了', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'certification', description: '鈴木一郎さんが修了証を申請', timestamp: new Date(Date.now() - 7200000).toISOString() },
          { id: '4', type: 'payment', description: '¥9,800の決済が完了', timestamp: new Date(Date.now() - 10800000).toISOString() }
        ])
        setLoading(false)
        return
      }

      try {
        // Fetch actual stats from Supabase
        const [usersResult, coursesResult, enrollmentsResult, certificationsResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('enrollments').select('*', { count: 'exact', head: true }),
          supabase.from('certifications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ])

        setStats({
          totalUsers: usersResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalEnrollments: enrollmentsResult.count || 0,
          totalRevenue: 0, // Would need to aggregate from payments table
          pendingCertifications: certificationsResult.count || 0,
          activeUsers: 0 // Would need to calculate from recent activity
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return '数秒前'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`
    return `${Math.floor(seconds / 86400)}日前`
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'enrollment':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        )
      case 'completion':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
      case 'certification':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="7" />
            <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
          </svg>
        )
      case 'payment':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>管理ダッシュボード</h1>
        <p>プラットフォームの概要と最新情報</p>
      </header>

      {/* Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
            <span className="stat-label">ユーザー数</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon courses">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalCourses}</span>
            <span className="stat-label">コース数</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon enrollments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalEnrollments.toLocaleString()}</span>
            <span className="stat-label">登録数</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
            <span className="stat-label">総売上</span>
          </div>
        </div>
      </section>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <section className="quick-actions-card">
          <h2>クイックアクション</h2>
          <div className="action-buttons">
            <Link to="/admin/users" className="action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              ユーザー管理
            </Link>
            <Link to="/admin/courses" className="action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              コース管理
            </Link>
            <Link to="/admin/certifications" className="action-btn highlight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="7" />
                <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
              </svg>
              承認待ち
              {stats.pendingCertifications > 0 && (
                <span className="badge">{stats.pendingCertifications}</span>
              )}
            </Link>
            <Link to="/admin/analytics" className="action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              アナリティクス
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-card">
          <h2>最近のアクティビティ</h2>
          <ul className="activity-list">
            {recentActivity.map((activity) => (
              <li key={activity.id} className={`activity-item ${activity.type}`}>
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <p>{activity.description}</p>
                  <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/admin/activity" className="view-all-link">
            すべて表示 →
          </Link>
        </section>
      </div>

      {/* Pending Items Alert */}
      {stats.pendingCertifications > 0 && (
        <div className="alert-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>{stats.pendingCertifications}件</strong>の修了証申請が承認待ちです
          </span>
          <Link to="/admin/certifications">確認する</Link>
        </div>
      )}
    </div>
  )
}
