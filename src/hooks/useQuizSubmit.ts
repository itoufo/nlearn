import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface QuizAnswer {
  questionId: string
  selectedOption: number
  isCorrect: boolean
}

interface QuizResult {
  passed: boolean
  score: number
  attemptNumber: number
  courseCompleted: boolean
}

interface UseQuizSubmitReturn {
  submitting: boolean
  lastResult: QuizResult | null
  submitQuiz: (
    chapterId: string,
    quizId: string,
    answers: QuizAnswer[],
    timeTaken?: number
  ) => Promise<QuizResult>
  getAttemptCount: (chapterId: string) => Promise<number>
}

export function useQuizSubmit(): UseQuizSubmitReturn {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<QuizResult | null>(null)

  const submitQuiz = useCallback(async (
    chapterId: string,
    quizId: string,
    answers: QuizAnswer[],
    timeTaken = 0
  ): Promise<QuizResult> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    setSubmitting(true)

    try {
      const correctCount = answers.filter(a => a.isCorrect).length
      const score = (correctCount / answers.length) * 100
      const passed = score >= 70 // 70% passing threshold

      if (!isSupabaseConfigured()) {
        // Demo mode - save to localStorage
        const key = `nlearn_quiz_${chapterId}_${quizId}`
        const existing = localStorage.getItem(key)
        const attempts = existing ? JSON.parse(existing) : []
        const attemptNumber = attempts.length + 1

        const result: QuizResult = {
          passed,
          score,
          attemptNumber,
          courseCompleted: false
        }

        attempts.push({
          ...result,
          answers,
          timeTaken,
          submittedAt: new Date().toISOString()
        })

        localStorage.setItem(key, JSON.stringify(attempts))
        setLastResult(result)
        return result
      }

      // Submit to Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('nlearn_submit_quiz', {
        p_user_id: user.id,
        p_chapter_id: chapterId,
        p_quiz_id: quizId,
        p_score: score,
        p_answers: answers,
        p_time_taken: timeTaken
      })

      if (error) throw error

      const result: QuizResult = {
        passed: data.passed,
        score,
        attemptNumber: data.attempt_number,
        courseCompleted: data.course_completed
      }

      setLastResult(result)
      return result

    } catch (error) {
      console.error('Error submitting quiz:', error)
      throw error
    } finally {
      setSubmitting(false)
    }
  }, [user])

  const getAttemptCount = useCallback(async (chapterId: string): Promise<number> => {
    if (!user) return 0

    if (!isSupabaseConfigured()) {
      // Demo mode
      const keys = Object.keys(localStorage).filter(k => k.startsWith(`nlearn_quiz_${chapterId}`))
      let total = 0
      keys.forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          total += JSON.parse(data).length
        }
      })
      return total
    }

    try {
      const { count } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)

      return count || 0
    } catch (error) {
      console.error('Error getting attempt count:', error)
      return 0
    }
  }, [user])

  return {
    submitting,
    lastResult,
    submitQuiz,
    getAttemptCount
  }
}
