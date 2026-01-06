import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Course } from '../../types/database.types'
import './CheckoutPage.css'

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!slug) return

    const fetchCourse = async () => {
      if (!isSupabaseConfigured()) {
        // Demo data
        setCourse({
          id: '2',
          title: 'AI実践マスターコース',
          slug: 'ai-master',
          description: '上級者向けのAI実践コース。機械学習モデルの構築から運用まで実践的なスキルを習得します。',
          thumbnail_url: null,
          price: 9800,
          currency: 'jpy',
          stripe_price_id: 'price_demo123',
          status: 'published',
          category: 'AI・機械学習',
          tags: ['AI', '機械学習', '実践', '上級'],
          estimated_hours: 50,
          instructor_id: null,
          order_index: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setLoading(false)
        return
      }

      try {
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

        // Free courses should go to enroll page
        if (courseData.price === 0) {
          navigate(`/enroll/${courseData.slug}`)
          return
        }

        setCourse(courseData)
      } catch (error) {
        console.error('Error fetching course:', error)
        toast.error('コースの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [slug, navigate])

  const handleCheckout = async () => {
    if (!course || !user || !stripePromise) {
      toast.error('決済を開始できません')
      return
    }

    setProcessing(true)

    try {
      // Create checkout session via Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nlearn_create_checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          course_id: course.id,
          price_id: course.stripe_price_id,
          success_url: `${window.location.origin}/enroll/${course.slug}?success=true`,
          cancel_url: `${window.location.origin}/checkout/${course.slug}`
        })
      })

      const { sessionId, error } = await response.json()

      if (error) throw new Error(error)

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (stripe) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: stripeError } = await (stripe as any).redirectToCheckout({ sessionId })
        if (stripeError) throw stripeError
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('決済の開始に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="checkout-not-found">
        <h1>コースが見つかりません</h1>
        <Link to="/courses">コース一覧に戻る</Link>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <header className="checkout-header">
          <h1>お支払い</h1>
          <p>以下の内容をご確認ください</p>
        </header>

        <div className="checkout-content">
          {/* Order Summary */}
          <div className="order-summary">
            <h2>ご注文内容</h2>

            <div className="order-item">
              <div className="item-thumbnail">
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
              <div className="item-details">
                <h3>{course.title}</h3>
                <p>{course.category}</p>
              </div>
              <div className="item-price">
                ¥{course.price.toLocaleString()}
              </div>
            </div>

            <div className="order-total">
              <span>合計</span>
              <span className="total-amount">¥{course.price.toLocaleString()}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="customer-info">
            <h2>お客様情報</h2>

            <div className="info-row">
              <span className="info-label">お名前</span>
              <span className="info-value">{profile?.full_name || '未設定'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">メールアドレス</span>
              <span className="info-value">{user?.email}</span>
            </div>
          </div>

          {/* Payment Button */}
          <div className="checkout-actions">
            {!stripePromise ? (
              <div className="stripe-not-configured">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p>決済システムが設定されていません</p>
                <Link to={`/enroll/${course.slug}`}>コース詳細に戻る</Link>
              </div>
            ) : (
              <>
                <button
                  className="checkout-button"
                  onClick={handleCheckout}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="button-spinner"></span>
                      処理中...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      カードで支払う
                    </>
                  )}
                </button>

                <p className="checkout-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  安全なStripe決済システムで処理されます
                </p>
              </>
            )}
          </div>

          {/* Cancel Link */}
          <div className="checkout-cancel">
            <Link to={`/enroll/${course.slug}`}>← コース詳細に戻る</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
