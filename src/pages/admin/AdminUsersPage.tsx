import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './AdminPages.css'

interface User {
  id: string
  email: string
  fullName: string
  avatar: string | null
  role: 'admin' | 'instructor' | 'learner'
  status: 'active' | 'pending' | 'inactive'
  createdAt: string
  lastLoginAt: string | null
  enrollmentCount: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data
        setUsers([
          {
            id: '1',
            email: 'admin@example.com',
            fullName: '管理者 太郎',
            avatar: null,
            role: 'admin',
            status: 'active',
            createdAt: '2024-01-15T09:00:00Z',
            lastLoginAt: new Date().toISOString(),
            enrollmentCount: 0
          },
          {
            id: '2',
            email: 'instructor@example.com',
            fullName: '講師 花子',
            avatar: null,
            role: 'instructor',
            status: 'active',
            createdAt: '2024-02-01T10:30:00Z',
            lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
            enrollmentCount: 0
          },
          {
            id: '3',
            email: 'user1@example.com',
            fullName: '山田 一郎',
            avatar: null,
            role: 'learner',
            status: 'active',
            createdAt: '2024-03-10T14:20:00Z',
            lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
            enrollmentCount: 3
          },
          {
            id: '4',
            email: 'user2@example.com',
            fullName: '佐藤 美咲',
            avatar: null,
            role: 'learner',
            status: 'active',
            createdAt: '2024-03-15T11:00:00Z',
            lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
            enrollmentCount: 2
          },
          {
            id: '5',
            email: 'pending@example.com',
            fullName: '田中 次郎',
            avatar: null,
            role: 'learner',
            status: 'pending',
            createdAt: '2024-03-20T16:45:00Z',
            lastLoginAt: null,
            enrollmentCount: 0
          }
        ])
        setLoading(false)
        return
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            role,
            status,
            created_at,
            last_login_at
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        interface ProfileData {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string | null
          status: string | null
          created_at: string
          last_login_at: string | null
        }

        const usersWithEnrollments: User[] = await Promise.all(
          ((data || []) as ProfileData[]).map(async (user) => {
            const { count } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)

            return {
              id: user.id,
              email: user.email,
              fullName: user.full_name || 'Unknown',
              avatar: user.avatar_url,
              role: (user.role || 'learner') as 'admin' | 'instructor' | 'learner',
              status: (user.status || 'active') as 'active' | 'pending' | 'inactive',
              createdAt: user.created_at,
              lastLoginAt: user.last_login_at,
              enrollmentCount: count || 0
            }
          })
        )

        setUsers(usersWithEnrollments)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'role-badge admin'
      case 'instructor': return 'role-badge instructor'
      default: return 'role-badge learner'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者'
      case 'instructor': return '講師'
      default: return '受講者'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-badge active'
      case 'pending': return 'status-badge pending'
      default: return 'status-badge inactive'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '有効'
      case 'pending': return '保留中'
      default: return '無効'
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
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>ユーザー管理</h1>
        <button className="primary-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新規ユーザー
        </button>
      </header>

      <div className="admin-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="名前またはメールで検索..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
        />
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="all">すべての権限</option>
          <option value="admin">管理者</option>
          <option value="instructor">講師</option>
          <option value="learner">受講者</option>
        </select>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>権限</th>
              <th>ステータス</th>
              <th>登録日</th>
              <th>受講コース</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.fullName} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={getRoleBadgeClass(user.role)}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td>
                  <span className={getStatusBadgeClass(user.status)}>
                    {getStatusLabel(user.status)}
                  </span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{user.enrollmentCount}コース</td>
                <td>
                  <div className="table-actions">
                    <button className="action-icon-btn" title="詳細">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button className="action-icon-btn" title="編集">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="action-icon-btn" title="削除">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              前へ
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
