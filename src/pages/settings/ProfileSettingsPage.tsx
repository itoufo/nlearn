import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './SettingsPages.css'

export default function ProfileSettingsPage() {
  const { user, profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl
    })

    if (error) {
      toast.error('プロフィールの更新に失敗しました')
    } else {
      toast.success('プロフィールを更新しました')
    }

    setLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!isSupabaseConfigured()) {
      toast.error('ストレージが設定されていません')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('ファイルサイズは2MB以下にしてください')
      return
    }

    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('nlearn_avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('nlearn_avatars')
        .getPublicUrl(fileName)

      setAvatarUrl(data.publicUrl)
      toast.success('アバターをアップロードしました')
    } catch {
      toast.error('アバターのアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="settings-page">
      <nav className="settings-breadcrumb">
        <Link to="/dashboard">ダッシュボード</Link>
        <span>/</span>
        <span>プロフィール設定</span>
      </nav>

      <header className="settings-header">
        <h1>プロフィール設定</h1>
        <p>アカウント情報を管理します</p>
      </header>

      <div className="settings-content">
        <form onSubmit={handleSubmit} className="settings-form">
          {/* Avatar Section */}
          <div className="form-section">
            <h2>プロフィール画像</h2>
            <div className="avatar-upload">
              <div className="avatar-preview">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="avatar-actions">
                <label className="upload-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  {uploading ? 'アップロード中...' : '画像を変更'}
                </label>
                <p className="upload-hint">JPG, PNG, GIF（最大2MB）</p>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="form-section">
            <h2>基本情報</h2>

            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="input-disabled"
              />
              <p className="form-hint">メールアドレスは変更できません</p>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">お名前</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
          </div>

          {/* Account Info Section */}
          <div className="form-section">
            <h2>アカウント情報</h2>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">ロール</span>
                <span className="info-value">
                  {profile?.role === 'admin' && '管理者'}
                  {profile?.role === 'instructor' && 'インストラクター'}
                  {profile?.role === 'learner' && '受講者'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">登録日</span>
                <span className="info-value">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('ja-JP')
                    : '-'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">LINE連携</span>
                <span className="info-value">
                  {profile?.line_user_id ? '連携済み' : '未連携'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>

        {/* Side Links */}
        <aside className="settings-sidebar">
          <nav className="sidebar-nav">
            <Link to="/settings/profile" className="nav-item active">
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
            <Link to="/settings/line" className="nav-item">
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
