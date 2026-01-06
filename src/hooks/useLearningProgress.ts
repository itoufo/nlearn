import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChapterProgress {
  chapterId: string
  completed: boolean
  completedAt: string | null
  timeSpentSeconds: number
  scrollPosition: number
}

interface CourseProgress {
  courseId: string
  totalChapters: number
  completedChapters: number
  completionPercentage: number
  lastAccessedChapter: string | null
}

interface UseLearningProgressReturn {
  chapterProgress: Map<string, ChapterProgress>
  courseProgress: CourseProgress | null
  loading: boolean
  markChapterComplete: (chapterId: string, timeSpent?: number) => Promise<void>
  updateScrollPosition: (chapterId: string, position: number) => Promise<void>
  trackTimeSpent: (chapterId: string, seconds: number) => Promise<void>
  getChapterProgress: (chapterId: string) => ChapterProgress | null
}

export function useLearningProgress(courseSlug: string): UseLearningProgressReturn {
  const { user } = useAuth()
  const [chapterProgress, setChapterProgress] = useState<Map<string, ChapterProgress>>(new Map())
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch progress data
  useEffect(() => {
    if (!user || !courseSlug) {
      setLoading(false)
      return
    }

    const fetchProgress = async () => {
      if (!isSupabaseConfigured()) {
        // Demo mode - load from localStorage
        const savedProgress = localStorage.getItem(`nlearn_progress_${courseSlug}`)
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress)
          setChapterProgress(new Map(Object.entries(parsed.chapters || {})))
          setCourseProgress(parsed.course || null)
        }
        setLoading(false)
        return
      }

      try {
        // Get course ID
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('slug', courseSlug)
          .single() as { data: { id: string } | null }

        if (!course) {
          setLoading(false)
          return
        }

        const currentCourseId = course.id

        // Get chapter progress
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id')
          .eq('course_id', currentCourseId) as { data: { id: string }[] | null }

        if (chapters) {
          const { data: progressData } = await supabase
            .from('chapter_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('chapter_id', chapters.map(c => c.id)) as { data: Array<{
              chapter_id: string
              completed: boolean
              completed_at: string | null
              time_spent_seconds: number
              scroll_position: number
            }> | null }

          if (progressData) {
            const progressMap = new Map<string, ChapterProgress>()
            progressData.forEach(p => {
              progressMap.set(p.chapter_id, {
                chapterId: p.chapter_id,
                completed: p.completed,
                completedAt: p.completed_at,
                timeSpentSeconds: p.time_spent_seconds,
                scrollPosition: p.scroll_position
              })
            })
            setChapterProgress(progressMap)
          }

          // Calculate course progress
          const completedCount = progressData?.filter(p => p.completed).length || 0
          setCourseProgress({
            courseId: currentCourseId,
            totalChapters: chapters.length,
            completedChapters: completedCount,
            completionPercentage: chapters.length > 0 ? (completedCount / chapters.length) * 100 : 0,
            lastAccessedChapter: null
          })
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [user, courseSlug])

  // Mark chapter as complete
  const markChapterComplete = useCallback(async (chapterId: string, timeSpent = 0) => {
    if (!user) return

    const now = new Date().toISOString()

    if (!isSupabaseConfigured()) {
      // Demo mode - save to localStorage
      setChapterProgress(prev => {
        const updated = new Map(prev)
        updated.set(chapterId, {
          chapterId,
          completed: true,
          completedAt: now,
          timeSpentSeconds: (prev.get(chapterId)?.timeSpentSeconds || 0) + timeSpent,
          scrollPosition: 100
        })

        // Save to localStorage
        const progressObj: Record<string, ChapterProgress> = {}
        updated.forEach((v, k) => { progressObj[k] = v })
        localStorage.setItem(`nlearn_progress_${courseSlug}`, JSON.stringify({
          chapters: progressObj,
          course: courseProgress
        }))

        return updated
      })
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('nlearn_complete_chapter', {
        p_user_id: user.id,
        p_chapter_id: chapterId,
        p_time_spent: timeSpent
      })

      setChapterProgress(prev => {
        const updated = new Map(prev)
        updated.set(chapterId, {
          chapterId,
          completed: true,
          completedAt: now,
          timeSpentSeconds: (prev.get(chapterId)?.timeSpentSeconds || 0) + timeSpent,
          scrollPosition: 100
        })
        return updated
      })

      // Update course progress
      setCourseProgress(prev => {
        if (!prev) return prev
        const completedCount = prev.completedChapters + 1
        return {
          ...prev,
          completedChapters: completedCount,
          completionPercentage: (completedCount / prev.totalChapters) * 100
        }
      })
    } catch (error) {
      console.error('Error marking chapter complete:', error)
    }
  }, [user, courseSlug, courseProgress])

  // Update scroll position
  const updateScrollPosition = useCallback(async (chapterId: string, position: number) => {
    if (!user || !isSupabaseConfigured()) return

    try {
      const existing = chapterProgress.get(chapterId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chapter_progress')
        .upsert({
          user_id: user.id,
          chapter_id: chapterId,
          scroll_position: position,
          last_accessed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,chapter_id'
        })

      setChapterProgress(prev => {
        const updated = new Map(prev)
        updated.set(chapterId, {
          ...existing,
          chapterId,
          completed: existing?.completed || false,
          completedAt: existing?.completedAt || null,
          timeSpentSeconds: existing?.timeSpentSeconds || 0,
          scrollPosition: position
        })
        return updated
      })
    } catch (error) {
      console.error('Error updating scroll position:', error)
    }
  }, [user, chapterProgress])

  // Track time spent
  const trackTimeSpent = useCallback(async (chapterId: string, seconds: number) => {
    if (!user) return

    if (!isSupabaseConfigured()) {
      setChapterProgress(prev => {
        const updated = new Map(prev)
        const existing = prev.get(chapterId)
        updated.set(chapterId, {
          chapterId,
          completed: existing?.completed || false,
          completedAt: existing?.completedAt || null,
          timeSpentSeconds: (existing?.timeSpentSeconds || 0) + seconds,
          scrollPosition: existing?.scrollPosition || 0
        })
        return updated
      })
      return
    }

    try {
      const existing = chapterProgress.get(chapterId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('chapter_progress')
        .upsert({
          user_id: user.id,
          chapter_id: chapterId,
          time_spent_seconds: (existing?.timeSpentSeconds || 0) + seconds,
          last_accessed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,chapter_id'
        })

      setChapterProgress(prev => {
        const updated = new Map(prev)
        updated.set(chapterId, {
          ...existing,
          chapterId,
          completed: existing?.completed || false,
          completedAt: existing?.completedAt || null,
          timeSpentSeconds: (existing?.timeSpentSeconds || 0) + seconds,
          scrollPosition: existing?.scrollPosition || 0
        })
        return updated
      })
    } catch (error) {
      console.error('Error tracking time:', error)
    }
  }, [user, chapterProgress])

  // Get chapter progress
  const getChapterProgress = useCallback((chapterId: string): ChapterProgress | null => {
    return chapterProgress.get(chapterId) || null
  }, [chapterProgress])

  return {
    chapterProgress,
    courseProgress,
    loading,
    markChapterComplete,
    updateScrollPosition,
    trackTimeSpent,
    getChapterProgress
  }
}
