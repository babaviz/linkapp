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
    const { verificationToken } = await req.json()

    if (!verificationToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'verificationToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Look up the token
    const { data: record, error: lookupError } = await supabase
      .from('phone_verifications')
      .select('id, identifier, identifier_type, expires_at, used_at')
      .eq('verification_token', verificationToken)
      .maybeSingle()

    if (lookupError || !record) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Verification token is invalid. Please complete OTP verification again.',
          code: 'TOKEN_NOT_FOUND',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (record.used_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This verification token has already been used.',
          code: 'TOKEN_USED',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Verification token has expired. Please complete OTP verification again.',
          code: 'TOKEN_EXPIRED',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as used atomically — guard against race conditions
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ used_at: new Date().toISOString() })
      .eq('id', record.id)
      .is('used_at', null)

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to consume verification token. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        identifier: record.identifier,
        identifierType: record.identifier_type,
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
