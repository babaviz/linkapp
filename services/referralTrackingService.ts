import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import referralService from './referralService';
import NotificationService from './notificationService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface PendingReferral {
  code: string;
  capturedAt: string;
  source: 'deeplink' | 'web' | 'manual' | 'install_referrer';
}

class ReferralTrackingService {
  private static instance: ReferralTrackingService;
  private subscription: { remove: () => void } | null = null;
  private readonly storageKey = 'linkapp_pending_referral_code';
  private readonly installReferrerCapturedKey = 'linkapp_install_referrer_captured_v1';
  private readonly installReferrerAttemptsKey = 'linkapp_install_referrer_attempts_v1';
  private readonly installFingerprintKey = 'linkapp_install_fingerprint_v1';

  static getInstance(): ReferralTrackingService {
    if (!ReferralTrackingService.instance) {
      ReferralTrackingService.instance = new ReferralTrackingService();
    }
    return ReferralTrackingService.instance;
  }

  private sanitizeReferralCode(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/[A-Za-z0-9]{4,32}/);
    return match ? match[0].toUpperCase() : null;
  }

  async captureReferralCode(code: string, source: PendingReferral['source']): Promise<void> {
    const sanitized = this.sanitizeReferralCode(code);
    if (!sanitized) return;

    const pending: PendingReferral = {
      code: sanitized,
      capturedAt: new Date().toISOString(),
      source,
    };

    await AsyncStorage.setItem(this.storageKey, JSON.stringify(pending));
  }

  private parseInstallReferrerString(installReferrer: string): string | null {
    try {
      const parts = installReferrer.split('&');
      const map: Record<string, string> = {};
      for (const part of parts) {
        if (!part) continue;
        const [rawKey, rawValue] = part.split('=');
        if (!rawKey) continue;
        const key = decodeURIComponent(rawKey);
        const value = decodeURIComponent(rawValue || '');
        map[key] = value;
      }
      const candidate =
        map.referral_code || map.code || map.linkapp_referral_code || map.linkapp_referral || map.r;
      return this.sanitizeReferralCode(candidate);
    } catch {
      return null;
    }
  }

  private async captureInstallReferrerIfAvailable(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const alreadyCaptured = await AsyncStorage.getItem(this.installReferrerCapturedKey);
      if (alreadyCaptured === 'true') return;

      const attemptsRaw = await AsyncStorage.getItem(this.installReferrerAttemptsKey);
      const attempts = Math.max(0, Number.parseInt(attemptsRaw || '0', 10) || 0);
      if (attempts >= 3) return;
      await AsyncStorage.setItem(this.installReferrerAttemptsKey, String(attempts + 1));

      // Lazy-require to avoid crashing if the native module isn't available in some builds.
      let PlayInstallReferrer: any = null;
      try {
        PlayInstallReferrer = require('react-native-play-install-referrer').PlayInstallReferrer;
      } catch {
        PlayInstallReferrer = null;
      }

      if (!PlayInstallReferrer?.getInstallReferrerInfo) return;

      const { installReferrer, error } = await new Promise<{
        installReferrer: string | null;
        error: unknown | null;
      }>((resolve) => {
        try {
          PlayInstallReferrer.getInstallReferrerInfo((info: any, err: any) => {
            resolve({
              installReferrer: typeof info?.installReferrer === 'string' ? info.installReferrer : null,
              error: err || null,
            });
          });
        } catch (e) {
          resolve({ installReferrer: null, error: e });
        }
      });

      // Mark as captured once we can talk to the API (even if there's no referral code).
      // This prevents repeated reads on every boot.
      if (!error) {
        await AsyncStorage.setItem(this.installReferrerCapturedKey, 'true');
      }

      if (!installReferrer) return;
      const code = this.parseInstallReferrerString(installReferrer);
      if (!code) return;

      // Don’t overwrite an already-captured pending referral.
      const existing = await this.getPendingReferral();
      if (existing?.code) return;

      await this.captureReferralCode(code, 'install_referrer');
    } catch {
      // Non-blocking: attribution best effort.
    }
  }

  async initialize(): Promise<void> {
    if (this.subscription) return;

    // Android deferred attribution (Play Install Referrer)
    await this.captureInstallReferrerIfAvailable();

    // Handle initial URL
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      await this.handleIncomingUrl(initialUrl);
    }

    // Subscribe to future URLs
    this.subscription = Linking.addEventListener('url', async (event) => {
      await this.handleIncomingUrl(event.url);
    }) as any;
  }

  dispose() {
    this.subscription?.remove?.();
    this.subscription = null;
  }

  async handleIncomingUrl(url: string) {
    const code = referralService.parseReferralLink(url);
    if (code) {
      const isDeepLink = url.startsWith('linkapp://') || url.startsWith('exp+linkapp://');
      await this.captureReferralCode(code, isDeepLink ? 'deeplink' : 'web');
    }
  }

  async getPendingReferral(): Promise<PendingReferral | null> {
    const raw = await AsyncStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingReferral;
    } catch (error) {
      // Failed to parse pending referral data
      return null;
    }
  }

  async clearPendingReferral(): Promise<void> {
    await AsyncStorage.removeItem(this.storageKey);
  }

  async getOrCreateInstallFingerprint(): Promise<string> {
    // Best-effort stable identifier per app install (used for referral anti-abuse).
    // Prefer SecureStore when available; always fall back to AsyncStorage.
    let SecureStore: any = null;
    try {
      SecureStore = require('expo-secure-store');
    } catch {
      SecureStore = null;
    }

    try {
      if (SecureStore?.getItemAsync) {
        const existing = await SecureStore.getItemAsync(this.installFingerprintKey);
        if (typeof existing === 'string' && existing.trim().length > 0) {
          return existing;
        }
      }
    } catch {
      // ignore
    }

    try {
      const existing = await AsyncStorage.getItem(this.installFingerprintKey);
      if (typeof existing === 'string' && existing.trim().length > 0) {
        return existing;
      }
    } catch {
      // ignore
    }

    const generated =
      typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
        ? (crypto as any).randomUUID()
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    // Store best-effort; never block signup on persistence issues.
    try {
      if (SecureStore?.setItemAsync) {
        await SecureStore.setItemAsync(this.installFingerprintKey, generated);
      }
    } catch {
      // ignore
    }
    try {
      await AsyncStorage.setItem(this.installFingerprintKey, generated);
    } catch {
      // ignore
    }

    return generated;
  }

  async applyPendingReferralOnSignup(newUserId: string): Promise<{ success: boolean; error?: any }>{
    const pending = await this.getPendingReferral();
    if (!pending) return { success: true };
    const res = await referralService.recordReferral(pending.code, newUserId);
    if (res.success) {
      await this.clearPendingReferral();
    }
    return res;
  }

  async onEmailVerified(userId: string) {
    await referralService.updateReferralStatus(userId, 'verified');
  }

  async onReferralCompleted(userId: string) {
    const result = await referralService.updateReferralStatus(userId, 'completed');
    if (result.success && result.rewardGranted) {
      const data = result as any;
      const milestone = data.milestone_reached;
      const amount = data.reward_amount;
      
      try {
        await NotificationService.sendLocalNotification({
          title: 'Cash Reward Milestone Reached! 🎉',
          body: `You've referred ${milestone} users! Ksh ${amount.toLocaleString()} reward notification sent to admin.`,
          data: { type: 'referral_reward', milestone, amount },
          categoryId: 'system',
        } as any);
      } catch (error) {
        // Non-critical: notification failed
      }
    }
  }

  subscribeToReferralStats(
    userId: string,
    onUpdate: (payload: any) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      return () => {};
    }
    const channel = supabase
      .channel(`referral_stats_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referral_statistics', filter: `user_id=eq.${userId}` },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    return () => channel.unsubscribe();
  }
}

let instance: ReferralTrackingService | null = null;
const handler: ProxyHandler<ReferralTrackingService> = {
  get(target, prop) {
    if (!instance) instance = ReferralTrackingService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as ReferralTrackingService, handler);
