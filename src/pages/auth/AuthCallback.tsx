import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AuthPages.css'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )

      if (error) {
        console.error('Auth callback error:', error)
        navigate('/auth/login?error=callback_failed')
      } else {
        navigate('/dashboard')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-loading">
            <div className="spinner"></div>
            <p>認証中...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
