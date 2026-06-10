/**
 * Stream Chat Token Generation Service
 * 
 * This service handles Stream user token generation for LinkApp (Chat + Video via Edge Functions).
 * It integrates with Supabase authentication and provides secure token management.
 * 
 * Note: In production, move token generation to Supabase Edge Functions
 * using Stream's server-side SDK for enhanced security.
 */

import { supabase } from './supabaseClient';
import { authService } from './authService';
import { ENV } from '../config/environment';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// Stream Chat SDK imports for client-side token generation
import { StreamChat } from 'stream-chat';

export interface StreamUserData {
  id: string;
  name: string;
  image?: string;
  email?: string;
}

export interface StreamTokenResponse {
  success: boolean;
  token?: string;
  apiKey?: string;
  user?: StreamUserData;
  error?: string;
}

type StreamTokenProduct = 'chat' | 'video';

type StreamTokenCacheEntry = {
  userId: string;
  product: StreamTokenProduct;
  token: string;
  apiKey?: string;
  expSeconds?: number;
  fetchedAtMs: number;
};

const STREAM_TOKEN_CACHE_VERSION = 1;
const STREAM_TOKEN_CACHE_SAFETY_WINDOW_SECONDS = 5 * 60; // refresh if expiring within 5 minutes

function toBase64(input: string): string {
  // base64url -> base64
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padLength);
}

