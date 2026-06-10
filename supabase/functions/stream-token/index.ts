import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

type StreamTokenRequest = {
  userId?: string;
  product?: 'chat' | 'video';
};

function sanitizeSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // People often paste secrets with wrapping quotes into dashboards/CLI.
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed;

  return unquoted ? unquoted : null;
}

function normalizeProduct(value: unknown): 'chat' | 'video' {
  return value === 'video' ? 'video' : 'chat';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Performance: cache imported HMAC keys across invocations.
// Edge Function isolates are reused, so module-scope caches can eliminate per-request importKey overhead.
const textEncoder = new TextEncoder();
const hmacKeyCache = new Map<string, CryptoKey>();
const hmacKeyPromiseCache = new Map<string, Promise<CryptoKey>>();

async function getHmacSigningKey(secret: string): Promise<CryptoKey> {
  const cached = hmacKeyCache.get(secret);
  if (cached) return cached;

  const inflight = hmacKeyPromiseCache.get(secret);
  if (inflight) return await inflight;

  const promise = crypto.subtle
    .importKey(
      'raw',
      textEncoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    .then((key) => {
      hmacKeyCache.set(secret, key);
      return key;
    })
    .finally(() => {
      hmacKeyPromiseCache.delete(secret);
    });

  hmacKeyPromiseCache.set(secret, promise);
  return await promise;
}

async function generateStreamToken(userId: string, secret: string): Promise<string> {
  const key = await getHmacSigningKey(secret);

  // Stream tokens are standard HS256 JWTs with `user_id` in the payload.
  // Important: Backdate `iat` significantly to tolerate clock skew between Edge Functions,
  // device clocks, and Stream's servers. Stream can reject tokens with:
  // "JWTAuth error: token used before issue at (iat)" if clocks are out of sync.
  // Using 5 minutes (300 seconds) backdate to handle most clock drift scenarios.
  const iatSeconds = Math.floor(Date.now() / 1000) - 300;
  // 24 hours expiry from the actual current time (not the backdated iat)
  const expSeconds = Math.floor(Date.now() / 1000) + (60 * 60 * 24);
  
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      user_id: userId,
      iat: iatSeconds,
      exp: expSeconds,
    },
    key,
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      // Edge Functions don't need session persistence; keep it stateless.
      auth: { persistSession: false },
    });

    // Explicitly validate the caller JWT (most reliable in Edge Functions).
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Body is optional; we issue tokens only for the authenticated user.
    let body: StreamTokenRequest = {};
    try {
      body = (await req.json()) as StreamTokenRequest;
    } catch (_e) {
      void _e;
    }

    const product = normalizeProduct(body.product);

    const apiKey =
      product === 'video'
        ? sanitizeSecret(Deno.env.get('STREAM_VIDEO_API_KEY')) || sanitizeSecret(Deno.env.get('STREAM_API_KEY'))
        : sanitizeSecret(Deno.env.get('STREAM_CHAT_API_KEY')) || sanitizeSecret(Deno.env.get('STREAM_API_KEY'));

    const secret =
      product === 'video'
        ? sanitizeSecret(Deno.env.get('STREAM_VIDEO_API_SECRET')) || sanitizeSecret(Deno.env.get('STREAM_API_SECRET'))
        : sanitizeSecret(Deno.env.get('STREAM_CHAT_API_SECRET')) || sanitizeSecret(Deno.env.get('STREAM_API_SECRET'));

    if (!secret) {
      const message =
        product === 'video'
          ? 'Stream video token service not configured'
          : 'Stream chat token service not configured';
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const requestedUserId = (body.userId || '').trim();
    const authedUserId = authData.user.id;

    // If a userId was provided, it must match the authenticated user.
    if (requestedUserId && requestedUserId !== authedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const token = await generateStreamToken(authedUserId, secret);

    return new Response(
      JSON.stringify({
        token,
        ...(apiKey ? { apiKey } : {}),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

