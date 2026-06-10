import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_SENDS_PER_WINDOW = 3
const RATE_WINDOW_MINUTES = 10

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
    const { identifier, channel } = await req.json()

    if (!identifier || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'identifier and channel are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['sms', 'email'].includes(channel)) {
      return new Response(JSON.stringify({ success: false, error: 'channel must be sms or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedIdentifier = identifier.trim().toLowerCase()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const twilioVerifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!

    if (!twilioAccountSid || !twilioAuthToken || !twilioVerifyServiceSid) {
      return new Response(JSON.stringify({ success: false, error: 'Twilio credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Opportunistic cleanup of expired records (fire-and-forget; rpc returns thenable, wrap for .catch)
    void Promise.resolve(supabase.rpc('cleanup_expired_verifications')).catch(() => {})

    // Check if identifier already belongs to a registered user
    const identifierType = channel === 'sms' ? 'phone' : 'email'
    if (identifierType === 'email') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedIdentifier)
        .maybeSingle()

      if (existingUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'An account with this email already exists. Please sign in instead.',
            code: 'IDENTIFIER_TAKEN',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', normalizedIdentifier)
        .maybeSingle()

      if (existingUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'An account with this phone number already exists. Please sign in instead.',
            code: 'IDENTIFIER_TAKEN',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Rate limiting: max 3 sends per identifier per 10-minute window
    const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString()

    const { data: rateRecord } = await supabase
      .from('otp_rate_limits')
      .select('send_count, window_start')
      .eq('identifier', normalizedIdentifier)
      .maybeSingle()

    if (rateRecord) {
      const windowStillActive = rateRecord.window_start > windowStart
      if (windowStillActive && rateRecord.send_count >= MAX_SENDS_PER_WINDOW) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Too many verification attempts. Please wait ${RATE_WINDOW_MINUTES} minutes before trying again.`,
            code: 'RATE_LIMITED',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (windowStillActive) {
        await supabase
          .from('otp_rate_limits')
          .update({ send_count: rateRecord.send_count + 1, updated_at: new Date().toISOString() })
          .eq('identifier', normalizedIdentifier)
      } else {
        await supabase
          .from('otp_rate_limits')
          .upsert({ identifier: normalizedIdentifier, send_count: 1, window_start: new Date().toISOString(), updated_at: new Date().toISOString() })
      }
    } else {
      await supabase
        .from('otp_rate_limits')
        .insert({ identifier: normalizedIdentifier, send_count: 1, window_start: new Date().toISOString(), updated_at: new Date().toISOString() })
    }

    // Send OTP via Twilio Verify
    const twilioUrl = `https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/Verifications`
    const twilioCredentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`)

    const formData = new URLSearchParams()
    formData.append('To', channel === 'sms' ? identifier : normalizedIdentifier)
    formData.append('Channel', channel)

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
      const twilioCode = twilioData.code
      const twilioMsg = twilioData.message || 'Failed to send verification code'
      if (twilioCode === 60223) {
        const otherChannel = channel === 'sms' ? 'email' : 'SMS'
        return new Response(
          JSON.stringify({
            success: false,
            error: `This verification channel is disabled in your Twilio Verify service. Enable it in Twilio Console (Verify > Services > your service), or try ${otherChannel} verification instead.`,
            code: 'CHANNEL_DISABLED',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const isFraudBlocked = twilioCode === 60605 || twilioCode === 60410
      return new Response(
        JSON.stringify({
          success: false,
          error: isFraudBlocked
            ? 'SMS verification is not available for this number. Try email verification instead.'
            : twilioMsg,
          code: isFraudBlocked ? 'SMS_BLOCKED' : 'TWILIO_ERROR',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
