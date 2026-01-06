import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './AdminPages.css'

interface Course {
  id: string
  title: string
  slug: string
  description: string
  thumbnail: string | null
  price: number
  status: 'draft' | 'published' | 'archived'
  enrollmentCount: number
  completionRate: number
  createdAt: string
  updatedAt: string
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    const fetchCourses = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data
        setCourses([
          {
            id: '1',
            title: 'AI基礎コース',
            slug: 'ai-basics',
            description: 'AIの基礎から応用まで学べる包括的なコース',
            thumbnail: null,
            price: 9800,
            status: 'published',
            enrollmentCount: 156,
            completionRate: 72,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-03-15T10:30:00Z'
          },
          {
            id: '2',
            title: '機械学習入門',
            slug: 'ml-intro',
            description: '機械学習の基本概念と実践的な応用方法',
            thumbnail: null,
            price: 12800,
            status: 'published',
            enrollmentCount: 89,
            completionRate: 65,
            createdAt: '2024-02-01T00:00:00Z',
            updatedAt: '2024-03-10T14:00:00Z'
          },
          {
            id: '3',
            title: 'プロンプトエンジニアリング',
            slug: 'prompt-engineering',
            description: '効果的なAIプロンプトの設計と最適化',
            thumbnail: null,
            price: 0,
            status: 'published',
            enrollmentCount: 234,
            completionRate: 45,
            createdAt: '2024-02-15T00:00:00Z',
            updatedAt: '2024-03-01T09:00:00Z'
          },
          {
            id: '4',
            title: 'ディープラーニング実践',
            slug: 'deep-learning',
            description: 'PyTorchを使った実践的なディープラーニング',
            thumbnail: null,
            price: 19800,
            status: 'draft',
            enrollmentCount: 0,
            completionRate: 0,
            createdAt: '2024-03-01T00:00:00Z',
            updatedAt: '2024-03-20T16:00:00Z'
          },
          {
            id: '5',
            title: 'AI倫理と社会',
            slug: 'ai-ethics',
            description: 'AIの社会的影響と倫理的考慮事項',
            thumbnail: null,
            price: 4800,
            status: 'archived',
            enrollmentCount: 45,
            completionRate: 88,
            createdAt: '2023-10-01T00:00:00Z',
            updatedAt: '2024-01-15T11:00:00Z'
          }
        ])
        setLoading(false)
        return
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('courses')
          .select(`
            id,
            title,
            slug,
            description,
            thumbnail_url,
            price,
            status,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        interface CourseData {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          price: number | null
          status: string | null
          created_at: string
          updated_at: string
        }

        const coursesWithStats: Course[] = await Promise.all(
          ((data || []) as CourseData[]).map(async (course) => {
            const { count: enrollmentCount } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)

            return {
              id: course.id,
              title: course.title,
              slug: course.slug,
              description: course.description || '',
              thumbnail: course.thumbnail_url,
              price: course.price || 0,
              status: (course.status || 'draft') as 'draft' | 'published' | 'archived',
              enrollmentCount: enrollmentCount || 0,
              completionRate: 0, // Would need to calculate
              createdAt: course.created_at,
              updatedAt: course.updated_at
            }
          })
        )

        setCourses(coursesWithStats)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '無料'
    return `¥${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published': return 'status-badge active'
      case 'draft': return 'status-badge pending'
      default: return 'status-badge inactive'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return '公開中'
      case 'draft': return '下書き'
      default: return 'アーカイブ'
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
        <h1>コース管理</h1>
        <button className="primary-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新規コース
        </button>
      </header>

      <div className="admin-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="コース名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">すべてのステータス</option>
          <option value="published">公開中</option>
          <option value="draft">下書き</option>
          <option value="archived">アーカイブ</option>
        </select>
      </div>

      <div className="courses-grid">
        {filteredCourses.map((course) => (
          <div key={course.id} className="course-admin-card">
            <div className="course-thumbnail">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} />
              ) : (
                <div className="thumbnail-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                </div>
              )}
              <span className={getStatusBadgeClass(course.status)}>
                {getStatusLabel(course.status)}
              </span>
            </div>
            <div className="course-card-content">
              <h3>{course.title}</h3>
              <p className="course-description">{course.description}</p>
              <div className="course-meta">
                <span className="course-price">{formatCurrency(course.price)}</span>
                <span className="course-stats">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  {course.enrollmentCount}
                </span>
                {course.completionRate > 0 && (
                  <span className="course-completion">
                    完了率 {course.completionRate}%
                  </span>
                )}
              </div>
              <div className="course-dates">
                <span>更新: {formatDate(course.updatedAt)}</span>
              </div>
            </div>
            <div className="course-card-actions">
              <Link to={`/doc/${course.slug}`} className="action-link" title="プレビュー">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
              <button className="action-icon-btn" title="編集">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button className="action-icon-btn" title="複製">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              <button className="action-icon-btn danger" title="削除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="15" x2="16" y2="15" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <p>該当するコースが見つかりません</p>
        </div>
      )}
    </div>
  )
}
