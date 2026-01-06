// =====================================================
// NLearn Platform - Shared Supabase Client
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin client (bypasses RLS)
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'nlearn' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create client with user context (respects RLS)
export function createUserClient(authHeader: string) {
  return createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      db: { schema: 'nlearn' },
      global: {
        headers: { Authorization: authHeader }
      }
    }
  )
}

// Standard CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Standard JSON response
export function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Error response
export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status)
}
