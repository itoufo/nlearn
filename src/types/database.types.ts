// =====================================================
// NLearn Platform - Database Types
// =====================================================
// Auto-generated types for Supabase
// Run `supabase gen types typescript` to regenerate
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'learner' | 'instructor' | 'admin'
export type CourseStatus = 'draft' | 'published' | 'archived'
export type EnrollmentStatus = 'active' | 'expired' | 'cancelled'
export type CertificationStatus = 'pending' | 'approved' | 'rejected'
export type NotificationType = 'reminder' | 'announcement' | 'completion' | 'approval' | 'system'
export type NotificationChannel = 'email' | 'line' | 'push'

export interface Database {
  nlearn: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          line_user_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          line_user_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          line_user_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          price: number
          currency: string
          stripe_price_id: string | null
          status: CourseStatus
          category: string | null
          tags: string[]
          estimated_hours: number | null
          instructor_id: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          price?: number
          currency?: string
          stripe_price_id?: string | null
          status?: CourseStatus
          category?: string | null
          tags?: string[]
          estimated_hours?: number | null
          instructor_id?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          price?: number
          currency?: string
          stripe_price_id?: string | null
          status?: CourseStatus
          category?: string | null
          tags?: string[]
          estimated_hours?: number | null
          instructor_id?: string | null
          order_index?: number
          updated_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          course_id: string
          title: string
          slug: string
          content_path: string
          description: string | null
          duration_minutes: number
          order_index: number
          is_preview: boolean
          quiz_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          slug: string
          content_path: string
          description?: string | null
          duration_minutes?: number
          order_index?: number
          is_preview?: boolean
          quiz_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          title?: string
          slug?: string
          content_path?: string
          description?: string | null
          duration_minutes?: number
          order_index?: number
          is_preview?: boolean
          quiz_id?: string | null
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: EnrollmentStatus
          enrolled_at: string
          expires_at: string | null
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          status?: EnrollmentStatus
          enrolled_at?: string
          expires_at?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          course_id?: string
          status?: EnrollmentStatus
          enrolled_at?: string
          expires_at?: string | null
          stripe_subscription_id?: string | null
        }
      }
      chapter_progress: {
        Row: {
          id: string
          user_id: string
          chapter_id: string
          completed: boolean
          completed_at: string | null
          time_spent_seconds: number
          last_accessed_at: string
          scroll_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chapter_id: string
          completed?: boolean
          completed_at?: string | null
          time_spent_seconds?: number
          last_accessed_at?: string
          scroll_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          time_spent_seconds?: number
          last_accessed_at?: string
          scroll_position?: number
          updated_at?: string
        }
      }
      learning_stats: {
        Row: {
          id: string
          user_id: string
          total_time_spent_seconds: number
          total_chapters_completed: number
          total_courses_completed: number
          current_streak_days: number
          longest_streak_days: number
          last_activity_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_time_spent_seconds?: number
          total_chapters_completed?: number
          total_courses_completed?: number
          current_streak_days?: number
          longest_streak_days?: number
          last_activity_date?: string | null
          updated_at?: string
        }
        Update: {
          total_time_spent_seconds?: number
          total_chapters_completed?: number
          total_courses_completed?: number
          current_streak_days?: number
          longest_streak_days?: number
          last_activity_date?: string | null
          updated_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          chapter_id: string
          quiz_id: string
          score: number
          passed: boolean
          answers: Json
          time_taken_seconds: number | null
          attempt_number: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chapter_id: string
          quiz_id: string
          score: number
          passed: boolean
          answers: Json
          time_taken_seconds?: number | null
          attempt_number?: number
          created_at?: string
        }
        Update: {
          score?: number
          passed?: boolean
          answers?: Json
          time_taken_seconds?: number | null
          attempt_number?: number
        }
      }
      certifications: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: CertificationStatus
          certificate_number: string | null
          certificate_url: string | null
          submitted_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          status?: CertificationStatus
          certificate_number?: string | null
          certificate_url?: string | null
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
        Update: {
          status?: CertificationStatus
          certificate_number?: string | null
          certificate_url?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          line_enabled: boolean
          push_enabled: boolean
          reminder_time: string
          reminder_days: number[]
          newsletter_subscribed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          line_enabled?: boolean
          push_enabled?: boolean
          reminder_time?: string
          reminder_days?: number[]
          newsletter_subscribed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          email_enabled?: boolean
          line_enabled?: boolean
          push_enabled?: boolean
          reminder_time?: string
          reminder_days?: number[]
          newsletter_subscribed?: boolean
          updated_at?: string
        }
      }
    }
    Functions: {
      nlearn_get_course_progress: {
        Args: { p_user_id: string; p_course_id: string }
        Returns: {
          total_chapters: number
          completed_chapters: number
          total_time_seconds: number
          completion_percentage: number
          quiz_passed: boolean
          certification_status: string | null
        }
      }
      nlearn_get_dashboard_data: {
        Args: { p_user_id: string }
        Returns: {
          enrollments_json: Json
          recent_activity_json: Json
          stats_json: Json
          notifications_json: Json
        }
      }
      nlearn_complete_chapter: {
        Args: { p_user_id: string; p_chapter_id: string; p_time_spent?: number }
        Returns: void
      }
      nlearn_submit_quiz: {
        Args: {
          p_user_id: string
          p_chapter_id: string
          p_quiz_id: string
          p_score: number
          p_answers: Json
          p_time_taken?: number
        }
        Returns: {
          passed: boolean
          attempt_number: number
          course_completed: boolean
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['nlearn']['Tables']['profiles']['Row']
export type Course = Database['nlearn']['Tables']['courses']['Row']
export type Chapter = Database['nlearn']['Tables']['chapters']['Row']
export type Enrollment = Database['nlearn']['Tables']['enrollments']['Row']
export type ChapterProgress = Database['nlearn']['Tables']['chapter_progress']['Row']
export type LearningStats = Database['nlearn']['Tables']['learning_stats']['Row']
export type QuizAttempt = Database['nlearn']['Tables']['quiz_attempts']['Row']
export type Certification = Database['nlearn']['Tables']['certifications']['Row']
export type NotificationSettings = Database['nlearn']['Tables']['notification_settings']['Row']
