// Secure Content Service
// Fetches course content through Edge Function or local files for demo mode

import { supabase, isSupabaseConfigured } from './supabase'

interface ContentResponse {
  content: string
  course: string
  chapter: string
}

interface ContentError {
  error: string
  message?: string
}

// Map of chapter IDs to local file paths for demo mode
const LOCAL_CONTENT_MAP: Record<string, string> = {
  // Overview
  'curriculum-overview': '/content/ai-basics/00_カリキュラム概要.md',
  // Stage 1: Introduction
  'ai-literacy': '/content/ai-basics/01_入門/01_AIリテラシー入門.md',
  'generative-ai': '/content/ai-basics/01_入門/02_生成AIの仕組み.md',
  'ai-ethics': '/content/ai-basics/01_入門/03_AI倫理と安全性.md',
  'prompt-basics': '/content/ai-basics/01_入門/04_プロンプト基礎.md',
  'ai-practice': '/content/ai-basics/01_入門/05_AI活用演習.md',
  // Stage 2: Applied
  'cot': '/content/ai-basics/02_応用/01_Chain-of-Thought手法.md',
  'info-organization': '/content/ai-basics/02_応用/02_情報整理と論理的表現.md',
  'project-management': '/content/ai-basics/02_応用/03_プロジェクト管理とAI.md',
  'automation': '/content/ai-basics/02_応用/04_業務自動化ツール.md',
  'business-problem': '/content/ai-basics/02_応用/05_ビジネス課題解決.md',
  // Stage 3: Advanced
  'paic': '/content/ai-basics/03_発展/01_P-A-I-Cサイクル.md',
  'pbl': '/content/ai-basics/03_発展/02_PBLプロジェクト設計.md',
  'portfolio': '/content/ai-basics/03_発展/03_ポートフォリオ作成.md',
  'ethics-week': '/content/ai-basics/03_発展/04_AI倫理週間.md',
  'self-coaching': '/content/ai-basics/03_発展/05_セルフコーチング.md',
  // Assessment
  'evaluation': '/content/ai-basics/assessment/評価基準.md',
  'worksheets': '/content/ai-basics/worksheets/演習問題集.md',
}

export async function fetchSecureContent(
  courseSlug: string,
  chapterId: string
): Promise<{ content: string | null; error: string | null }> {
  // Demo mode: fetch from local files
  if (!isSupabaseConfigured()) {
    return fetchLocalContent(chapterId)
  }

  try {
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nlearn_get_content?course=${encodeURIComponent(courseSlug)}&chapter=${encodeURIComponent(chapterId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    )

    if (!response.ok) {
      const errorData: ContentError = await response.json()
      return {
        content: null,
        error: errorData.message || errorData.error || 'Failed to fetch content'
      }
    }

    const data: ContentResponse = await response.json()
    return { content: data.content, error: null }

  } catch (error) {
    console.error('Content fetch error:', error)
    // Fallback to local content in case of network error
    return fetchLocalContent(chapterId)
  }
}

async function fetchLocalContent(
  chapterId: string
): Promise<{ content: string | null; error: string | null }> {
  const localPath = LOCAL_CONTENT_MAP[chapterId]

  if (!localPath) {
    return { content: null, error: 'Chapter not found' }
  }

  try {
    const response = await fetch(localPath)
    if (!response.ok) {
      return { content: null, error: `Failed to load: ${response.status}` }
    }
    const content = await response.text()
    return { content, error: null }
  } catch (error) {
    return { content: null, error: 'Failed to load content' }
  }
}

// Check if user has access to a course
export async function checkCourseAccess(courseSlug: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true // Demo mode allows all access
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Check if course is free
    const { data: course } = await (supabase as any)
      .from('courses')
      .select('id, is_free')
      .eq('slug', courseSlug)
      .single() as { data: { id: string; is_free: boolean } | null }

    if (!course) return false
    if (course.is_free) return true

    // Check enrollment
    const { data: enrollment } = await (supabase as any)
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('status', 'active')
      .single() as { data: { id: string } | null }

    return !!enrollment
  } catch {
    return false
  }
}
