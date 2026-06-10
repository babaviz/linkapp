/**
 * Stream Video Service for LinkApp
 * 
 * This service manages all Stream Video operations including:
 * - Video/Audio call initialization and management
 * - Token generation for Stream Video
 * - Call events and state management
 * - Integration with Date Mi module
 * - Subscription tier enforcement
 * 
 * IMPORTANT: Uses tokenProvider pattern for proper token refresh handling
 * as per Stream Video SDK best practices.
 */

import { 
  StreamVideoClient,
  Call,
  User as StreamUser,
  CallingState,
  callManager,
} from '@stream-io/video-react-native-sdk';
import InCallManager from 'react-native-incall-manager';
import { Platform } from 'react-native';
import { ENV } from '../config/environment';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  requestVideoCallPermissions,
  requestAudioCallPermissions,
  checkCallPermissions,
  type CallPermissions,
} from '../utils/callPermissions';
import { stopRingtone } from '../utils/ringtoneController';
import { subscriptionService } from './subscriptionService';
import { isPlayStoreReviewer } from '../utils/playStoreReviewer';
import { dateMiFeatureEntitlementService } from './dateMiFeatureEntitlementService';
import { paystackService } from './paystackService';
import entitlementService from './entitlementService';
import dateMiNotificationManager from './dateMiNotificationManager';

const MAX_STREAM_VIDEO_LOG_CHARS = 350;

function truncateStreamVideoLogMessage(message: unknown, maxChars: number = MAX_STREAM_VIDEO_LOG_CHARS): string {
  const raw = typeof message === 'string' ? message : String(message);
  return raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw;
}

/**
 * Configure Stream Video global loggers defensively.
 *
 * Why:
 * The SDK can include very large payload objects in coordinator warnings (e.g. WS 1006 close events).
 * In Expo dev builds, forwarding huge logs across the JS↔native bridge can destabilize the app
 * and lead to dev-client reload loops.
 */
function configureStreamVideoGlobalLogging(): void {
  try {
    // Dynamic require keeps this crash-safe across build variants.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const videoClient = require('@stream-io/video-client') as {
      videoLoggerSystem?: {
        configureLoggers?: (config: Record<string, { level: string | null; sink?: (...args: any[]) => void }>) => void;
      };
    };
    const videoLoggerSystem = videoClient?.videoLoggerSystem;
    if (!videoLoggerSystem || typeof videoLoggerSystem.configureLoggers !== 'function') return;

    const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
    const level = isDev ? 'warn' : 'error';

    const safeSink = (logLevel: string, message: unknown, ..._rest: unknown[]) => {
      const text = truncateStreamVideoLogMessage(message);
      if (logLevel === 'error') {
        // Stream can emit "error" logs for expected/non-fatal states (eg SFU disconnects).
        // In RN dev, console.error triggers a red LogBox which looks like an app crash.
        // Demote known noisy errors to warnings in dev so debugging remains usable.
        const shouldDemoteToWarn =
          isDev && (text.includes('[SfuClient]') || text.includes('SFU reported error') || text.includes('WS failed'));
        if (shouldDemoteToWarn) {
          // eslint-disable-next-line no-console
          console.warn(text);
          return;
        }
        // eslint-disable-next-line no-console
        console.error(text);
        return;
      }
      if (logLevel === 'warn') {
        // eslint-disable-next-line no-console
        console.warn(text);
      }
    };

    // On Android, the audio manager logger produces rapid cycling warnings
    // even with the NC module stub (some SDK versions check before our patch).
    // Suppress them entirely to avoid JS bridge flooding.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noopSink = (_logLevel: unknown, _message: unknown, ..._rest: unknown[]) => {};
    const audioLogConfig =
      Platform.OS === 'android'
        ? { level: 'warn' as const, sink: noopSink }
        : { level, sink: safeSink };

    videoLoggerSystem.configureLoggers({
      default: { level, sink: safeSink },
      coordinator: { level, sink: safeSink },
      'audio manager': audioLogConfig,
      audio: audioLogConfig,
    });
  } catch {
    // Ignore: logging config should never break app boot.
  }
}

configureStreamVideoGlobalLogging();

export type VideoCallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'initiated' | 'ringing' | 'joining' | 'joined' | 'reconnecting' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'failed' | 'left';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enableCameraWithRetry(call: Call, attempts: number = 3): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (call.camera.enabled) return;
      await call.camera.enable();
      return;
    } catch {
      if (attempt >= attempts - 1) return;
      await sleep(200 * (attempt + 1));
    }
  }
}

// NOTE (Feb 2026): We previously attempted to patch the NoiseCancellationReactNative
// native module on Android to stop the SDK's audio-manager cycling warnings. That
// approach backfired: by making `enable()` resolve successfully, the SDK thought NC
// was active, misconfigured the audio pipeline, and caused calls to disconnect within
// seconds. The NC warnings are cosmetic and do NOT cause call instability -- leave them
// alone. Audio log suppression (above) prevents console flooding without side effects.

export interface VideoCallSession {
  id: string;
  callerId: string;
  receiverId: string;
  type: VideoCallType;
  streamCallId: string;
  streamCallCid: string;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface CallParticipant {
  userId: string;
  name: string;
  image?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
}

class StreamVideoService {
  private client: StreamVideoClient | null = null;
  private currentCall: Call | null = null;
  private currentUser: StreamUser | null = null;
  private currentUserId: string | null = null;
  private clientApiKey: string | null = null;
  private callTimer?: ReturnType<typeof setInterval>;
  private callStartTime: Date | null = null;
  private lastInitError: string | null = null;
  private lastCallError: string | null = null;
  private initPromise: Promise<boolean> | null = null;
  private callEventUnsubscribers: Array<() => void> = [];
  private tokenCache: { userId: string; token: string; fetchedAtMs: number } | null = null;
  private tokenFetchPromise: Promise<string> | null = null;
  private callEntitlements: { audio: boolean | null; video: boolean | null } = { audio: null, video: null };
  private mediaPermissions: CallPermissions | null = null;
  private mediaPermissionsPromise: Promise<CallPermissions> | null = null;
  private permissionStatusCache: { audio: CallPermissions; video: CallPermissions; checkedAtMs: number } | null = null;
  private permissionStatusPromise: Promise<void> | null = null;
  private isCreatingCall: boolean = false;
  private nextCallOpId: number = 1;
  private activeCallOpId: number | null = null;
  private abortedCallOpId: number | null = null;
  private pendingCall: Call | null = null;
  private pendingCallOpId: number | null = null;
  private finalizeCallPromise: Promise<void> | null = null;
  private finalizingCallCid: string | null = null;

  getLastInitError(): string | null {
    return this.lastInitError;
  }

  getLastCallError(): string | null {
    return this.lastCallError;
  }

  getApiKey(): string {
    // Stream Video can be configured with its own API key (separate Stream Video app).
    // In this app, we also support using the *same* API key as Stream Chat.
    //
    // IMPORTANT:
    // If no API key is available, we treat Stream Video as not configured to avoid
    // unstable websocket retries / dev-client reload loops.
    const fromVideoEnv = ENV.STREAM_VIDEO_API_KEY;
    if (fromVideoEnv && fromVideoEnv.trim() !== '') return fromVideoEnv;

    // Fallback: shared Stream app key (Chat + Video).
    const fromChatEnv = ENV.STREAM_CHAT_API_KEY;
    if (fromChatEnv && fromChatEnv.trim() !== '') return fromChatEnv;

    return '';
  }

