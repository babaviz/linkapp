import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorResponse = {
  success: false
  error: string
  code: string
}

type SuccessResponse = {
  success: true
  email: string
}

function jsonResponse(body: ErrorResponse | SuccessResponse, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(
        { success: false, error: 'Not authenticated', code: 'NOT_AUTHENTICATED' },
        401
      )
    }

    const payload = await req.json().catch(() => ({}))
    const emailRaw = typeof payload?.email === 'string' ? payload.email : ''
    const email = emailRaw.trim().toLowerCase()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return jsonResponse(
        { success: false, error: 'Invalid email address', code: 'INVALID_EMAIL' },
        400
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(
        { success: false, error: 'Server not configured', code: 'NOT_CONFIGURED' },
        500
      )
    }

    // Client bound to the caller's JWT for identity verification
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: authData, error: authError } = await authClient.auth.getUser()
    const user = authData?.user
    if (authError || !user) {
      return jsonResponse(
        { success: false, error: 'Not authenticated', code: 'NOT_AUTHENTICATED' },
        401
      )
    }

    if (!user.phone_confirmed_at) {
      return jsonResponse(
        { success: false, error: 'Phone not verified', code: 'PHONE_NOT_VERIFIED' },
        403
      )
    }

    const existingEmail = (user.email || '').trim().toLowerCase()
    if (existingEmail && existingEmail !== email) {
      return jsonResponse(
        { success: false, error: 'Email already set for this account', code: 'EMAIL_ALREADY_SET' },
        409
      )
    }

    if (existingEmail === email) {
      return jsonResponse({ success: true, email }, 200)
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    })

    if (updateError) {
      const msg = updateError.message || 'Failed to set email'
      const lower = msg.toLowerCase()

      const isEmailTaken =
        lower.includes('already registered') ||
        lower.includes('already exists') ||
        lower.includes('duplicate') ||
        lower.includes('unique constraint') ||
        lower.includes('email has already been taken')

      if (isEmailTaken) {
        return jsonResponse(
          { success: false, error: 'Email already in use', code: 'EMAIL_TAKEN' },
          409
        )
      }

      return jsonResponse({ success: false, error: msg, code: 'UPDATE_FAILED' }, 500)
    }

    return jsonResponse({ success: true, email }, 200)
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error', code: 'INTERNAL_ERROR' },
      500
    )
  }
})

