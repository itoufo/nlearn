import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Course } from '../../types/database.types'
import './EnrollPage.css'

export default function EnrollPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

  useEffect(() => {
    if (!slug) return

    const fetchCourse = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data
        setCourse({
          id: '1',
          title: 'AI活用人材育成カリキュラム',
          slug: 'ai-curriculum',
          description: 'AIリテラシーから実践的なAI活用スキルまで体系的に学べる総合カリキュラム。基礎から応用まで17のチャプターで構成され、実践的な演習と確認テストで理解を深めます。',
          thumbnail_url: '/docs/images/haiia-logo.svg',
          price: 0,
          currency: 'jpy',
          stripe_price_id: null,
          status: 'published',
          category: 'AI・機械学習',
          tags: ['AI', 'リテラシー', '入門', '実践'],
          estimated_hours: 30,
          instructor_id: null,
          order_index: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setLoading(false)
        return
      }

      try {
        // Fetch course
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .single() as { data: Course | null }

        if (!courseData) {
          toast.error('コースが見つかりません')
          navigate('/courses')
          return
        }

        setCourse(courseData)

        // Check if already enrolled
        if (user) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseData.id)
            .eq('status', 'active')
            .single() as { data: { id: string } | null }

          if (enrollment) {
            setAlreadyEnrolled(true)
          }
        }
      } catch (error) {
        console.error('Error fetching course:', error)
        toast.error('コースの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [slug, user, navigate])

  const handleEnroll = async () => {
    if (!course || !user) return

    // Paid course - redirect to checkout
    if (course.price > 0) {
      navigate(`/checkout/${course.slug}`)
      return
    }

    // Free course - enroll directly
    setEnrolling(true)

    if (!isSupabaseConfigured()) {
      // Demo mode
      toast.success('コースに登録しました！')
      navigate(`/doc/${course.slug}`)
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          status: 'active'
        })

      if (error) throw error

      toast.success('コースに登録しました！')
      navigate(`/doc/${course.slug}`)
    } catch (error) {
      console.error('Error enrolling:', error)
      toast.error('登録に失敗しました')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="enroll-loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="enroll-not-found">
        <h1>コースが見つかりません</h1>
        <Link to="/courses">コース一覧に戻る</Link>
      </div>
    )
  }

  return (
    <div className="enroll-page">
      <div className="enroll-container">
        {/* Course Info */}
        <div className="enroll-course-info">
          <div className="course-thumbnail">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} />
            ) : (
              <div className="thumbnail-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          <div className="course-details">
            {course.category && (
              <span className="course-category">{course.category}</span>
            )}
            <h1>{course.title}</h1>
            <p className="course-description">{course.description}</p>

            <div className="course-meta">
              {course.estimated_hours && (
                <div className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>約{course.estimated_hours}時間</span>
                </div>
              )}
              <div className="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                <span>{course.tags.length}チャプター</span>
              </div>
            </div>

            {course.tags.length > 0 && (
              <div className="course-tags">
                {course.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="enroll-card">
          <div className="price-section">
            <span className="price">
              {course.price === 0 ? '無料' : `¥${course.price.toLocaleString()}`}
            </span>
          </div>

          {alreadyEnrolled ? (
            <>
              <div className="enrolled-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>登録済み</span>
              </div>
              <Link to={`/doc/${course.slug}`} className="enroll-button continue">
                学習を続ける
              </Link>
            </>
          ) : (
            <button
              className={`enroll-button ${course.price === 0 ? 'free' : 'paid'}`}
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? '登録中...' : course.price === 0 ? '無料で始める' : '購入する'}
            </button>
          )}

          <ul className="enroll-features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>全チャプターにアクセス</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>確認テスト付き</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>修了証発行</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>学習進捗の追跡</span>
            </li>
          </ul>

          <p className="enroll-note">
            ※ いつでも学習を中断・再開できます
          </p>
        </div>
      </div>
    </div>
  )
}
