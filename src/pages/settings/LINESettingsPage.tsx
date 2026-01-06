import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './SettingsPages.css'

export default function LINESettingsPage() {
  const { user, profile } = useAuth()
  const [disconnecting, setDisconnecting] = useState(false)

  const isConnected = !!profile?.line_user_id

  const handleConnect = () => {
    if (!isSupabaseConfigured()) {
      toast.error('LINE連携が設定されていません')
      return
    }

    // LINE Login URL (would be configured in production)
    const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${import.meta.env.VITE_LINE_CHANNEL_ID || 'YOUR_CHANNEL_ID'}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/line/callback')}&` +
      `state=${user?.id}&` +
      `scope=profile%20openid`

    window.location.href = lineLoginUrl
  }

  const handleDisconnect = async () => {
    if (!isSupabaseConfigured() || !user) {
      toast.error('操作を実行できません')
      return
    }

    if (!confirm('LINE連携を解除しますか？リマインダー通知が届かなくなります。')) {
      return
    }

    setDisconnecting(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ line_user_id: null })
      .eq('id', user.id)

    if (error) {
      toast.error('LINE連携の解除に失敗しました')
    } else {
      toast.success('LINE連携を解除しました')
      // Reload to update profile
      window.location.reload()
    }

    setDisconnecting(false)
  }

  return (
    <div className="settings-page">
      <nav className="settings-breadcrumb">
        <Link to="/dashboard">ダッシュボード</Link>
        <span>/</span>
        <span>LINE連携</span>
      </nav>

      <header className="settings-header">
        <h1>LINE連携</h1>
        <p>LINEアカウントと連携してリマインダーを受け取ります</p>
      </header>

      <div className="settings-content">
        <div className="settings-form">
          {/* Connection Status */}
          <div className="form-section">
            <h2>連携ステータス</h2>

            <div className="line-status">
              <div className="line-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </div>
              <div className="line-info">
                <h3>{isConnected ? '連携済み' : '未連携'}</h3>
                <p>
                  {isConnected
                    ? 'LINEアカウントと連携されています'
                    : 'LINEアカウントと連携すると、リマインダーをLINEで受け取れます'}
                </p>
              </div>
              {isConnected ? (
                <button
                  className="line-button disconnect"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? '解除中...' : '連携解除'}
                </button>
              ) : (
                <button
                  className="line-button"
                  onClick={handleConnect}
                >
                  LINEで連携
                </button>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="form-section">
            <h2>LINE連携のメリット</h2>

            <ul className="benefits-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <div>
                  <strong>学習リマインダー</strong>
                  <span>設定した時間にLINEでお知らせ</span>
                </div>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <div>
                  <strong>進捗通知</strong>
                  <span>コース完了や証明書発行をお知らせ</span>
                </div>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <div>
                  <strong>お知らせ配信</strong>
                  <span>新着コースやキャンペーン情報</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Note */}
          <div className="form-section">
            <div className="info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p>
                LINE連携には、LINE公式アカウント「NLearn」を友だち追加する必要があります。
                連携ボタンをクリックすると、LINEの認証画面に移動します。
              </p>
            </div>
          </div>
        </div>

        {/* Side Links */}
        <aside className="settings-sidebar">
          <nav className="sidebar-nav">
            <Link to="/settings/profile" className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              プロフィール
            </Link>
            <Link to="/settings/notifications" className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              通知設定
            </Link>
            <Link to="/settings/line" className="nav-item active">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE連携
            </Link>
            <Link to="/settings/password" className="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              パスワード変更
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  )
}
