import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { NotificationSettings } from '../../types/database.types'
import './SettingsPages.css'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local state for form
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [lineEnabled, setLineEnabled] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false)
      return
    }

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: NotificationSettings | null }

      if (data) {
        setSettings(data)
        setEmailEnabled(data.email_enabled)
        setLineEnabled(data.line_enabled)
        setPushEnabled(data.push_enabled)
        setReminderTime(data.reminder_time)
        setReminderDays(data.reminder_days)
        setNewsletterSubscribed(data.newsletter_subscribed)
      }

      setLoading(false)
    }

    fetchSettings()
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isSupabaseConfigured() || !user) {
      toast.error('設定を保存できません')
      return
    }

    setSaving(true)

    const updates = {
      email_enabled: emailEnabled,
      line_enabled: lineEnabled,
      push_enabled: pushEnabled,
      reminder_time: reminderTime,
      reminder_days: reminderDays,
      newsletter_subscribed: newsletterSubscribed
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = settings
      ? await (supabase as any).from('notification_settings').update(updates).eq('id', settings.id)
      : await (supabase as any).from('notification_settings').insert({ user_id: user.id, ...updates })

    if (error) {
      toast.error('設定の保存に失敗しました')
    } else {
      toast.success('設定を保存しました')
    }

    setSaving(false)
  }

  const toggleDay = (day: number) => {
    setReminderDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <nav className="settings-breadcrumb">
        <Link to="/dashboard">ダッシュボード</Link>
        <span>/</span>
        <span>通知設定</span>
      </nav>

      <header className="settings-header">
        <h1>通知設定</h1>
        <p>リマインダーや通知の受け取り方法を設定します</p>
      </header>

      <div className="settings-content">
        <form onSubmit={handleSubmit} className="settings-form">
          {/* Notification Channels */}
          <div className="form-section">
            <h2>通知チャンネル</h2>

            <div className="toggle-group">
              <div className="toggle-label">
                <span>メール通知</span>
                <small>学習リマインダーをメールで受け取る</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-group">
              <div className="toggle-label">
                <span>LINE通知</span>
                <small>LINEで通知を受け取る（要連携）</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={lineEnabled}
                  onChange={(e) => setLineEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-group">
              <div className="toggle-label">
                <span>プッシュ通知</span>
                <small>ブラウザでプッシュ通知を受け取る</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="form-section">
            <h2>学習リマインダー</h2>

            <div className="form-group">
              <label>リマインド時刻</label>
              <div className="time-picker">
                <select
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return (
                      <option key={hour} value={`${hour}:00`}>
                        {hour}:00
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>リマインド曜日</label>
              <div className="days-selection">
                {DAYS.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`day-button ${reminderDays.includes(index) ? 'active' : ''}`}
                    onClick={() => toggleDay(index)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="form-section">
            <h2>メールマガジン</h2>

            <div className="toggle-group">
              <div className="toggle-label">
                <span>メルマガを受け取る</span>
                <small>新着コースやキャンペーン情報をお届けします</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={newsletterSubscribed}
                  onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>

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
            <Link to="/settings/notifications" className="nav-item active">
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
