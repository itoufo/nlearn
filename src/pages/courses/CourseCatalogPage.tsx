import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Course } from '../../types/database.types'
import './CourseCatalogPage.css'

export default function CourseCatalogPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data for development
        setCourses([
          {
            id: '1',
            title: 'AI活用人材育成カリキュラム',
            slug: 'ai-curriculum',
            description: 'AIリテラシーから実践的なAI活用スキルまで体系的に学べる総合カリキュラム',
            thumbnail_url: '/docs/images/haiia-logo.svg',
            price: 0,
            currency: 'jpy',
            stripe_price_id: null,
            status: 'published',
            category: 'AI・機械学習',
            tags: ['AI', 'リテラシー', '入門'],
            estimated_hours: 30,
            instructor_id: null,
            order_index: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        setLoading(false)
        return
      }

      try {
        // Fetch published courses
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'published')
          .order('order_index')

        if (coursesData) {
          setCourses(coursesData)
        }

        // Fetch user's enrollments
        if (user) {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id)
            .eq('status', 'active') as { data: { course_id: string }[] | null }

          if (enrollments) {
            setEnrolledCourseIds(new Set(enrollments.map(e => e.course_id)))
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  const filteredCourses = courses.filter(course => {
    // Filter by price
    if (filter === 'free' && course.price > 0) return false
    if (filter === 'paid' && course.price === 0) return false

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return true
  })

  const formatPrice = (price: number) => {
    if (price === 0) return '無料'
    return `¥${price.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <h1>コースカタログ</h1>
        <p>学びたいコースを見つけて、今すぐ始めましょう</p>
      </header>

      <div className="catalog-filters">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="コースを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button
            className={filter === 'free' ? 'active' : ''}
            onClick={() => setFilter('free')}
          >
            無料
          </button>
          <button
            className={filter === 'paid' ? 'active' : ''}
            onClick={() => setFilter('paid')}
          >
            有料
          </button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <h3>コースが見つかりません</h3>
          <p>検索条件を変更してみてください。</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <article key={course.id} className="course-card">
              <div className="course-thumbnail">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                )}
                <span className="price-badge">{formatPrice(course.price)}</span>
              </div>

              <div className="course-body">
                {course.category && (
                  <span className="course-category">{course.category}</span>
                )}
                <h2>{course.title}</h2>
                <p>{course.description}</p>

                <div className="course-meta">
                  {course.estimated_hours && (
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      約{course.estimated_hours}時間
                    </span>
                  )}
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                    </svg>
                    {course.tags.length}チャプター
                  </span>
                </div>

                {course.tags.length > 0 && (
                  <div className="course-tags">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="course-footer">
                {enrolledCourseIds.has(course.id) ? (
                  <Link to={`/doc/${course.slug}`} className="course-button enrolled">
                    学習を続ける
                  </Link>
                ) : course.price === 0 ? (
                  <Link to={user ? `/enroll/${course.slug}` : '/auth/login'} className="course-button free">
                    無料で始める
                  </Link>
                ) : (
                  <Link to={user ? `/checkout/${course.slug}` : '/auth/login'} className="course-button">
                    購入する
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