  /**
   * Best-effort warm-up after authentication:
   * - Prime Stream Video token cache (via secure Stream token cache)
   * - Check camera/mic permission *status* without prompting
   *
   * This must never block UI navigation.
   */
  async prewarm(options?: { checkPermissions?: boolean }): Promise<void> {
    const shouldCheckPermissions = options?.checkPermissions !== false;

    const sessionUser = await authService.getSessionUserBasic();
    if (!sessionUser?.id) return;

    const userId = sessionUser.id;

    // Warm token cache (secure cached in streamTokenService; this call is usually instant after first fetch).
    try {
      const { streamTokenService } = await import('./streamTokenService');
      const tokenResponse = await streamTokenService.generateTokenForUser(
        userId,
        {
          name: sessionUser.fullName || sessionUser.email || 'User',
          email: sessionUser.email,
          image: sessionUser.profileImageUrl || undefined,
        },
        { product: 'video' }
      );

      if (tokenResponse.success && tokenResponse.token) {
        this.tokenCache = { userId, token: tokenResponse.token, fetchedAtMs: Date.now() };
        const apiKeyFromToken = typeof tokenResponse.apiKey === 'string' ? tokenResponse.apiKey.trim() : '';
        if (apiKeyFromToken) {
          this.clientApiKey = apiKeyFromToken;
        }
      }
    } catch {
      // ignore
    }

    if (!shouldCheckPermissions) return;

    if (!this.permissionStatusPromise) {
      this.permissionStatusPromise = Promise.all([checkCallPermissions('video'), checkCallPermissions('audio')])
        .then(([video, audio]) => {
          this.permissionStatusCache = { video, audio, checkedAtMs: Date.now() };
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          this.permissionStatusPromise = null;
        });
    }

    // Never throw from prewarm.
    await this.permissionStatusPromise;
  }

  /**
   * Token provider function for StreamVideoClient
   * This allows automatic token refresh when tokens expire
   * IMPORTANT: Must return the token string directly, not wrap in additional promises
   */
  private createTokenProvider(userId: string): () => Promise<string> {
    return async () => {
      const cached = this.tokenCache;
      const now = Date.now();
      const cacheValid =
        cached?.userId === userId &&
        typeof cached.token === 'string' &&
        cached.token.trim() !== '' &&
        now - cached.fetchedAtMs < 50 * 60 * 1000; // 50 minutes

      if (cacheValid) return cached!.token;

      // Avoid parallel token fetches (prevents request storms on reconnect)
      if (!this.tokenFetchPromise) {
        this.tokenFetchPromise = (async () => {
          const token = await this.generateVideoToken(userId);
          if (!token) throw new Error('Failed to generate video token');
          this.tokenCache = { userId, token, fetchedAtMs: Date.now() };
          return token;
        })().finally(() => {
          this.tokenFetchPromise = null;
        });
      }

      try {
        return await this.tokenFetchPromise;
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[StreamVideo] Token generation failed for user:', userId, e);
        }
        throw e instanceof Error ? e : new Error('Failed to generate video token');
      }
    };
  }

  /**
   * Initialize Stream Video client and connect user
   * Uses tokenProvider pattern for proper token refresh handling
   */
  async initialize(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.lastInitError = null;
    this.initPromise = (async () => {
      try {
        // Use lightweight session check first to avoid redundant network calls.
        // authService.getCurrentUser() triggers a full profile fetch (~2-7s).
        // getSessionUserBasic() uses the cached session (~instant).
        const sessionUser = await authService.getSessionUserBasic();
        if (!sessionUser) {
          this.lastInitError = 'No authenticated user';
          return false;
        }

        const currentUser = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          fullName: sessionUser.fullName || 'User',
          phoneNumber: sessionUser.phoneNumber || '',
          profileImageUrl: sessionUser.profileImageUrl || null,
        };

        // If already initialized for this user, do nothing (do not disconnect/recreate).
        if (this.client && this.currentUserId === currentUser.id) {
          return true;
        }

        // User changed -> hard reset any existing client/call state.
        if (this.client && this.currentUserId && this.currentUserId !== currentUser.id) {
          try {
            await this.disconnect();
          } catch {
            // ignore
          }
        }

        // IMPORTANT:
        // Do not block client initialization for non-premium users.
        // Non-premium users may still need to RECEIVE / ACCEPT calls from premium users.
        // Outgoing call creation is gated per-call-type in `createCall()`.

        this.currentUser = {
          id: currentUser.id,
          name: currentUser.fullName || 'User',
          image: currentUser.profileImageUrl,
        };
        this.currentUserId = currentUser.id;

        // Warm token cache so call creation/join never waits on token fetch.
        // Prefer server-provided apiKey so it matches the secret used to sign tokens.
        const { streamTokenService } = await import('./streamTokenService');
        const tokenResponse = await streamTokenService.generateTokenForUser(
          currentUser.id,
          {
            name: currentUser.fullName || currentUser.email || 'User',
            email: currentUser.email,
            image: currentUser.profileImageUrl || undefined,
          },
          { product: 'video' }
        );

        if (!tokenResponse.success || !tokenResponse.token) {
          this.lastInitError =
            tokenResponse.error || 'Failed to generate video token. Please check your network connection.';
          return false;
        }

        const apiKeyFromToken =
          typeof tokenResponse.apiKey === 'string' ? tokenResponse.apiKey.trim() : '';
        const apiKey = apiKeyFromToken !== '' ? apiKeyFromToken : this.getApiKey();
        const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
        if (!normalizedApiKey) {
          // IMPORTANT: Do not attempt to initialize Stream Video when it's not configured.
          // Using a mismatched API key/token against the Stream Video endpoints can lead
          // to repeated WS failures and dev-client reload loops.
          this.lastInitError =
            'Stream Video is not configured. Set EXPO_PUBLIC_STREAM_VIDEO_API_KEY (or reuse EXPO_PUBLIC_STREAM_CHAT_API_KEY).';
          return false;
        }

        this.clientApiKey = normalizedApiKey;
        this.tokenCache = { userId: currentUser.id, token: tokenResponse.token, fetchedAtMs: Date.now() };

        this.client = StreamVideoClient.getOrCreateInstance({
          apiKey: normalizedApiKey,
          user: this.currentUser,
          tokenProvider: this.createTokenProvider(currentUser.id),
          options: {
            // Prevent multiple concurrent ringing calls.
            // Stream will automatically reject incoming calls when the user is already busy.
            rejectCallWhenBusy: true,
            // IMPORTANT:
            // The Stream Video SDK logs very large WebSocket event objects on coordinator warnings
            // (e.g. "WS failed with code: 1006"). In Expo dev builds, dumping these objects can
            // overwhelm the JS<->native logging bridge and *appear like an app restart*.
            //
            // We keep the message but drop the huge payload (`...rest`) for coordinator logs.
            logOptions: {
              default: { level: 'warn' },
              coordinator: {
                level: 'warn',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                sink: (logLevel: string, message: unknown, ..._rest: unknown[]) => {
                  // Guard against huge log lines: truncate aggressively to keep dev bridge stable.
                  const text = truncateStreamVideoLogMessage(message, 300);
                  if (logLevel === 'error') {
                    // eslint-disable-next-line no-console
                    console.error(text);
                    return;
                  }
                  if (logLevel === 'warn') {
                    // eslint-disable-next-line no-console
                    console.warn(text);
                  }
                },
              },
            },
          } as any,
        });

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to initialize video service';
        this.lastInitError = errorMsg;
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[StreamVideo] Initialize failed:', errorMsg);
        }
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate Stream Video token for user
   * Uses the shared Edge Function (`stream-token`) with `product: "video"`.
   */
  private async generateVideoToken(userId: string): Promise<string | null> {
    try {
      const { streamTokenService } = await import('./streamTokenService');
      const tokenResponse = await streamTokenService.generateTokenForUser(userId, {}, { product: 'video' });
      
      if (tokenResponse.success && tokenResponse.token) {
        return tokenResponse.token;
      }
      
      throw new Error(tokenResponse.error || 'Token generation failed');
    } catch (error) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[StreamVideo] Token generation error:', error);
      }
      return null;
    }
  }

