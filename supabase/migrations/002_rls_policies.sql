-- =====================================================
-- NLearn Platform - Row Level Security Policies
-- =====================================================
-- Supabase RLS Policies
-- Created: 2026-01-06
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS (nlearn_ prefix)
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION nlearn_nlearn_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM nlearn.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is instructor
CREATE OR REPLACE FUNCTION nlearn_nlearn_is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM nlearn.profiles
        WHERE id = auth.uid()
        AND role IN ('instructor', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is enrolled in course
CREATE OR REPLACE FUNCTION nlearn_nlearn_is_enrolled(course_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM nlearn.enrollments
        WHERE user_id = auth.uid()
        AND course_id = course_uuid
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'learner');  -- Can't change to admin

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (nlearn_is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (nlearn_is_admin());

-- =====================================================
-- COURSES POLICIES
-- =====================================================

-- Anyone can view published courses
CREATE POLICY "Anyone can view published courses"
    ON courses FOR SELECT
    USING (status = 'published');

-- Instructors can view their own courses
CREATE POLICY "Instructors can view own courses"
    ON courses FOR SELECT
    USING (instructor_id = auth.uid());

-- Admins can view all courses
CREATE POLICY "Admins can view all courses"
    ON courses FOR SELECT
    USING (nlearn_is_admin());

-- Instructors can create courses
CREATE POLICY "Instructors can create courses"
    ON courses FOR INSERT
    WITH CHECK (nlearn_is_instructor() AND instructor_id = auth.uid());

-- Instructors can update their own courses
CREATE POLICY "Instructors can update own courses"
    ON courses FOR UPDATE
    USING (instructor_id = auth.uid() OR nlearn_is_admin());

-- Admins can delete courses
CREATE POLICY "Admins can delete courses"
    ON courses FOR DELETE
    USING (nlearn_is_admin());

-- =====================================================
-- CHAPTERS POLICIES
-- =====================================================

-- Users can view chapters if enrolled or preview
CREATE POLICY "Users can view accessible chapters"
    ON chapters FOR SELECT
    USING (
        is_preview = TRUE
        OR nlearn_is_enrolled(course_id)
        OR nlearn_is_admin()
        OR EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Instructors can manage chapters of their courses
CREATE POLICY "Instructors can manage own chapters"
    ON chapters FOR ALL
    USING (
        nlearn_is_admin()
        OR EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- =====================================================
-- ENROLLMENTS POLICIES
-- =====================================================

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
    ON enrollments FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
    ON enrollments FOR SELECT
    USING (nlearn_is_admin());

-- System can create enrollments (via Edge Functions)
CREATE POLICY "System can create enrollments"
    ON enrollments FOR INSERT
    WITH CHECK (TRUE);  -- Controlled by Edge Function

-- Users can cancel their own enrollments
CREATE POLICY "Users can cancel own enrollments"
    ON enrollments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (status = 'cancelled');

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
    ON payments FOR SELECT
    USING (nlearn_is_admin());

-- System can create payments (via Webhook)
CREATE POLICY "System can create payments"
    ON payments FOR INSERT
    WITH CHECK (TRUE);

-- =====================================================
-- PROGRESS & LOGS POLICIES
-- =====================================================

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
    ON chapter_progress FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can manage own progress"
    ON chapter_progress FOR ALL
    USING (user_id = auth.uid());

-- Users can view their own learning logs
CREATE POLICY "Users can view own logs"
    ON learning_logs FOR SELECT
    USING (user_id = auth.uid());

-- Users can create learning logs
CREATE POLICY "Users can create logs"
    ON learning_logs FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
    ON learning_logs FOR SELECT
    USING (nlearn_is_admin());

-- Users can view their own stats
CREATE POLICY "Users can view own stats"
    ON learning_stats FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own stats
CREATE POLICY "Users can update own stats"
    ON learning_stats FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- QUIZ POLICIES
-- =====================================================

-- Users can view their own quiz attempts
CREATE POLICY "Users can view own attempts"
    ON quiz_attempts FOR SELECT
    USING (user_id = auth.uid());

-- Users can create quiz attempts
CREATE POLICY "Users can create attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (user_id = auth.uid() AND nlearn_is_enrolled(
        (SELECT course_id FROM chapters WHERE chapters.id = chapter_id)
    ));

-- Admins can view all attempts
CREATE POLICY "Admins can view all attempts"
    ON quiz_attempts FOR SELECT
    USING (nlearn_is_admin());

-- =====================================================
-- CERTIFICATION POLICIES
-- =====================================================

-- Users can view their own certifications
CREATE POLICY "Users can view own certifications"
    ON certifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can submit certification requests
CREATE POLICY "Users can submit certifications"
    ON certifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admins can view and update all certifications
CREATE POLICY "Admins can manage certifications"
    ON certifications FOR ALL
    USING (nlearn_is_admin());

-- =====================================================
-- NOTES & BOOKMARKS POLICIES
-- =====================================================

-- Users can manage their own notes
CREATE POLICY "Users can manage own notes"
    ON notes FOR ALL
    USING (user_id = auth.uid());

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks"
    ON bookmarks FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- NOTIFICATION POLICIES
-- =====================================================

-- Users can view their own notification settings
CREATE POLICY "Users can manage notification settings"
    ON notification_settings FOR ALL
    USING (user_id = auth.uid());

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can mark notifications as read
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE);

-- =====================================================
-- LINE CONNECTION POLICIES
-- =====================================================

-- Users can manage their own LINE connection
CREATE POLICY "Users can manage own LINE connection"
    ON line_connections FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- NEWSLETTER POLICIES
-- =====================================================

-- Admins can manage newsletters
CREATE POLICY "Admins can manage newsletters"
    ON newsletter_campaigns FOR ALL
    USING (nlearn_is_admin());

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- Note: Supabase service_role bypasses RLS automatically
-- Edge Functions use service_role for backend operations
