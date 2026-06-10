import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';

type StreamUsersRequest = {
  userIds?: string[];
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

function normalizeUserIds(userIds: unknown): string[] {
  if (!Array.isArray(userIds)) return [];
  const cleaned = userIds
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean);

  // De-dupe + cap (protect function abuse)
  return Array.from(new Set(cleaned)).slice(0, 25);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Performance: cache imported HMAC keys and short-lived server JWTs across invocations.
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

let cachedServerJwt:
  | {
      secret: string;
      token: string;
      expSeconds: number;
    }
  | null = null;
let cachedServerJwtPromise: Promise<string> | null = null;
const SERVER_JWT_SAFETY_WINDOW_SECONDS = 60; // refresh if expiring within 1 minute

async function createServerAuthToken(secret: string): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cachedServerJwt && cachedServerJwt.secret === secret) {
    if (cachedServerJwt.expSeconds > nowSeconds + SERVER_JWT_SAFETY_WINDOW_SECONDS) {
      return cachedServerJwt.token;
    }
  }

  if (cachedServerJwtPromise) {
    return await cachedServerJwtPromise;
  }

  // Server-side JWT for REST calls (admin privileges)
  // Important: Backdate `iat` significantly to tolerate clock skew between Edge Functions
  // and Stream's servers. Stream can reject tokens with:
  // "JWTAuth error: token used before issue at (iat)" if clocks are out of sync.
  // Using 5 minutes (300 seconds) backdate to handle most clock drift scenarios.
  const iatSeconds = nowSeconds - 300;
  // 30 minutes expiry from the actual current time (not the backdated iat)
  const expSeconds = nowSeconds + (60 * 30);

  cachedServerJwtPromise = (async () => {
    const key = await getHmacSigningKey(secret);
    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        server: true,
        iat: iatSeconds,
        exp: expSeconds,
      },
      key,
    );

    cachedServerJwt = { secret, token, expSeconds };
    return token;
  })().finally(() => {
    cachedServerJwtPromise = null;
  });

  return await cachedServerJwtPromise;
}

function toStreamUser(row: { id: string; full_name: string | null; profile_image_url: string | null; email: string | null }) {
  const name = (row.full_name || row.email || 'User').toString().trim() || 'User';
  const image = row.profile_image_url?.toString().trim() || undefined;
  return {
    id: row.id,
    name,
    ...(image ? { image } : {}),
  };
}

// Helper to create consistent error responses with diagnostic info
function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body = {
    error: message,
    ...(details ? { details } : {}),
  };
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Check Stream credentials
    const STREAM_CHAT_API_KEY =
      sanitizeSecret(Deno.env.get('STREAM_CHAT_API_KEY')) ||
      sanitizeSecret(Deno.env.get('STREAM_API_KEY'));
    const STREAM_API_SECRET =
      sanitizeSecret(Deno.env.get('STREAM_CHAT_API_SECRET')) ||
      sanitizeSecret(Deno.env.get('STREAM_API_SECRET'));

    if (!STREAM_CHAT_API_KEY || !STREAM_API_SECRET) {
      const missing: string[] = [];
      if (!STREAM_CHAT_API_KEY) missing.push('STREAM_CHAT_API_KEY or STREAM_API_KEY');
      if (!STREAM_API_SECRET) missing.push('STREAM_CHAT_API_SECRET or STREAM_API_SECRET');
      return errorResponse(
        'Stream users service not configured. Missing secrets in Supabase Dashboard.',
        500,
        { missing_secrets: missing }
      );
    }

    // Check Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE') ||
      '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      const missing: string[] = [];
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
      if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      return errorResponse(
        'Supabase environment not configured',
        500,
        { missing_env: missing }
      );
    }

    // Get authorization header - check both custom and standard
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401, {
        headers_received: Object.fromEntries(req.headers.entries()),
      });
    }

    // Extract JWT token - handle both "Bearer token" and raw token formats
    let jwt = authHeader;
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      jwt = authHeader.substring(7).trim();
    }
    
    if (!jwt) {
      return errorResponse('Empty bearer token', 401);
    }

    // Validate caller JWT using anon client
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(jwt);
    
    if (authError || !authData?.user) {
      return errorResponse(
        `Authentication failed: ${authError?.message || 'Invalid or expired token'}`,
        401,
        {
          auth_error_code: authError?.status,
          auth_error_name: authError?.name,
          token_preview: jwt.substring(0, 20) + '...',
        }
      );
    }

    // Parse request body
    let body: StreamUsersRequest = {};
    try {
      body = (await req.json()) as StreamUsersRequest;
    } catch (_e) {
      void _e;
    }

    const authedUserId = authData.user.id;
    const requested = normalizeUserIds(body.userIds);
    const targetUserIds = Array.from(new Set([authedUserId, ...requested]));

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, upserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch canonical profile data from DB
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: rows, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, profile_image_url, email')
      .in('id', targetUserIds);

    if (usersError) {
      return errorResponse(
        `Failed to load users from database: ${usersError.message}`,
        500,
        { db_error_code: usersError.code, requested_ids: targetUserIds }
      );
    }

    const usersArray = Array.isArray(rows) ? rows : [];
    const users: Record<string, unknown> = {};
    for (const row of usersArray) {
      if (!row?.id) continue;
      users[row.id] = toStreamUser(row as any);
    }

    // Track which user IDs were not found in DB
    const foundIds = Object.keys(users);
    const missingIds = targetUserIds.filter((id) => !foundIds.includes(id));

    const upsertCount = foundIds.length;
    if (upsertCount === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          upserted: 0,
          warning: 'No users found in database for provided IDs',
          requested_ids: targetUserIds,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create server auth token for Stream API
    const token = await createServerAuthToken(STREAM_API_SECRET);
    const baseUrl = 'https://chat.stream-io-api.com';
    const url = `${baseUrl}/users?api_key=${encodeURIComponent(STREAM_CHAT_API_KEY)}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        'Stream-Auth-Type': 'jwt',
      },
      body: JSON.stringify({ users }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let streamError: unknown = text;
      try {
        streamError = JSON.parse(text);
      } catch (_e) {
        void _e;
      }
      return errorResponse(
        `Stream API rejected user upsert (HTTP ${resp.status})`,
        500,
        {
          stream_status: resp.status,
          stream_error: streamError,
          user_ids: foundIds,
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        upserted: upsertCount,
        ...(missingIds.length > 0 ? { missing_from_db: missingIds } : {}),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      { error_type: error instanceof Error ? error.name : typeof error }
    );
  }
});