function decodeJwtExpSeconds(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payloadB64 = parts[1];
  try {
    const json = Buffer.from(toBase64(payloadB64), 'base64').toString('utf8');
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string, expSeconds: number | null): boolean {
  if (!token || token.trim() === '') return false;
  if (typeof expSeconds !== 'number' || !Number.isFinite(expSeconds)) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expSeconds > nowSeconds + STREAM_TOKEN_CACHE_SAFETY_WINDOW_SECONDS;
}

class StreamTokenService {
  private client: StreamChat | null = null;
  private currentUser: StreamUserData | null = null;
  private ensuredUserIds: Set<string> = new Set();
  private tokenCache: Map<string, StreamTokenCacheEntry> = new Map();
  private tokenFetchPromises: Map<string, Promise<{ token: string; apiKey?: string }>> = new Map();
  private secureStoreAvailability: boolean | null = null;

  private getApiKey(): string {
    const fromEnv = ENV.STREAM_CHAT_API_KEY;
    if (fromEnv && fromEnv.trim() !== '') return fromEnv;

    // Dev fallback only: allow using the repo's `chatConfig.js` constant if env isn't wired.
    // Never do this in production builds.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cfg = require('../chatConfig.js') as { chatApiKey?: string };
        if (cfg?.chatApiKey && cfg.chatApiKey.trim() !== '') {
          return cfg.chatApiKey;
        }
      } catch (_e) {
        void _e;
      }
    }

    return '';
  }

  /**
   * Initialize Stream Chat client for token generation
   */
  private initializeClient(): StreamChat {
    if (!this.client) {
      const apiKey = this.getApiKey();
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Stream Chat API key not configured. Chat features are disabled.');
      }
      this.client = StreamChat.getInstance(apiKey);
    }
    return this.client;
  }

  private getTokenCacheKey(userId: string, product: StreamTokenProduct): string {
    return `${STREAM_TOKEN_CACHE_VERSION}:${product}:${userId}`;
  }

  private getSecureStoreKey(userId: string, product: StreamTokenProduct): string {
    return `stream_token_cache_v${STREAM_TOKEN_CACHE_VERSION}:${product}:${userId}`;
  }

  private async isSecureStoreAvailable(): Promise<boolean> {
    if (this.secureStoreAvailability != null) return this.secureStoreAvailability;
    try {
      const available = await SecureStore.isAvailableAsync();
      this.secureStoreAvailability = Boolean(available);
      return this.secureStoreAvailability;
    } catch {
      this.secureStoreAvailability = false;
      return false;
    }
  }

  private async readCachedToken(userId: string, product: StreamTokenProduct): Promise<{ token: string; apiKey?: string } | null> {
    const key = this.getTokenCacheKey(userId, product);
    const mem = this.tokenCache.get(key);
    if (mem && isTokenUsable(mem.token, mem.expSeconds ?? null)) {
      return { token: mem.token, apiKey: mem.apiKey };
    }

    const canUseSecureStore = await this.isSecureStoreAvailable();
    if (!canUseSecureStore) return null;

    try {
      const raw = await SecureStore.getItemAsync(this.getSecureStoreKey(userId, product));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StreamTokenCacheEntry> | null;
      if (!parsed || typeof parsed !== 'object') return null;
      const token = typeof parsed.token === 'string' ? parsed.token : '';
      const expSeconds = typeof parsed.expSeconds === 'number' ? parsed.expSeconds : decodeJwtExpSeconds(token);
      if (!isTokenUsable(token, expSeconds)) return null;

      const apiKey = typeof parsed.apiKey === 'string' && parsed.apiKey.trim() !== '' ? parsed.apiKey : undefined;
      const entry: StreamTokenCacheEntry = {
        userId,
        product,
        token,
        apiKey,
        expSeconds: expSeconds ?? undefined,
        fetchedAtMs: typeof parsed.fetchedAtMs === 'number' ? parsed.fetchedAtMs : Date.now(),
      };
      this.tokenCache.set(key, entry);
      return { token: entry.token, apiKey: entry.apiKey };
    } catch {
      return null;
    }
  }

  private async persistCachedToken(params: {
    userId: string;
    product: StreamTokenProduct;
    token: string;
    apiKey?: string;
  }): Promise<void> {
    const { userId, product, token } = params;
    const apiKey = typeof params.apiKey === 'string' && params.apiKey.trim() !== '' ? params.apiKey : undefined;
    const expSeconds = decodeJwtExpSeconds(token) ?? undefined;
    const fetchedAtMs = Date.now();

    const entry: StreamTokenCacheEntry = { userId, product, token, apiKey, expSeconds, fetchedAtMs };
    this.tokenCache.set(this.getTokenCacheKey(userId, product), entry);

    const canUseSecureStore = await this.isSecureStoreAvailable();
    if (!canUseSecureStore) return;

    try {
      await SecureStore.setItemAsync(this.getSecureStoreKey(userId, product), JSON.stringify(entry));
    } catch {
      // best-effort; never block token issuance
    }
  }

  /**
   * Best-effort token cache cleanup (called on logout/user switch).
   * If userId is omitted, clears only in-memory caches.
   */
  async clearTokenCache(userId?: string): Promise<void> {
    if (!userId) {
      this.tokenCache.clear();
      this.tokenFetchPromises.clear();
      return;
    }

    // Clear both products
    for (const product of ['chat', 'video'] as const) {
      const key = this.getTokenCacheKey(userId, product);
      this.tokenCache.delete(key);
      this.tokenFetchPromises.delete(key);
      const canUseSecureStore = await this.isSecureStoreAvailable();
      if (canUseSecureStore) {
        try {
          await SecureStore.deleteItemAsync(this.getSecureStoreKey(userId, product));
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Generate a Stream Chat token for the current Supabase user
   */
  async generateTokenForCurrentUser(): Promise<StreamTokenResponse> {
    try {
      // Fast path: use cached session identity to avoid blocking on profile fetch.
      const currentUser = await authService.getSessionUserBasic();
      if (!currentUser) {
        return {
          success: false,
          error: 'No authenticated user found'
        };
      }

      return await this.generateTokenForUser(currentUser.id, {
        name: currentUser.fullName || currentUser.email || 'User',
        email: currentUser.email,
        image: currentUser.profileImageUrl
      });
    } catch (_error: any) {
      
      return {
        success: false,
        error: _error.message || 'Failed to generate token'
      };
    }
  }

  /**
   * Generate a Stream Chat token for a specific user
   */
  async generateTokenForUser(
    userId: string, 
    userData: Partial<StreamUserData> = {},
    options?: { product?: StreamTokenProduct }
  ): Promise<StreamTokenResponse> {
    try {
      const product: StreamTokenProduct = options?.product === 'video' ? 'video' : 'chat';

      // Prepare user data for Stream
      const streamUser: StreamUserData = {
        id: userId,
        name: userData.name || 'User',
        image: userData.image,
        email: userData.email
      };

      // IMPORTANT:
      // Always use server-issued tokens. Your Stream app rejects dev tokens:
      // "development tokens are not allowed for this application".
      const { token, apiKey } = await this.fetchServerToken(userId, 2, product);

      // Store/update user metadata in Supabase
      await this.updateStreamUserMetadata(userId, streamUser);

      this.currentUser = streamUser;

      return {
        success: true,
        token: token || undefined,
        apiKey: apiKey || undefined,
        user: streamUser
      };
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Token generation failed'
      };
    }
  }

  /**
   * Fetch a server-generated Stream token for production usage.
   * Includes retry logic for transient network/clock errors.
   */
  private async fetchServerToken(
    userId: string,
    maxRetries: number = 2,
    product: StreamTokenProduct = 'chat'
  ): Promise<{ token: string; apiKey?: string }> {
    const cached = await this.readCachedToken(userId, product);
    if (cached) return cached;

    const key = this.getTokenCacheKey(userId, product);
    const inflight = this.tokenFetchPromises.get(key);
    if (inflight) return inflight;

    const fetchPromise = (async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.fetchServerTokenInternal(userId, product);
          await this.persistCachedToken({ userId, product, token: result.token, apiKey: result.apiKey });
          return result;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error('Failed to fetch token');

          // Check if this is a retryable error
          const isRetryable =
            lastError.message.includes('token used before issue') ||
            lastError.message.includes('JWTAuth error') ||
            lastError.message.includes('timed out') ||
            lastError.message.includes('timeout') ||
            lastError.message.includes('network');

          if (isRetryable && attempt < maxRetries) {
            // Wait before retrying with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }

          // Not retryable or max retries reached
          break;
        }
      }

      throw lastError || new Error('Failed to fetch token');
    })().finally(() => {
      this.tokenFetchPromises.delete(key);
    });

    this.tokenFetchPromises.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Internal implementation of fetchServerToken (called by retry wrapper)
   */
  private async fetchServerTokenInternal(
    userId: string,
    product: StreamTokenProduct
  ): Promise<{ token: string; apiKey?: string }> {
    // Prefer Supabase Edge Function (keeps Stream API secret server-side)
    // Function name: "stream-token"
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    const authHeader = `Bearer ${session.access_token}`;

    const invokePromise = supabase.functions.invoke('stream-token', {
      body: { userId, product },
      headers: { Authorization: authHeader },
    });
    const timeoutMs = 15000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Stream token request timed out. Please try again.'));
      }, timeoutMs);
    });

    const { data, error } = (await Promise.race([invokePromise, timeoutPromise])) as {
      data: unknown;
      error: Error | null;
    };

    if (error) {
      // `error.context` is usually the Response when the function returns non-2xx.
      const status = (error as any)?.context?.status as number | undefined;
      let serverErrorText: string | undefined;

      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.clone === 'function') {
          const raw = await ctx.clone().text();
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { error?: unknown };
              if (parsed && typeof parsed.error === 'string') {
                serverErrorText = parsed.error;
              } else {
                serverErrorText = raw;
              }
            } catch {
              serverErrorText = raw;
            }
          }
        }
      } catch (_e) {
        void _e;
      }

      const statusPart = typeof status === 'number' ? ` (HTTP ${status})` : '';
      const serverPart = serverErrorText ? ` Server: ${serverErrorText}` : '';

      const base = `Stream token function failed${statusPart}: ${error.message}.${serverPart}`;

      // Keep guidance relevant to the status code (401 != missing secret).
      if (status === 401) {
        throw new Error(`${base} Please sign in again and retry.`);
      }

      if (status === 404) {
        throw new Error(`${base} Make sure the Supabase Edge Function "stream-token" is deployed.`);
      }

      throw new Error(`${base} Make sure Supabase Edge Function "stream-token" is deployed and STREAM_API_SECRET is set.`);
    }

    const token = (data as any)?.token;
    const apiKey = (data as any)?.apiKey;

    if (typeof token === 'string' && token.trim() !== '') {
      return {
        token,
        apiKey: typeof apiKey === 'string' && apiKey.trim() !== '' ? apiKey : undefined,
      };
    }

    throw new Error(
      'Stream token function returned an invalid response. ' +
        'Make sure "stream-token" returns JSON { token: string }.'
    );
  }

  /**
   * Ensure Stream user objects exist (server-side upsert via Edge Function).
   * This is required because Stream will reject channel creation if a member user doesn't exist.
   * Includes retry logic for transient JWT clock skew errors.
   */
  async ensureUsersExist(
    userIds: string[],
    options: { throwOnError?: boolean; maxRetries?: number; rejectMissingUsers?: boolean } = {}
  ): Promise<void> {
    const maxRetries = options.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.ensureUsersExistInternal(userIds, options);
        return; // Success
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Chat user provisioning failed');
        
        // Check if this is a JWT clock skew error that might resolve with retry
        const isJwtClockError = lastError.message.includes('token used before issue') ||
                                 lastError.message.includes('JWTAuth error') ||
                                 lastError.message.includes('iat');
        
        if (isJwtClockError && attempt < maxRetries) {
          // Wait a bit before retrying (clock might sync)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // Not a retryable error or max retries reached
        break;
      }
    }

    if (lastError && options.throwOnError) {
      throw lastError;
    }
  }

  /**
   * Internal implementation of ensureUsersExist (called by retry wrapper)
   */
  private async ensureUsersExistInternal(
    userIds: string[],
    options: { throwOnError?: boolean; rejectMissingUsers?: boolean } = {}
  ): Promise<void> {
    const unique = Array.from(
      new Set(
        (userIds || [])
          .filter((x) => typeof x === 'string')
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );

    if (unique.length === 0) return;

    const pending = unique.filter((id) => !this.ensuredUserIds.has(id));
    if (pending.length === 0) return;

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      if (options.throwOnError) {
        throw new Error('Not authenticated. Please sign in to use chat.');
      }
      return;
    }

    const { data, error } = await supabase.functions.invoke('stream-users', {
      body: { userIds: pending },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error && options.throwOnError) {
      const status = (error as any)?.context?.status as number | undefined;

      // Try to extract detailed error info from the response
      let serverErrorText: string | undefined;
      let serverDetails: unknown;
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.clone === 'function') {
          const raw = await ctx.clone().text();
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { error?: string; details?: unknown };
              serverErrorText = parsed.error;
              serverDetails = parsed.details;
            } catch {
              serverErrorText = raw;
            }
          }
        }
      } catch (_e) {
        void _e;
      }

      const statusPart = typeof status === 'number' ? ` (HTTP ${status})` : '';
      let message = `Chat user provisioning failed${statusPart}`;

      if (serverErrorText) {
        message += `: ${serverErrorText}`;
      } else {
        message += `: ${error.message}`;
      }

      // Add helpful context based on the error
      if (status === 500 && serverDetails && typeof serverDetails === 'object') {
        const details = serverDetails as Record<string, unknown>;
        if (details.missing_secrets) {
          message += ` Missing secrets: ${(details.missing_secrets as string[]).join(', ')}. Configure these in your Supabase Dashboard under Edge Functions > Secrets.`;
        } else if (details.stream_error) {
          message += ` Stream API error: ${JSON.stringify(details.stream_error)}`;
        }
      } else if (status === 500) {
        message += ' Make sure the Supabase Edge Function "stream-users" is deployed and all secrets are configured.';
      }

      throw new Error(message);
    }

    // Mark successfully ensured users so we don't re-provision on every channel open.
    const missingFromDb = Array.isArray((data as any)?.missing_from_db)
      ? ((data as any).missing_from_db as string[])
      : [];

    if (missingFromDb.length > 0 && options.throwOnError && options.rejectMissingUsers !== false) {
      throw new Error('One or more chat participants no longer exist');
    }

    for (const id of pending) {
      if (!missingFromDb.includes(id)) {
        this.ensuredUserIds.add(id);
      }
    }

    // Log warning if some users weren't found
    if (data?.warning) {
      console.warn('[StreamChat] User provisioning warning:', data.warning);
    }
  }

  /**
   * Update Stream Chat user metadata in Supabase
   */
  private async updateStreamUserMetadata(
    _userId: string, 
    _userData: StreamUserData
  ): Promise<void> {
    // Stream Chat stores user metadata internally
    // No need to duplicate in Supabase
    // This method is kept for backward compatibility
    
  }

  /**
   * Get Stream user metadata from Supabase
   */
  async getStreamUserMetadata(userId: string): Promise<StreamUserData | null> {
    try {
      // Get user data from auth service instead
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || currentUser.id !== userId) {
        return null;
      }

      return {
        id: userId,
        name: (currentUser as any).user_metadata?.full_name || currentUser.email || 'User',
        image: (currentUser as any).user_metadata?.profile_image_url,
        email: currentUser.email
      };
    } catch (_error) {
      
      return null;
    }
  }

  /**
   * Validate if user has access to Stream Chat
   */
  async validateUserAccess(userId?: string): Promise<boolean> {
    try {
      const userToCheck = userId || (await authService.getCurrentUser())?.id;
      if (!userToCheck) return false;

      // Check if user exists in Supabase
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userToCheck)
        .single();

      return !error && !!data;
    } catch (_error) {
      
      return false;
    }
  }

  /**
   * Create a channel ID for property listings
   */
  static createPropertyChannelId(propertyId: string, ownerId: string): string {
    return `property_${propertyId}_${ownerId}`;
  }

  /**
   * Create a channel ID for job postings
   */
  static createJobChannelId(jobId: string, employerId: string): string {
    return `job_${jobId}_${employerId}`;
  }

  /**
   * Create a channel ID for service listings
   */
  static createServiceChannelId(serviceId: string, ownerId: string): string {
    return `service_${serviceId}_${ownerId}`;
  }

  /**
   * Create a deterministic 1:1 channel id for listing chats (property/job/service).
   * This avoids collisions where different users join the same listing channel.
   */
  static createListingConversationChannelId(
    scope: 'property' | 'job' | 'service',
    listingId: string,
    userAId: string,
    userBId: string
  ): string {
    const a = typeof userAId === 'string' ? userAId.trim() : '';
    const b = typeof userBId === 'string' ? userBId.trim() : '';
    const listing = typeof listingId === 'string' ? listingId.trim() : '';
    const normalizedScope = scope.trim();

    const pair = [a, b].filter(Boolean).sort();
    const raw = `${normalizedScope}_${listing}_${pair.join('_')}`;
    if (raw.length <= 64) {
      return raw;
    }

    return StreamTokenService.createUserPairChannelId(
      `${normalizedScope}_${listing}`,
      pair[0] || a,
      pair[1] || b
    );
  }

  /**
   * Create a channel ID for Date Mi conversations
   */
  static createDateMiChannelId(user1Id: string, user2Id: string): string {
    // Sort IDs to ensure consistent channel ID regardless of who initiates
    const sortedIds = [user1Id, user2Id].sort();
    const rawId = `datemi_${sortedIds[0]}_${sortedIds[1]}`;
    if (rawId.length <= 64) {
      return rawId;
    }
    return StreamTokenService.createUserPairChannelId('datemi', sortedIds[0], sortedIds[1]);
  }

  /**
   * Create a direct message channel ID
   */
  static createDirectMessageChannelId(user1Id: string, user2Id: string): string {
    const sortedIds = [user1Id, user2Id].sort();
    const rawId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    if (rawId.length <= 64) {
      return rawId;
    }
    return StreamTokenService.createUserPairChannelId('dm', sortedIds[0], sortedIds[1]);
  }

  private static createUserPairChannelId(prefix: string, user1Id: string, user2Id: string): string {
    const raw = `${user1Id}:${user2Id}`;
    const hash = StreamTokenService.hashString(raw);
    return `${prefix}_${hash}`;
  }

  private static hashString(value: string): string {
    const hashA = StreamTokenService.fnv1a(value, 0x811c9dc5);
    const hashB = StreamTokenService.fnv1a(value, 0x9e3779b9);
    const partA = hashA.toString(36).padStart(7, '0');
    const partB = hashB.toString(36).padStart(7, '0');
    return `${partA}${partB}`;
  }

  private static fnv1a(value: string, seed: number): number {
    let hash = seed >>> 0;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  /**
   * Get current user data
   */
  getCurrentUser(): StreamUserData | null {
    return this.currentUser;
  }

  /**
   * Clear cached user data
   */
  clearCache(): void {
    this.currentUser = null;
    this.ensuredUserIds.clear();
    this.tokenCache.clear();
    this.tokenFetchPromises.clear();
  }

  /**
   * Get client instance
   */
  getClient(): StreamChat | null {
    return this.client;
  }
}

// Export singleton instance
export const streamTokenService = new StreamTokenService();

// Export class for testing
export { StreamTokenService };