  /**
   * Check if user can make outgoing calls (DateMi-only).
   * Supports Premium subscriptions and DateMi feature add-ons.
   */
  async checkCallEntitlement(userId: string, callType: VideoCallType): Promise<boolean> {
    try {
      // In demo/dev builds (or when Supabase isn't configured), don't hard-block.
      // UI gating (usePremiumAccess) remains the primary UX control.
      if (!isSupabaseConfigured()) {
        return true;
      }

      // If the userId is not a UUID (demo/test users), don't block calls.
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return true;
      }

      // Check if user is a Play Store reviewer (they have premium access).
      // Use lightweight session check to avoid redundant getCurrentUser network call.
      const sessionUser = await authService.getSessionUserBasic();
      if (isPlayStoreReviewer({ id: userId, email: sessionUser?.email })) {
        return true;
      }

      // DateMi add-ons: allow calls without requiring Premium tier.
      const feature = callType === 'video' ? 'video_call' : 'voice_call';
      let hasAddon = await dateMiFeatureEntitlementService.hasActiveEntitlement(userId, feature);
      if (hasAddon) {
        return true;
      }

      // Recovery: if the user just paid but activation/verification was delayed,
      // attempt a lightweight re-verification and re-check entitlements.
      try {
        await paystackService.reverifyPendingFeaturePackages(userId);
        hasAddon = await dateMiFeatureEntitlementService.hasActiveEntitlement(userId, feature);
        if (hasAddon) {
          return true;
        }
      } catch {
        // Non-blocking: fall through to subscription checks
      }

      const hasPremiumEquivalent = await entitlementService.hasPremiumEquivalentAccess(userId);
      if (hasPremiumEquivalent) {
        return true;
      }

      const subscription = await subscriptionService.getCurrentSubscription(userId);
      if (subscription?.tier === 'premium') {
        const end = new Date(subscription.endDate);
        if (!Number.isNaN(end.getTime()) && end.getTime() > Date.now()) {
          return true;
        }
      }

      // Fallback: some environments compute tier via the DateMi view even if
      // the direct subscription query returns null.
      const { data, error } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('subscription_tier')
        .eq('user_id', userId)
        .single();

      if (!error && data?.subscription_tier === 'premium') {
        return true;
      }

      return false;
    } catch (_e) {
      void _e;
      // Deny-by-default on unknown errors to avoid granting premium-only access.
      return false;
    }
  }
  
  /**
   * Backward-compatible helper for video-call entitlement checks.
   */
  async checkVideoCallEntitlement(userId: string): Promise<boolean> {
    return this.checkCallEntitlement(userId, 'video');
  }

  /**
   * Cached entitlement check for fast call acceptance.
   *
   * The full `checkCallEntitlement()` can make up to 4 sequential Supabase queries
   * (300-2000ms). For accepting calls, this latency is directly felt by both users.
   * This method checks the in-memory cache first, falling through to the full check
   * only when needed. Positive results are cached with a TTL.
   */
  private async checkCallEntitlementCached(userId: string, callType: VideoCallType): Promise<boolean> {
    // Fast path: already verified this session
    const cached = this.callEntitlements[callType];
    if (cached === true) return true;

    // Slow path: full check
    const result = await this.checkCallEntitlement(userId, callType);
    if (result) {
      this.callEntitlements[callType] = true;
    }
    return result;
  }

  /**
   * Create or join a video/audio call
   * Uses the proper ringing flow as per Stream Video SDK documentation
   */
  async createCall(
    callType: VideoCallType,
    receiverId: string,
    receiverName: string,
    receiverImage?: string,
    callerImageOverride?: string
  ): Promise<Call | null> {
    this.lastCallError = null;

    if (!this.client || !this.currentUser) {
      this.lastCallError = 'Video service not initialized. Please try again.';
      return null;
    }

    let call: Call | null = null;
    let opId: number | null = null;
    if (this.isCreatingCall) {
      this.lastCallError = 'Call is already starting. Please wait a moment and try again.';
      return null;
    }

    // Guard against double-tap / concurrent call initialization (prevents duplicate ring:true calls).
    this.isCreatingCall = true;
    try {
      // Gate OUTGOING calls by entitlement (receiving/accepting is allowed for all users).
      // NOTE: We cache only positive entitlements so upgrades take effect immediately.
      const cached = this.callEntitlements[callType];
      const canCreateOutgoing = cached === true ? true : await this.checkCallEntitlement(this.currentUser.id, callType);
      if (canCreateOutgoing) {
        this.callEntitlements[callType] = true;
      } else {
        this.lastCallError =
          callType === 'video'
            ? 'Video Calls package ($1/month) or Premium subscription required'
            : 'Voice Calls package ($1/month) or Premium subscription required';
        return null;
      }

      // Prevent duplicate call instances during an active session.
      const existing = this.currentCall;
      if (existing && existing.state.callingState !== CallingState.LEFT) {
        throw new Error('A call is already in progress.');
      }

      // Generate unique call ID with timestamp for uniqueness
      const callId = `datemi_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Create call instance using 'default' call type
      call = this.client.call('default', callId);
      opId = this.beginCallOperation(call);
      this.callStartTime = null;
      this.resetMediaPermissionsCache();

      // Ensure permissions BEFORE creating/ringing the call.
      // This prevents silent post-create cancellation that can look like "Call didn't start"
      // on some Android devices (especially when permissions were revoked/denied).
      const permissions = await this.ensureMediaPermissions(callType);
      if (opId != null && this.isCallOperationAborted(opId)) {
        await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'cancel' } });
        return null;
      }
      if (!permissions.microphone) {
        this.lastCallError = 'Microphone permission is required for calls';
        await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'cancel' } });
        return null;
      }
      if (callType === 'video' && !permissions.camera) {
        this.lastCallError = 'Camera permission is required for video calls';
        await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'cancel' } });
        return null;
      }

      const normalizedCallerImage =
        typeof callerImageOverride === 'string' && callerImageOverride.trim().length > 0
          ? callerImageOverride.trim()
          : undefined;
      const callerImage = normalizedCallerImage || this.currentUser.image || undefined;

      // Create a "ringing" call so the callee receives incoming call events/notifications.
      // Stream Ring Calls API requires ring: true and members (including caller).
      // IMPORTANT:
      // - We set up listeners BEFORE getOrCreate() so we can't miss fast `call.accepted` events
      //   on low-latency networks / fast callees.
      // - We still do NOT store `this.currentCall` until getOrCreate succeeds so VideoCallScreen
      //   never renders <StreamCall> with a half-initialized call object.
      this.setupCallEventListeners(call);

      await call.getOrCreate({
        ring: true,
        video: callType === 'video',
        data: {
          members: [{ user_id: this.currentUser.id }, { user_id: receiverId }],
          custom: {
            type: callType,
            module: 'datemi',
            caller_id: this.currentUser.id,
            caller_name: this.currentUser.name,
            caller_image: callerImage,
            receiver_id: receiverId,
            receiver_name: receiverName,
            receiver_image: receiverImage,
          },
        } as any,
      });

      if (opId != null && this.isCallOperationAborted(opId)) {
        await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'cancel' } });
        return null;
      }

      // Call is now fully initialized -- safe to store.
      this.currentCall = call;
      if (this.pendingCallOpId === opId) {
        this.pendingCall = null;
        this.pendingCallOpId = null;
      }

      // Allow the SDK up to 30 seconds to reconnect on transient network drops
      // (per Stream best practices: Network Disruptions guide).
      try {
        call.setDisconnectionTimeout(30);
      } catch {
        // ignore - not all SDK versions support this
      }
      
      // Persist call record without blocking ringing UX.
      this.createCallRecord(callType, receiverId, call.id, call.cid).catch(() => {
        // ignore
      });

      return call;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create call';
      this.lastCallError = errorMsg;
      
      // Fire-and-forget DB update
      const failedCid = call?.cid || this.currentCall?.cid;
      if (failedCid) {
        this.updateCallStatus('failed', failedCid).catch(() => { /* ignore */ });
      }
      
      // Cleanup on error
      const callToCleanup = this.currentCall || call;
      if (callToCleanup) {
        const cs = callToCleanup.state.callingState;
        const leaveOptions =
          cs === CallingState.RINGING || cs === CallingState.IDLE ? { reject: true, reason: 'cancel' } : undefined;
        await this.finalizeCall(callToCleanup, leaveOptions ? { leaveOptions } : undefined);
      }
      
      return null;
    } finally {
      this.isCreatingCall = false;
      if (opId != null) {
        this.finishCallOperation(opId);
      }
    }
  }

  /**
   * Join an existing call (for the receiver accepting an incoming call)
   * The call should already exist from getOrCreate by the caller.
   *
   * @param callCid  Stream call CID (format: "type:id")
   * @param knownCallType  If the call type is already known (from the ringing UI / Redux),
   *                       pass it here to skip the extra `call.get()` HTTP round trip.
   *                       This significantly reduces the time from "Accept" tap to audible
   *                       connection.
   */
  async joinCall(callCid: string, knownCallType?: VideoCallType): Promise<Call | null> {
    this.lastCallError = null;
    
    if (!this.client) {
      this.lastCallError = 'Video service not initialized';
      return null;
    }

    let opId: number | null = null;

    try {
      // Stop any ringing sounds immediately when joining
      stopRingtone();

      // Parse call CID to get type and ID (format: "type:id")
      const colonIndex = callCid.indexOf(':');
      if (colonIndex === -1) {
        throw new Error('Invalid call CID format');
      }
      
      const callTypeStr = callCid.substring(0, colonIndex);
      const callId = callCid.substring(colonIndex + 1);
      
      if (!callTypeStr || !callId) {
        throw new Error('Invalid call CID');
      }
      
      // Get the call instance
      const call = this.client.call(callTypeStr, callId);
      opId = this.beginCallOperation(call);
      this.callStartTime = null;
      this.resetMediaPermissionsCache();

      // Determine call type: use the known type if provided (avoids `call.get()` round trip),
      // otherwise fall back to fetching metadata from the server.
      let isVideo: boolean;

      if (knownCallType) {
        isVideo = knownCallType === 'video';
      } else {
        // Fallback: fetch call metadata to determine required permissions.
        await call.get();

        if (opId != null && this.isCallOperationAborted(opId)) {
          await this.finalizeCall(call);
          return null;
        }

        const customType = call?.state?.custom?.type;
        isVideo = customType ? customType === 'video' : (call?.state?.settings?.video?.enabled ?? false);
      }

      // Now safe to store and set up listeners.
      this.currentCall = call;
      if (this.pendingCallOpId === opId) {
        this.pendingCall = null;
        this.pendingCallOpId = null;
      }
      this.setupCallEventListeners(call);

      if (!this.currentUser?.id) {
        this.lastCallError = 'No authenticated user available for call acceptance';
        return null;
      }

      // Run entitlement check and permission request IN PARALLEL to reduce accept latency.
      // Both are independent async operations that together add 300-2000ms sequentially.
      const resolvedCallType: VideoCallType = isVideo ? 'video' : 'audio';
      const [canAcceptCall, permissions] = await Promise.all([
        this.checkCallEntitlementCached(this.currentUser.id, resolvedCallType),
        this.ensureMediaPermissions(resolvedCallType),
      ]);

      if (opId != null && this.isCallOperationAborted(opId)) {
        await this.finalizeCall(call);
        return null;
      }

      if (!canAcceptCall) {
        this.lastCallError = isVideo
          ? 'Video Calls package ($1/month) or Premium subscription required to accept calls'
          : 'Voice Calls package ($1/month) or Premium subscription required to accept calls';
        await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'rejected' } });
        return null;
      }

      if (!permissions.microphone) {
        throw new Error('Microphone permission is required for calls');
      }

      if (isVideo && !permissions.camera) {
        throw new Error('Camera permission is required for video calls');
      }

      // Configure audio routing BEFORE joining so the microphone picks up clean audio.
      // Stream best practice: use `callManager.start()` lifecycle and stop it on leave.
      this.stopAudioRouting();
      this.startAudioRouting(resolvedCallType);

      // Join the call - this also signals acceptance to the caller
      await call.join();

      // Allow the SDK up to 30 seconds to reconnect on transient network drops
      // instead of immediately killing the call. This is per Stream best practices.
      try {
        call.setDisconnectionTimeout(30);
      } catch {
        // ignore - not all SDK versions support this
      }

      // Ensure we start publishing media immediately.
      // Run microphone + camera setup concurrently (independent operations).
      const mediaSetup: Promise<void>[] = [
        call.microphone.enable().catch(() => { /* ignore */ }),
      ];
      if (isVideo) {
        mediaSetup.push(enableCameraWithRetry(call));
      } else {
        mediaSetup.push(call.camera.disable().catch(() => { /* ignore */ }));
      }
      await Promise.all(mediaSetup);
      
      // callStartTime is set on `call.session_started`
      
      // Update call status without blocking the return
      this.updateCallStatus('accepted', callCid).catch(() => { /* ignore */ });
      
      return call;
    } catch (error) {
      this.lastCallError = error instanceof Error ? error.message : 'Failed to accept call';
      this.updateCallStatus('failed', callCid).catch(() => { /* ignore */ });
      
      // Cleanup on failure to prevent ghost sessions and leaked listeners.
      const callToCleanup = this.currentCall || this.pendingCall;
      if (callToCleanup) {
        const cs = callToCleanup.state.callingState;
        const leaveOptions =
          cs === CallingState.RINGING || cs === CallingState.IDLE ? { reject: true, reason: 'rejected' } : undefined;
        await this.finalizeCall(callToCleanup, leaveOptions ? { leaveOptions } : undefined);
      }
      stopRingtone();

      return null;
    } finally {
      if (opId != null) {
        this.finishCallOperation(opId);
      }
    }
  }

  /**
   * Reject an incoming call properly using call.leave with reject flag
   */
  async rejectIncomingCall(callCid: string, reason: string = 'rejected'): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Stop any ringing sounds immediately when rejecting
      stopRingtone();

      // Parse call CID
      const colonIndex = callCid.indexOf(':');
      if (colonIndex === -1) return;
      
      const callTypeStr = callCid.substring(0, colonIndex);
      const callId = callCid.substring(colonIndex + 1);
      
      const call = this.client.call(callTypeStr, callId);
      
      // Use leave with reject: true to properly reject the call
      // This notifies the caller that the call was rejected
      await call.leave({ reject: true, reason });
      
      await this.updateCallStatus('rejected', callCid);
    } catch {
      // Failed to reject call - continue
    }
  }

  /**
   * End current call properly with cleanup
   */
  async endCall(): Promise<void> {
    const callToEnd = this.currentCall || this.pendingCall;
    if (!callToEnd) return;

    // If create/join is still in-flight, abort it so we don't race into a joined call
    // after the user has already hung up.
    this.requestAbortActiveCallOperation();

    // Stop any ringing sounds that might still be playing
    stopRingtone();

    // Calculate duration if call was connected
    let duration: number | undefined;
    if (this.callStartTime) {
      duration = Math.floor((Date.now() - this.callStartTime.getTime()) / 1000);
    }

    // Best-effort: fire-and-forget DB updates so hangup is instant.
    // The important thing is that call.leave() happens fast.
    const cid = this.currentCall?.cid || callToEnd.cid;
    if (this.currentCall) {
      this.updateCallRecord({ status: 'ended', endTime: new Date(), duration }).catch(() => { /* ignore */ });
    }
    this.updateCallStatus('ended', cid).catch(() => { /* ignore */ });

    // Leave the call and dispose resources.
    const cs = callToEnd.state.callingState;
    const leaveOptions =
      cs === CallingState.RINGING || cs === CallingState.IDLE
        ? { reject: true, reason: callToEnd.isCreatedByMe ? 'cancel' : 'rejected' }
        : undefined;

    await this.finalizeCall(callToEnd, leaveOptions ? { leaveOptions } : undefined);
  }

  private clearCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = undefined;
    }
  }

  private resetMediaPermissionsCache(): void {
    this.mediaPermissions = null;
    this.mediaPermissionsPromise = null;
  }

  private ensureMediaPermissions(callType: VideoCallType): Promise<CallPermissions> {
    if (this.mediaPermissions) return Promise.resolve(this.mediaPermissions);

    if (!this.mediaPermissionsPromise) {
      this.mediaPermissionsPromise = (callType === 'video'
        ? requestVideoCallPermissions()
        : requestAudioCallPermissions()
      )
        .then((permissions) => {
          this.mediaPermissions = permissions;
          return permissions;
        })
        .catch((_e) => {
          void _e;
          const denied: CallPermissions = { camera: false, microphone: false };
          this.mediaPermissions = denied;
          return denied;
        })
        .finally(() => {
          this.mediaPermissionsPromise = null;
        });
    }

    return this.mediaPermissionsPromise;
  }

  /**
   * Cleanup call event listeners to prevent memory leaks
   */
  private cleanupCallEventListeners(): void {
    for (const unsubscribe of this.callEventUnsubscribers) {
      try {
        unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.callEventUnsubscribers = [];
  }

  /**
   * Reject incoming call (legacy method - use rejectIncomingCall for proper rejection)
   */
  async rejectCall(callCid: string): Promise<void> {
    await this.rejectIncomingCall(callCid);
  }

  /**
   * Toggle camera on/off
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.currentCall) return false;

    try {
      await this.currentCall.camera.toggle();
      // Access camera status through the SDK's type system
      const cameraStatus = this.currentCall.camera.enabled ?? false;
      return cameraStatus;
    } catch {
      // Failed to toggle camera
      return false;
    }
  }

  /**
   * Toggle microphone on/off
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.currentCall) return false;

    try {
      await this.currentCall.microphone.toggle();
      // Access microphone status through the SDK's type system
      const microphoneStatus = this.currentCall.microphone.enabled ?? false;
      return microphoneStatus;
    } catch {
      // Failed to toggle microphone
      return false;
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (!this.currentCall) return;

    try {
      await this.currentCall.camera.flip();
    } catch {
      // Failed to flip camera - continue
    }
  }

  /**
   * Get current call state
   */
  getCallState(): CallingState | null {
    return this.currentCall?.state?.callingState ?? null;
  }

  /**
   * Create call record in Supabase
   */
  private async createCallRecord(
    type: VideoCallType,
    receiverId: string,
    streamCallId: string,
    streamCallCid: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('calls')
        .insert({
          caller_id: this.currentUser?.id ?? null,
          receiver_id: receiverId,
          type,
          stream_call_id: streamCallId,
          stream_call_cid: streamCallCid,
          status: 'initiated',
        });

      if (error) {
        // Failed to create call record - log but don't throw
      }
    } catch {
      // Failed to create call record - continue
    }
  }

  /**
   * Update call record in Supabase
   */
  private async updateCallRecord(updates: {
    status?: CallStatus;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
  }): Promise<void> {
    if (!this.currentCall) return;

    try {
      const updateData: {
        status?: CallStatus;
        start_time?: string;
        end_time?: string;
        duration_seconds?: number;
      } = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
      if (updates.duration !== undefined) updateData.duration_seconds = updates.duration;

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('stream_call_id', this.currentCall.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // Failed to update call record - log but don't throw
      }
    } catch {
      // Failed to update call record - continue
    }
  }

  /**
   * Update call status
   */
  private async updateCallStatus(status: CallStatus, callCid?: string): Promise<void> {
    try {
      const identifier = callCid || this.currentCall?.cid;
      if (!identifier) return;

      const { error } = await supabase
        .from('calls')
        .update({ status })
        .eq('stream_call_cid', identifier)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // Failed to update call status - log but don't throw
      }
    } catch {
      // Failed to update call status - continue
    }
  }

  /**
   * Set up call-specific event listeners with proper cleanup tracking
   */
  private setupCallEventListeners(call: Call): void {
    // Clear any existing listeners first
    this.cleanupCallEventListeners();

    // If the peer briefly disconnects (network / background / app restart),
    // Stream may emit `call.session_participant_left` with a reason that isn't an intentional hangup.
    // DateMi is 1:1, so we *do* want to auto-exit when the peer hangs up, but we must avoid
    // tearing down the call instantly on transient disconnects.
    let peerLeftFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
    const clearPeerLeftFinalizeTimer = () => {
      if (peerLeftFinalizeTimer) {
        clearTimeout(peerLeftFinalizeTimer);
        peerLeftFinalizeTimer = null;
      }
    };
    this.callEventUnsubscribers.push(clearPeerLeftFinalizeTimer);

    // Ringing lifecycle:
    // - Session starts when first participant joins (`call.session_started`)
    // - Caller should auto-join when first callee accepts (session starts)
    let callerJoinInProgress = false;
    let callerJoinAttempts = 0;
    const MAX_CALLER_JOIN_ATTEMPTS = 4;
    // Use shorter retry delays (200ms base) so the caller joins faster after callee accepts.
    const CALLER_JOIN_RETRY_BASE_MS = 200;

    const joinCallerIfNeeded = async () => {
      if (!call.isCreatedByMe) return;

      const cs = call.state.callingState;
      if (cs === CallingState.JOINED || cs === CallingState.JOINING) return;
      if (cs === CallingState.LEFT) return;

      // Prevent concurrent join attempts (session_started + accepted can fire close together).
      if (callerJoinInProgress) return;
      if (callerJoinAttempts >= MAX_CALLER_JOIN_ATTEMPTS) return;

      try {
        callerJoinInProgress = true;
        callerJoinAttempts += 1;

        // IMPORTANT: Determine call type from our custom data (always set in createCall),
        // NOT from call.state.settings?.video?.enabled. The 'default' Stream call type
        // has video enabled in settings even for audio-only calls, which would incorrectly
        // require camera permission and cause the caller to leave the call.
        const customType = call.state.custom?.type;
        const isVideo = customType ? customType === 'video' : (call.state.settings?.video?.enabled ?? false);
        const permissions = await this.ensureMediaPermissions(isVideo ? 'video' : 'audio');
        const missingMicrophone = !permissions.microphone;
        const missingCamera = isVideo && !permissions.camera;
        if (missingMicrophone || missingCamera) {
          await this.finalizeCall(call, { leaveOptions: { reject: true, reason: 'cancel' } });
          return;
        }

        // Configure audio routing BEFORE joining for clean audio.
        this.stopAudioRouting();
        this.startAudioRouting(isVideo ? 'video' : 'audio');

        await call.join();

        // Allow the SDK up to 30 seconds to reconnect on transient network drops.
        try {
          call.setDisconnectionTimeout(30);
        } catch {
          // ignore - not all SDK versions support this
        }

        // Enable microphone + camera concurrently (independent device operations).
        const mediaSetup: Promise<void>[] = [
          call.microphone.enable().catch(() => { /* ignore */ }),
        ];
        if (isVideo) {
          mediaSetup.push(enableCameraWithRetry(call));
        } else {
          mediaSetup.push(call.camera.disable().catch(() => { /* ignore */ }));
        }
        await Promise.all(mediaSetup);
      } catch (e) {
        // Join errors can happen if acceptance is very fast and local call state isn't fully hydrated yet.
        // Retry briefly to avoid "callee accepted but caller never joined" deadlocks.
        const message = e instanceof Error ? e.message : String(e);
        this.lastCallError = message;

        const currentState = call.state.callingState;
        const canRetry =
          currentState !== CallingState.LEFT &&
          currentState !== CallingState.JOINED &&
          callerJoinAttempts < MAX_CALLER_JOIN_ATTEMPTS;
        if (canRetry) {
          setTimeout(() => {
            void joinCallerIfNeeded();
          }, CALLER_JOIN_RETRY_BASE_MS * callerJoinAttempts);
        }
      } finally {
        callerJoinInProgress = false;
      }
    };

    const unsubSessionStarted = call.on('call.session_started', () => {
      // Stop any ringing sounds when session starts (call connected)
      stopRingtone();

      // Mark start time once per session
      if (!this.callStartTime) {
        this.callStartTime = new Date();
        this.updateCallRecord({
          status: 'accepted',
          startTime: this.callStartTime,
        }).catch(() => {
          // ignore
        });
        this.startCallTimer();
      }

      // Auto-join for caller when first callee accepts (session starts)
      void joinCallerIfNeeded();
    });
    this.callEventUnsubscribers.push(unsubSessionStarted);

    // Also attempt to join as soon as a callee accepts (extra robustness).
    // Some call state updates/events may arrive before `call.session_started` is observed.
    const unsubAccepted = call.on('call.accepted', () => {
      // Stop ringing immediately when callee accepts
      stopRingtone();
      void joinCallerIfNeeded();
    });
    this.callEventUnsubscribers.push(unsubAccepted);

    // Call rejected - when callee rejects
    const unsubRejected = call.on('call.rejected', (event: any) => {
      // If the call is already JOINED (active), ignore stale rejection events.
      // This can happen during WS reconnection where the SDK replays old events.
      if (call.state.callingState === CallingState.JOINED) return;

      // Stop any ringing sounds when call is rejected
      stopRingtone();

      // Only finalize (cleanup) when the ringing flow ends:
      // Stream SDKs will emit a rejection from the caller with reason "cancel" or "timeout"
      // once all callees reject / timeout.
      const reason: string | undefined =
        (event && typeof event === 'object' && typeof event.reason === 'string' ? event.reason : undefined) ||
        (event && typeof event === 'object' && typeof event.rejection_reason === 'string'
          ? event.rejection_reason
          : undefined);
      const rejectedByUserId: string | undefined =
        (event &&
        typeof event === 'object' &&
        event.user &&
        typeof event.user === 'object' &&
        typeof event.user.id === 'string'
          ? event.user.id
          : undefined) ||
        (event && typeof event === 'object' && typeof event.user_id === 'string'
          ? event.user_id
          : undefined);
      const isRejectedByMe = !!rejectedByUserId && rejectedByUserId === this.currentUserId;

      // Always update DB status.
      this.updateCallStatus('rejected', call.cid).catch(() => {
        // ignore
      });

      // Per Stream Ring Calls docs:
      // - Callees can reject with `rejected` / `timeout` (incoming timeout).
      // - Caller will eventually reject with `cancel` (all callees rejected) or `timeout` (auto-cancel).
      // We only teardown the call object when the ringing flow truly ends.
      const custom = call.state?.custom as any;
      const isDateMiCall = custom?.module === 'datemi';
      const shouldCleanup =
        isDateMiCall ||
        reason === 'cancel' ||
        reason === 'rejected' ||
        reason === 'busy' ||
        (reason === 'timeout' && (call.isCreatedByMe ? isRejectedByMe : !isRejectedByMe)) ||
        !reason;
      if (shouldCleanup) {
        void this.finalizeCall(call);
      }
    });
    this.callEventUnsubscribers.push(unsubRejected);

    // Call ended - when either party ends the call
    const unsubEnded = call.on('call.ended', () => {
      // Stop any ringing sounds when call ends
      stopRingtone();
      clearPeerLeftFinalizeTimer();

      const doFinalize = () => {
        // Double-check: if the call recovered and is back in JOINED, skip finalization.
        const currentCs = call.state.callingState;
        if (currentCs === CallingState.LEFT) return; // already cleaned up elsewhere
        if (currentCs === CallingState.JOINED) return; // SDK recovered -- call is alive

        const duration =
          this.callStartTime ? Math.floor((Date.now() - this.callStartTime.getTime()) / 1000) : undefined;
        this.updateCallRecord({ status: 'ended', endTime: new Date(), duration }).catch(() => { /* ignore */ });
        this.updateCallStatus('ended', call.cid).catch(() => { /* ignore */ });
        void this.finalizeCall(call);
      };

      // DEFENSIVE (Feb 2026):
      // If the SDK is in a recovery state (RECONNECTING / MIGRATING / OFFLINE),
      // the 'call.ended' event may be a stale artifact from a dropped WebSocket
      // (code 1006). The server may not have actually ended the call -- the SDK
      // just lost the connection briefly.
      // Defer finalization to give the SDK time to reconnect.
      const cs = call.state.callingState;
      const isRecovering =
        cs === CallingState.RECONNECTING ||
        cs === CallingState.MIGRATING ||
        cs === CallingState.OFFLINE;

      if (isRecovering) {
        setTimeout(doFinalize, 8_000);
      } else {
        doFinalize();
      }
    });
    this.callEventUnsubscribers.push(unsubEnded);

    // Call session ended (all participants have left)
    const unsubSessionEnded = call.on('call.session_ended', () => {
      // Stop any ringing sounds when session ends
      stopRingtone();
      clearPeerLeftFinalizeTimer();

      const doFinalize = () => {
        const currentCs = call.state.callingState;
        if (currentCs === CallingState.LEFT) return;
        if (currentCs === CallingState.JOINED) return; // SDK recovered

        const duration =
          this.callStartTime ? Math.floor((Date.now() - this.callStartTime.getTime()) / 1000) : undefined;
        this.updateCallRecord({ status: 'ended', endTime: new Date(), duration }).catch(() => { /* ignore */ });
        this.updateCallStatus('ended', call.cid).catch(() => { /* ignore */ });
        void this.finalizeCall(call);
      };

      // Same recovery-state guard as call.ended: a WS 1006 can cause the SDK
      // to emit session_ended even though both participants intend to stay.
      const cs = call.state.callingState;
      const isRecovering =
        cs === CallingState.RECONNECTING ||
        cs === CallingState.MIGRATING ||
        cs === CallingState.OFFLINE;

      if (isRecovering) {
        setTimeout(doFinalize, 8_000);
      } else {
        doFinalize();
      }
    });
    this.callEventUnsubscribers.push(unsubSessionEnded);

    // Handle call missed (timeout without answer)
    const unsubMissed = call.on('call.missed', () => {
      // If the call is already JOINED (active), ignore stale missed events.
      // This can happen during WS reconnection where the SDK replays old events.
      if (call.state.callingState === CallingState.JOINED) return;

      // Stop any ringing sounds when call is missed
      stopRingtone();

      this.updateCallStatus('missed', call.cid);
      this.updateCallRecord({
        status: 'missed',
        endTime: new Date(),
      }).catch(() => {
        // ignore
      });

      // DateMi badge: increment missed calls for the receiver only.
      // The caller may also receive a call.missed event, but they didn't miss the call.
      try {
        const custom = call.state?.custom as any;
        const receiverId = custom?.receiver_id as string | undefined;
        if (receiverId && this.currentUserId && receiverId === this.currentUserId) {
          dateMiNotificationManager.recordLocalMissedCall(call.cid);
        }
      } catch {
        // ignore
      }
      void this.finalizeCall(call);
    });
    this.callEventUnsubscribers.push(unsubMissed);

    // If the peer joins back after a transient disconnect, cancel any pending auto-exit.
    const unsubSessionParticipantJoined = call.on('call.session_participant_joined', (event: any) => {
      const joinedUserId =
        event?.participant?.user?.id ||
        event?.participant?.user_id ||
        event?.participant?.userId ||
        event?.participant?.user?.user_id;
      if (!joinedUserId || joinedUserId === this.currentUserId) return;
      clearPeerLeftFinalizeTimer();
    });
    this.callEventUnsubscribers.push(unsubSessionParticipantJoined);

    // Handle remote participant leaving (1:1 call auto-end).
    // When the other party hangs up via call.leave(), we don't receive call.ended -
    // only call.session_participant_left. In a 1:1 call we must also leave so both
    // users navigate back to their previous screen.
    //
    // CRITICAL FIX (Feb 2026):
    // The event.reason field is unreliable across SDK versions and platforms.
    // Stream may fire this event with an empty/unrecognized reason even for
    // transient network drops (e.g., WebSocket close code 1006). Previously
    // we used 800ms for "non-transient" reasons, which caused calls to
    // terminate within seconds on brief network glitches -- even though
    // setDisconnectionTimeout(30) gives the SDK 30 seconds to reconnect.
    //
    // Fix: use a generous initial grace period (10s) for ALL reasons, and
    // extend up to 45s if the SDK is still in a recovery state.
    const unsubParticipantLeft = call.on('call.session_participant_left', (event: any) => {
      const leftUserId =
        event?.participant?.user?.id ||
        event?.participant?.user_id;

      // Only act when the OTHER party leaves (not our own leave echo)
      if (!leftUserId || leftUserId === this.currentUserId) return;

      // DateMi is a 1:1 experience. When the peer leaves, we also leave so the other device
      // exits immediately and we never keep publishing/playing audio/video in the background.
      const custom = call.state?.custom as any;
      const isDateMiCall = custom?.module === 'datemi';
      if (!isDateMiCall) return;

      // If a new participant joins while this timer is pending, do not auto-exit.
      clearPeerLeftFinalizeTimer();

      // Always stop any ringing UI immediately (safety).
      stopRingtone();

      // Use a generous grace period for ALL participant_left events.
      // This matches the SDK's reconnection window (setDisconnectionTimeout(30))
      // and prevents premature call termination on brief network glitches.
      const PEER_LEFT_INITIAL_GRACE_MS = 10_000;
      const PEER_LEFT_RECOVERY_EXTENSION_MS = 10_000;
      const PEER_LEFT_MAX_TOTAL_WAIT_MS = 45_000;
      const peerLeftTimestamp = Date.now();

      const attemptFinalize = () => {
        peerLeftFinalizeTimer = null;

        // If the call already left / was replaced, do nothing.
        if (call.state.callingState === CallingState.LEFT) return;

        // If the peer re-joined, do nothing.
        const participants = call.state.participants ?? [];
        const remoteCount = participants.filter((p) => {
          const isLocal = (p as any)?.isLocalParticipant === true;
          const userId = (p as any)?.userId as string | undefined;
          if (isLocal) return false;
          if (this.currentUserId && userId && userId === this.currentUserId) return false;
          return true;
        }).length;
        if (remoteCount > 0) return;

        // If the SDK is still trying to reconnect, extend the grace period
        // instead of killing the call. The SDK may still recover.
        const currentCallingState = call.state.callingState;
        const isRecovering =
          currentCallingState === CallingState.RECONNECTING ||
          currentCallingState === CallingState.MIGRATING ||
          currentCallingState === CallingState.OFFLINE;
        const elapsed = Date.now() - peerLeftTimestamp;

        if (isRecovering && elapsed < PEER_LEFT_MAX_TOTAL_WAIT_MS) {
          // Reschedule: the SDK is still recovering, give it more time.
          peerLeftFinalizeTimer = setTimeout(attemptFinalize, PEER_LEFT_RECOVERY_EXTENSION_MS);
          return;
        }

        // Grace period exhausted (or SDK is not recovering). End the call.
        const duration = this.callStartTime
          ? Math.floor((Date.now() - this.callStartTime.getTime()) / 1000)
          : undefined;

        this.updateCallRecord({
          status: 'ended',
          endTime: new Date(),
          duration,
        }).catch(() => {
          // ignore
        });
        this.updateCallStatus('ended', call.cid).catch(() => {
          // ignore
        });

        void this.finalizeCall(call);
      };

      peerLeftFinalizeTimer = setTimeout(attemptFinalize, PEER_LEFT_INITIAL_GRACE_MS);
    });
    this.callEventUnsubscribers.push(unsubParticipantLeft);
  }

  /**
   * Start timer to track call duration
   */
  private startCallTimer(): void {
    // Update timer every second
    this.callTimer = setInterval(() => {
      // Timer logic can be used for UI updates
      // Duration is calculated when call ends
    }, 1000);
  }

  /**
   * Get call history for current user
   */
  async getCallHistory(limit: number = 20): Promise<VideoCallSession[]> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Failed to fetch call history
        return [];
      }

      return (data ?? [])
        .filter((call) => !!call.caller_id && !!call.receiver_id)
        .map((call) => ({
          id: call.id,
          callerId: call.caller_id!,
          receiverId: call.receiver_id!,
          type: call.type as VideoCallType,
          streamCallId: call.stream_call_id,
          streamCallCid: call.stream_call_cid,
          status: call.status as CallStatus,
          startTime: call.start_time ? new Date(call.start_time) : undefined,
          endTime: call.end_time ? new Date(call.end_time) : undefined,
          duration: call.duration_seconds ?? undefined,
        }));
    } catch {
      // Failed to get call history
      return [];
    }
  }

  /**
   * Clean up and disconnect from Stream Video
   */
  async disconnect(): Promise<void> {
    try {
      // End any active call first
      if (this.currentCall || this.pendingCall) {
        await this.endCall();
      }

      // Clear call event listeners
      this.cleanupCallEventListeners();

      // Clear timer
      this.clearCallTimer();

      // Ensure audio routing is fully stopped
      this.stopAudioRouting();

      // Disconnect from Stream Video
      if (this.client) {
        await this.client.disconnectUser();
        this.client = null;
      }

      // Clear all state
      this.currentUser = null;
      this.currentUserId = null;
      this.clientApiKey = null;
      this.currentCall = null;
      this.callStartTime = null;
      this.tokenCache = null;
      this.resetMediaPermissionsCache();
      this.callEntitlements = { audio: null, video: null };
      this.lastInitError = null;
      this.lastCallError = null;
    } catch (error) {
      // Force cleanup on error
      this.client = null;
      this.currentUser = null;
      this.currentUserId = null;
      this.currentCall = null;
      this.callStartTime = null;
      this.resetMediaPermissionsCache();
      this.callEntitlements = { audio: null, video: null };
      this.stopAudioRouting();
    }
  }

  /**
   * Get current call instance
   */
  getCurrentCall(): Call | null {
    return this.currentCall;
  }

  /**
   * Get Stream Video client instance
   */
  getClient(): StreamVideoClient | null {
    return this.client;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.currentUser !== null;
  }

  private beginCallOperation(call: Call): number {
    const opId = this.nextCallOpId;
    this.nextCallOpId += 1;
    this.activeCallOpId = opId;
    this.abortedCallOpId = null;
    this.pendingCall = call;
    this.pendingCallOpId = opId;
    return opId;
  }

  private isCallOperationAborted(opId: number): boolean {
    return this.abortedCallOpId === opId;
  }

  private finishCallOperation(opId: number): void {
    if (this.pendingCallOpId === opId) {
      this.pendingCall = null;
      this.pendingCallOpId = null;
    }
    if (this.activeCallOpId === opId) {
      this.activeCallOpId = null;
    }
    if (this.abortedCallOpId === opId) {
      this.abortedCallOpId = null;
    }
  }

  private requestAbortActiveCallOperation(): void {
    if (this.activeCallOpId == null) return;
    this.abortedCallOpId = this.activeCallOpId;
  }

  private startAudioRouting(callType: VideoCallType): void {
    try {
      callManager.start({
        audioRole: 'communicator',
        deviceEndpointType: callType === 'video' ? 'speaker' : 'earpiece',
      });
    } catch {
      // ignore
    }
  }

  private stopAudioRouting(): void {
    try {
      callManager.stop();
    } catch {
      // ignore
    }

    // Best-effort fallback cleanup for legacy routing.
    try {
      InCallManager.stop();
    } catch {
      // ignore
    }
  }

  private async finalizeCall(call: Call, options?: { leaveOptions?: any }): Promise<void> {
    const cid = call.cid;
    if (this.finalizeCallPromise && this.finalizingCallCid === cid) {
      return this.finalizeCallPromise;
    }

    this.finalizingCallCid = cid;
    this.finalizeCallPromise = (async () => {
      stopRingtone();
      this.clearCallTimer();

      // Stop audio routing as early as possible to prevent ghost audio.
      this.stopAudioRouting();

      try {
        const cs = call.state.callingState;
        if (cs !== CallingState.LEFT) {
          if (options?.leaveOptions) {
            await call.leave(options.leaveOptions);
          } else {
            await call.leave();
          }
        }
      } catch {
        // ignore
      }

      // Ensure everything is stopped even if leave failed.
      this.stopAudioRouting();

      // Important: remove listeners and clear state AFTER leaving.
      this.cleanupCallEventListeners();
      this.resetMediaPermissionsCache();
      this.callStartTime = null;

      if (this.currentCall === call) {
        this.currentCall = null;
      }
      if (this.pendingCall === call) {
        this.pendingCall = null;
        this.pendingCallOpId = null;
      }
    })().finally(() => {
      this.finalizeCallPromise = null;
      this.finalizingCallCid = null;
    });

    return this.finalizeCallPromise;
  }
}

let instance: StreamVideoService | null = null;
function getInstance(): StreamVideoService {
  if (!instance) instance = new StreamVideoService();
  return instance;
}

export const streamVideoService = new Proxy({} as StreamVideoService, {
  get(target, prop) {
    try {
      const service = getInstance();
      const value = (service as any)[prop];
      return typeof value === 'function' ? value.bind(service) : value;
    } catch (error) {
      // APK crash prevention: If Stream Video fails, return safe defaults
      if (typeof console !== 'undefined' && console.error) {
        console.error('[StreamVideo] Failed to access property:', prop, error);
      }
      return typeof prop === 'string' && prop !== 'constructor'
        ? async () => Promise.resolve(null)
        : undefined;
    }
  }
});

export { StreamVideoService };
