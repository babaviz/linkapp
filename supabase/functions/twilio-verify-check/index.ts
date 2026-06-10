import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { identifier, code, channel } = await req.json()

    if (!identifier || !code || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'identifier, code, and channel are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedIdentifier = identifier.trim().toLowerCase()
    const normalizedCode = code.trim()

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const twilioVerifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!twilioAccountSid || !twilioAuthToken || !twilioVerifyServiceSid) {
      return new Response(JSON.stringify({ success: false, error: 'Twilio credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify code with Twilio
    const twilioUrl = `https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/VerificationChecks`
    const twilioCredentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`)

    const formData = new URLSearchParams()
    formData.append('To', channel === 'sms' ? identifier : normalizedIdentifier)
    formData.append('Code', normalizedCode)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      const errorMsg = twilioData.message || 'Failed to verify code'
      const isExpired = errorMsg.toLowerCase().includes('expired') || twilioData.code === 60203
      const isMaxAttempts = twilioData.code === 60202

      return new Response(
        JSON.stringify({
          success: false,
          error: isExpired
            ? 'Verification code has expired. Please request a new one.'
            : isMaxAttempts
            ? 'Too many incorrect attempts. Please request a new code.'
            : errorMsg,
          code: isExpired ? 'CODE_EXPIRED' : isMaxAttempts ? 'MAX_ATTEMPTS' : 'TWILIO_ERROR',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (twilioData.status !== 'approved') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Incorrect verification code. Please try again.',
          code: 'INVALID_CODE',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // OTP approved — store verification token in DB (15-min expiry)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const identifierType = channel === 'sms' ? 'phone' : 'email'
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { data: verificationRecord, error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        identifier: normalizedIdentifier,
        identifier_type: identifierType,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select('verification_token')
      .single()

    if (insertError || !verificationRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store verification. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationToken: verificationRecord.verification_token,
        identifierType,
        message: 'Verification successful',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
