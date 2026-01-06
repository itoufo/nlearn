-- =====================================================
-- NLearn Platform - Helper Functions
-- =====================================================
-- SQL functions for Edge Functions and RPC calls
-- Created: 2026-01-06
-- Naming: nlearn_ prefix
-- =====================================================

SET search_path TO nlearn, public;

-- =====================================================
-- GET REMINDER USERS
-- Returns users who need learning reminders
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_get_reminder_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    line_user_id TEXT,
    email_enabled BOOLEAN,
    line_enabled BOOLEAN,
    days_inactive INTEGER,
    next_chapter_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.email,
        p.full_name,
        lc.line_user_id,
        ns.email_enabled,
        ns.line_enabled,
        COALESCE(
            EXTRACT(DAY FROM (NOW() - ls.last_activity_date::timestamp))::INTEGER,
            999
        ) AS days_inactive,
        (
            SELECT c.title
            FROM nlearn.chapters c
            LEFT JOIN nlearn.chapter_progress cp ON cp.chapter_id = c.id AND cp.user_id = p.id
            WHERE cp.completed IS NULL OR cp.completed = FALSE
            ORDER BY c.order_index
            LIMIT 1
        ) AS next_chapter_title
    FROM nlearn.profiles p
    JOIN nlearn.notification_settings ns ON ns.user_id = p.id
    LEFT JOIN nlearn.learning_stats ls ON ls.user_id = p.id
    LEFT JOIN nlearn.line_connections lc ON lc.user_id = p.id
    WHERE
        -- Has notification enabled
        (ns.email_enabled OR ns.line_enabled)
        -- Matches reminder days (1, 3, 7 days inactive by default)
        AND (
            EXTRACT(DAY FROM (NOW() - COALESCE(ls.last_activity_date::timestamp, '1970-01-01')))::INTEGER
            = ANY(ns.reminder_days)
        )
        -- Has active enrollment
        AND EXISTS (
            SELECT 1 FROM nlearn.enrollments e
            WHERE e.user_id = p.id
            AND e.status = 'active'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET NEXT CHAPTER
-- Returns the next incomplete chapter for a user
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_get_next_chapter(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    course_id UUID,
    order_index INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.slug,
        c.course_id,
        c.order_index
    FROM nlearn.chapters c
    JOIN nlearn.enrollments e ON e.course_id = c.course_id AND e.user_id = p_user_id
    LEFT JOIN nlearn.chapter_progress cp ON cp.chapter_id = c.id AND cp.user_id = p_user_id
    WHERE
        e.status = 'active'
        AND (cp.completed IS NULL OR cp.completed = FALSE)
    ORDER BY c.order_index
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET COURSE PROGRESS
-- Returns detailed progress for a course
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_get_course_progress(
    p_user_id UUID,
    p_course_id UUID
)
RETURNS TABLE (
    total_chapters INTEGER,
    completed_chapters INTEGER,
    total_time_seconds INTEGER,
    completion_percentage NUMERIC,
    quiz_passed BOOLEAN,
    certification_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM nlearn.chapters WHERE course_id = p_course_id) AS total_chapters,
        (
            SELECT COUNT(*)::INTEGER
            FROM nlearn.chapter_progress cp
            JOIN nlearn.chapters c ON c.id = cp.chapter_id
            WHERE c.course_id = p_course_id
            AND cp.user_id = p_user_id
            AND cp.completed = TRUE
        ) AS completed_chapters,
        (
            SELECT COALESCE(SUM(cp.time_spent_seconds), 0)::INTEGER
            FROM nlearn.chapter_progress cp
            JOIN nlearn.chapters c ON c.id = cp.chapter_id
            WHERE c.course_id = p_course_id
            AND cp.user_id = p_user_id
        ) AS total_time_seconds,
        (
            SELECT ROUND(
                COUNT(*) FILTER (WHERE cp.completed) * 100.0 /
                NULLIF(COUNT(*), 0),
                2
            )
            FROM nlearn.chapters c
            LEFT JOIN nlearn.chapter_progress cp ON cp.chapter_id = c.id AND cp.user_id = p_user_id
            WHERE c.course_id = p_course_id
        ) AS completion_percentage,
        (
            SELECT EXISTS (
                SELECT 1 FROM nlearn.quiz_attempts qa
                JOIN nlearn.chapters c ON c.id = qa.chapter_id
                WHERE c.course_id = p_course_id
                AND qa.user_id = p_user_id
                AND qa.passed = TRUE
            )
        ) AS quiz_passed,
        (
            SELECT cert.status::TEXT
            FROM nlearn.certifications cert
            WHERE cert.course_id = p_course_id
            AND cert.user_id = p_user_id
        ) AS certification_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE LEARNING STREAK
-- Called after learning activity to update streaks
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_update_learning_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    SELECT last_activity_date, current_streak_days, longest_streak_days
    INTO v_last_date, v_current_streak, v_longest_streak
    FROM nlearn.learning_stats
    WHERE user_id = p_user_id;

    -- First activity
    IF v_last_date IS NULL THEN
        UPDATE nlearn.learning_stats
        SET
            last_activity_date = CURRENT_DATE,
            current_streak_days = 1,
            longest_streak_days = 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN;
    END IF;

    -- Same day - no update needed
    IF v_last_date = CURRENT_DATE THEN
        RETURN;
    END IF;

    -- Consecutive day
    IF v_last_date = CURRENT_DATE - 1 THEN
        v_current_streak := v_current_streak + 1;
        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;
    ELSE
        -- Streak broken
        v_current_streak := 1;
    END IF;

    UPDATE nlearn.learning_stats
    SET
        last_activity_date = CURRENT_DATE,
        current_streak_days = v_current_streak,
        longest_streak_days = v_longest_streak,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETE CHAPTER
-- Marks a chapter as complete and updates stats
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_complete_chapter(
    p_user_id UUID,
    p_chapter_id UUID,
    p_time_spent INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    -- Upsert chapter progress
    INSERT INTO nlearn.chapter_progress (user_id, chapter_id, completed, completed_at, time_spent_seconds)
    VALUES (p_user_id, p_chapter_id, TRUE, NOW(), p_time_spent)
    ON CONFLICT (user_id, chapter_id) DO UPDATE
    SET
        completed = TRUE,
        completed_at = NOW(),
        time_spent_seconds = chapter_progress.time_spent_seconds + p_time_spent,
        updated_at = NOW();

    -- Update learning stats
    UPDATE nlearn.learning_stats
    SET
        total_chapters_completed = (
            SELECT COUNT(*) FROM nlearn.chapter_progress
            WHERE user_id = p_user_id AND completed = TRUE
        ),
        total_time_spent_seconds = total_time_spent_seconds + p_time_spent
    WHERE user_id = p_user_id;

    -- Update streak
    PERFORM nlearn_update_learning_streak(p_user_id);

    -- Log the event
    INSERT INTO nlearn.learning_logs (user_id, chapter_id, action, metadata)
    VALUES (p_user_id, p_chapter_id, 'complete', jsonb_build_object('time_spent', p_time_spent));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SUBMIT QUIZ
-- Records quiz attempt and checks for course completion
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_submit_quiz(
    p_user_id UUID,
    p_chapter_id UUID,
    p_quiz_id TEXT,
    p_score INTEGER,
    p_answers JSONB,
    p_time_taken INTEGER DEFAULT NULL
)
RETURNS TABLE (
    passed BOOLEAN,
    attempt_number INTEGER,
    course_completed BOOLEAN
) AS $$
DECLARE
    v_passed BOOLEAN;
    v_attempt_num INTEGER;
    v_course_id UUID;
    v_course_completed BOOLEAN := FALSE;
BEGIN
    -- Calculate pass/fail (80% threshold)
    v_passed := p_score >= 80;

    -- Get attempt number
    SELECT COALESCE(MAX(qa.attempt_number), 0) + 1
    INTO v_attempt_num
    FROM nlearn.quiz_attempts qa
    WHERE qa.user_id = p_user_id AND qa.chapter_id = p_chapter_id;

    -- Insert quiz attempt
    INSERT INTO nlearn.quiz_attempts (user_id, chapter_id, quiz_id, score, passed, answers, time_taken_seconds, attempt_number)
    VALUES (p_user_id, p_chapter_id, p_quiz_id, p_score, v_passed, p_answers, p_time_taken, v_attempt_num);

    -- Log the event
    INSERT INTO nlearn.learning_logs (user_id, chapter_id, action, metadata)
    VALUES (p_user_id, p_chapter_id, 'quiz_end', jsonb_build_object(
        'score', p_score,
        'passed', v_passed,
        'attempt', v_attempt_num
    ));

    -- Check if course is completed
    IF v_passed THEN
        SELECT c.course_id INTO v_course_id
        FROM nlearn.chapters c WHERE c.id = p_chapter_id;

        -- Check all chapters completed and all quizzes passed
        SELECT
            NOT EXISTS (
                SELECT 1 FROM nlearn.chapters ch
                LEFT JOIN nlearn.chapter_progress cp ON cp.chapter_id = ch.id AND cp.user_id = p_user_id
                WHERE ch.course_id = v_course_id
                AND (cp.completed IS NULL OR cp.completed = FALSE)
            )
            AND NOT EXISTS (
                SELECT 1 FROM nlearn.chapters ch
                WHERE ch.course_id = v_course_id
                AND ch.quiz_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM nlearn.quiz_attempts qa
                    WHERE qa.chapter_id = ch.id
                    AND qa.user_id = p_user_id
                    AND qa.passed = TRUE
                )
            )
        INTO v_course_completed;

        -- Update course completion if applicable
        IF v_course_completed THEN
            UPDATE nlearn.learning_stats
            SET total_courses_completed = total_courses_completed + 1
            WHERE user_id = p_user_id;
        END IF;
    END IF;

    RETURN QUERY SELECT v_passed, v_attempt_num, v_course_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET USER DASHBOARD DATA
-- Returns all dashboard data in one call
-- =====================================================
CREATE OR REPLACE FUNCTION nlearn_get_dashboard_data(p_user_id UUID)
RETURNS TABLE (
    enrollments_json JSONB,
    recent_activity_json JSONB,
    stats_json JSONB,
    notifications_json JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Enrolled courses with progress
        (
            SELECT jsonb_agg(row_to_json(e))
            FROM (
                SELECT
                    c.id,
                    c.title,
                    c.slug,
                    c.thumbnail_url,
                    e.enrolled_at,
                    (SELECT * FROM nlearn_get_course_progress(p_user_id, c.id)) AS progress
                FROM nlearn.enrollments e
                JOIN nlearn.courses c ON c.id = e.course_id
                WHERE e.user_id = p_user_id AND e.status = 'active'
                ORDER BY e.enrolled_at DESC
            ) e
        ) AS enrollments_json,

        -- Recent learning activity
        (
            SELECT jsonb_agg(row_to_json(l))
            FROM (
                SELECT
                    ll.action,
                    ll.created_at,
                    c.title AS chapter_title,
                    c.slug AS chapter_slug
                FROM nlearn.learning_logs ll
                JOIN nlearn.chapters c ON c.id = ll.chapter_id
                WHERE ll.user_id = p_user_id
                ORDER BY ll.created_at DESC
                LIMIT 10
            ) l
        ) AS recent_activity_json,

        -- Learning stats
        (
            SELECT row_to_json(s)
            FROM nlearn.learning_stats s
            WHERE s.user_id = p_user_id
        ) AS stats_json,

        -- Unread notifications
        (
            SELECT jsonb_agg(row_to_json(n))
            FROM (
                SELECT id, type, title, body, sent_at
                FROM nlearn.notifications
                WHERE user_id = p_user_id AND read_at IS NULL
                ORDER BY sent_at DESC
                LIMIT 5
            ) n
        ) AS notifications_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
