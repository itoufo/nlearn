import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { LearningStats, Course } from '../../types/database.types'
import './DashboardPage.css'

interface EnrolledCourse extends Course {
  progress: {
    total_chapters: number
    completed_chapters: number
    completion_percentage: number
  }
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        // Fetch learning stats
        const { data: statsData } = await supabase
          .from('learning_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (statsData) {
          setStats(statsData)
        }

        // Fetch enrolled courses with progress
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            course:courses (
              id,
              title,
              slug,
              thumbnail_url,
              description
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (enrollments) {
          // For each enrollment, get progress
          interface ProgressResult {
            total_chapters: number
            completed_chapters: number
            completion_percentage: number
          }
          const coursesWithProgress = await Promise.all(
            (enrollments as Array<{ course: Course }>).map(async (e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: progress } = await (supabase as any)
                .rpc('nlearn_get_course_progress', {
                  p_user_id: user.id,
                  p_course_id: e.course.id
                }) as { data: ProgressResult | null }

              return {
                ...e.course,
                progress: progress || {
                  total_chapters: 0,
                  completed_chapters: 0,
                  completion_percentage: 0
                }
              }
            })
          )
          setEnrolledCourses(coursesWithProgress)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}時間${minutes}分`
    }
    return `${minutes}分`
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>ようこそ、{profile?.full_name || user?.email}さん</h1>
          <p>今日も学習を続けましょう！</p>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.total_chapters_completed || 0}</span>
            <span className="stat-label">完了チャプター</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatTime(stats?.total_time_spent_seconds || 0)}</span>
            <span className="stat-label">学習時間</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon streak">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M2 12h20"/>
              <path d="M17 7l-5 5-5-5"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.current_streak_days || 0}日</span>
            <span className="stat-label">連続学習</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon courses">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.total_courses_completed || 0}</span>
            <span className="stat-label">修了コース</span>
          </div>
        </div>
      </section>

      {/* Enrolled Courses */}
      <section className="enrolled-courses">
        <div className="section-header">
          <h2>受講中のコース</h2>
          <Link to="/courses" className="browse-link">コースを探す →</Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3>受講中のコースはありません</h3>
            <p>コースカタログから学びたいコースを見つけましょう。</p>
            <Link to="/courses" className="cta-button">コースを探す</Link>
          </div>
        ) : (
          <div className="courses-grid">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="course-card">
                {course.thumbnail_url && (
                  <div className="course-thumbnail">
                    <img src={course.thumbnail_url} alt={course.title} />
                  </div>
                )}
                <div className="course-content">
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="course-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${course.progress.completion_percentage}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {course.progress.completed_chapters}/{course.progress.total_chapters} チャプター
                      ({Math.round(course.progress.completion_percentage)}%)
                    </span>
                  </div>
                  <Link to={`/doc/${course.slug}`} className="continue-button">
                    学習を続ける
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>クイックアクション</h2>
        <div className="actions-grid">
          <Link to="/settings/profile" className="action-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>プロフィール編集</span>
          </Link>
          <Link to="/settings/notifications" className="action-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span>通知設定</span>
          </Link>
          <Link to="/certifications" className="action-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7"/>
              <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
            </svg>
            <span>修了証</span>
          </Link>
          <Link to="/settings/line" className="action-card">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span>LINE連携</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
