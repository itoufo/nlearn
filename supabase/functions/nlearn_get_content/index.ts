// Secure Content Delivery Edge Function
// Serves course content only to authenticated/enrolled users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Content stored in KV or could be fetched from Storage
// For now, we'll serve from a protected storage bucket
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const courseSlug = url.searchParams.get('course')
    const chapterId = url.searchParams.get('chapter')

    if (!courseSlug || !chapterId) {
      return new Response(
        JSON.stringify({ error: 'Missing course or chapter parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')

    // Create client for auth check
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    })

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, is_free, slug')
      .eq('slug', courseSlug)
      .single()

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check access permissions
    let hasAccess = false

    // Free courses or preview content can be accessed
    if (course.is_free) {
      hasAccess = true
    } else if (authHeader) {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (user && !userError) {
        // Check enrollment
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .eq('status', 'active')
          .single()

        if (enrollment) {
          hasAccess = true
        }

        // Admin always has access
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin' || profile?.role === 'instructor') {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          message: 'このコンテンツを閲覧するにはコースへの登録が必要です'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch content from storage
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const contentPath = `${courseSlug}/${chapterId}.md`

    const { data: fileData, error: fileError } = await serviceClient
      .storage
      .from('nlearn_course_content')
      .download(contentPath)

    if (fileError) {
      console.error('Storage error:', fileError)
      return new Response(
        JSON.stringify({ error: 'Content not found', path: contentPath }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const content = await fileData.text()

    return new Response(
      JSON.stringify({ content, course: courseSlug, chapter: chapterId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Content delivery error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
