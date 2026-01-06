-- =====================================================
-- NLearn Platform - Initial Database Schema
-- =====================================================
-- Supabase PostgreSQL Migration
-- Created: 2026-01-06
-- Schema: nlearn
-- Naming Convention:
--   - Schema: nlearn
--   - Functions: nlearn_*
--   - Buckets: nlearn_*
-- =====================================================

-- Create nlearn schema
CREATE SCHEMA IF NOT EXISTS nlearn;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Set search path to include nlearn schema
SET search_path TO nlearn, public;

-- =====================================================
-- ENUMS (in nlearn schema)
-- =====================================================

CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'admin');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE certification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE notification_type AS ENUM ('reminder', 'announcement', 'completion', 'approval', 'system');
CREATE TYPE notification_channel AS ENUM ('email', 'line', 'push');

-- =====================================================
-- USERS & PROFILES
-- =====================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'learner' NOT NULL,
    line_user_id TEXT UNIQUE,  -- LINE連携用
    stripe_customer_id TEXT UNIQUE,  -- Stripe顧客ID
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- COURSES & CHAPTERS
-- =====================================================

-- Courses (教材)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price INTEGER DEFAULT 0 NOT NULL,  -- 0 = 無料, それ以外は円
    currency TEXT DEFAULT 'jpy' NOT NULL,
    stripe_price_id TEXT,  -- Stripe Price ID
    status course_status DEFAULT 'draft' NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    estimated_hours INTEGER,  -- 想定学習時間
    instructor_id UUID REFERENCES profiles(id),
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_slug ON courses(slug);

-- Chapters (チャプター)
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content_path TEXT NOT NULL,  -- Markdownファイルパス
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    order_index INTEGER DEFAULT 0 NOT NULL,
    is_preview BOOLEAN DEFAULT FALSE,  -- 無料プレビュー可能
    quiz_id TEXT,  -- クイズファイルID
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(course_id, slug)
);

CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_chapters_order ON chapters(course_id, order_index);

-- =====================================================
-- ENROLLMENTS & PAYMENTS
-- =====================================================

-- Enrollments (受講登録)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    status enrollment_status DEFAULT 'active' NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,  -- NULL = 無期限
    stripe_subscription_id TEXT,  -- サブスク用
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Payment history (決済履歴)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'jpy' NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    status TEXT NOT NULL,  -- succeeded, pending, failed
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);

-- =====================================================
-- LEARNING PROGRESS & LOGS
-- =====================================================

-- Chapter progress (チャプター進捗)
CREATE TABLE chapter_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    scroll_position FLOAT DEFAULT 0,  -- 読書位置保存
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, chapter_id)
);

CREATE INDEX idx_chapter_progress_user_id ON chapter_progress(user_id);
CREATE INDEX idx_chapter_progress_chapter_id ON chapter_progress(chapter_id);

-- Learning logs (学習ログ - 詳細履歴)
CREATE TABLE learning_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,  -- 'start', 'pause', 'resume', 'complete', 'quiz_start', 'quiz_end'
    metadata JSONB DEFAULT '{}',  -- 追加情報（クイズスコア等）
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_learning_logs_user_id ON learning_logs(user_id);
CREATE INDEX idx_learning_logs_created_at ON learning_logs(created_at);
CREATE INDEX idx_learning_logs_action ON learning_logs(action);

-- Learning stats (学習統計 - 集計用)
CREATE TABLE learning_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
    total_chapters_completed INTEGER DEFAULT 0 NOT NULL,
    total_courses_completed INTEGER DEFAULT 0 NOT NULL,
    current_streak_days INTEGER DEFAULT 0 NOT NULL,
    longest_streak_days INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_learning_stats_user_id ON learning_stats(user_id);

-- =====================================================
-- QUIZZES & ASSESSMENTS
-- =====================================================

-- Quiz attempts (テスト受験記録)
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
    quiz_id TEXT NOT NULL,
    score INTEGER NOT NULL,  -- パーセンテージ (0-100)
    passed BOOLEAN NOT NULL,
    answers JSONB NOT NULL,  -- 回答詳細
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_chapter_id ON quiz_attempts(chapter_id);
CREATE INDEX idx_quiz_attempts_passed ON quiz_attempts(passed);

-- =====================================================
-- CERTIFICATIONS & APPROVALS
-- =====================================================

-- Certifications (修了証・承認)
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    status certification_status DEFAULT 'pending' NOT NULL,
    certificate_number TEXT UNIQUE,  -- 証明書番号
    certificate_url TEXT,  -- PDF URL
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_submitted_at ON certifications(submitted_at);

-- =====================================================
-- NOTES & BOOKMARKS
-- =====================================================

-- Notes (ノート)
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    highlight_text TEXT,
    highlight_position INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_chapter_id ON notes(chapter_id);

-- Bookmarks (ブックマーク)
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    scroll_position FLOAT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, chapter_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Notification settings (通知設定)
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    line_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    push_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    reminder_time TIME DEFAULT '09:00:00',  -- リマインド時刻
    reminder_days INTEGER[] DEFAULT '{1,3,7}',  -- リマインド日数
    newsletter_subscribed BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications (通知履歴)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- =====================================================
-- LINE INTEGRATION
-- =====================================================

-- LINE connections (LINE連携)
CREATE TABLE line_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    line_user_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_line_connections_line_user_id ON line_connections(line_user_id);

-- =====================================================
-- NEWSLETTER
-- =====================================================

-- Newsletter campaigns (メルマガキャンペーン)
CREATE TABLE newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,  -- HTML content
    preview_text TEXT,
    segment JSONB DEFAULT '{}',  -- ターゲットセグメント条件
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' NOT NULL,  -- draft, scheduled, sending, sent
    stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX idx_newsletter_campaigns_scheduled_at ON newsletter_campaigns(scheduled_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS (nlearn_ prefix)
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION nlearn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER nlearn_update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_chapter_progress_updated_at
    BEFORE UPDATE ON chapter_progress
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

CREATE TRIGGER nlearn_update_line_connections_updated_at
    BEFORE UPDATE ON line_connections
    FOR EACH ROW EXECUTE FUNCTION nlearn_update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION nlearn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );

    -- Initialize learning stats
    INSERT INTO learning_stats (user_id)
    VALUES (NEW.id);

    -- Initialize notification settings
    INSERT INTO notification_settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER nlearn_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION nlearn_handle_new_user();

-- Generate certificate number
CREATE OR REPLACE FUNCTION nlearn_generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND NEW.certificate_number IS NULL THEN
        NEW.certificate_number := 'NLEARN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                                   UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nlearn_generate_cert_number
    BEFORE UPDATE ON certifications
    FOR EACH ROW EXECUTE FUNCTION nlearn_generate_certificate_number();

-- =====================================================
-- STORAGE BUCKETS (nlearn_ prefix)
-- =====================================================

-- Note: Run these via Supabase Dashboard or supabase CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES
--   ('nlearn_avatars', 'nlearn_avatars', true),
--   ('nlearn_thumbnails', 'nlearn_thumbnails', true),
--   ('nlearn_certificates', 'nlearn_certificates', false),
--   ('nlearn_attachments', 'nlearn_attachments', false);
