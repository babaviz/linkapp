import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ENV } from '../config/environment';

export interface ReferralCode {
  id: string;
  userId: string;
  referralCode: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  status: 'pending' | 'registered' | 'verified' | 'completed';
  registeredAt?: string;
  verifiedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReferralProgress {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  currentBatchProgress: number;
  nextMilestone: number;
  referralsUntilReward: number;
  totalRewardsEarned: number;
  totalCashRewardsKsh: number;
  hasActivePremium: boolean; // Deprecated - kept for backwards compatibility
  premiumStartDate?: string; // Deprecated
  premiumEndDate?: string; // Deprecated
}

export interface ReferralStatistics {
  userId: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  totalCashRewardsKsh: number;
  currentBatchProgress: number;
  lastRewardAt?: string;
  nextMilestone: number;
  nextCashMilestone: number;
}

export interface ReferralRewardNotification {
  id: string;
  userId: string;
  referralCount: number;
  rewardAmount: number;
  milestone: 200 | 2000;
  status: 'pending' | 'notified' | 'processed' | 'paid';
  createdAt: string;
  notifiedAt?: string;
  processedAt?: string;
  paidAt?: string;
  adminNotes?: string;
  paymentReference?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ReferralService {
  private isValidUuid(value: string | undefined): boolean {
    return !!value && UUID_REGEX.test(value);
  }

  private getWebAppBaseUrl(): string {
    const raw = typeof ENV?.APP_URL === 'string' && ENV.APP_URL.trim().length > 0 ? ENV.APP_URL : 'https://link-app.co';
    return raw.replace(/\/+$/, '');
  }

  private sanitizeReferralCode(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    // Keep only a safe alphanumeric code segment.
    const match = trimmed.match(/[A-Za-z0-9]{4,32}/);
    return match ? match[0].toUpperCase() : null;
  }

  /**
   * Get or create referral code for a user
   */
  async getUserReferralCode(userId: string): Promise<{ data: string | null; error: any }> {
    try {
      if (!this.isValidUuid(userId)) {
        return { data: null, error: new Error('Invalid user id') };
      }

      // Dev/misconfig fallback only (avoid fabricating codes in production).
      if (!isSupabaseConfigured()) {
        return { data: `DEMO${userId.substring(0, 4).toUpperCase()}`, error: null };
      }

      // Read-only: codes are created server-side by `handle_new_user()`.
      const { data: existingCode, error: fetchError } = await supabase
        .from('user_referral_codes')
        .select('referral_code')
        .eq('user_id', userId)
        .single();

      // PGRST116: no rows (code missing) – surface as "no data" so UI can retry/show support message.
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { data: null, error: null };
        }
        throw fetchError;
      }

      if (existingCode) {
        return { data: existingCode.referral_code, error: null };
      }

      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Generate device fingerprint for fraud prevention
   */
  private async generateDeviceFingerprint(): Promise<string> {
    try {
      const deviceInfo = {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
        deviceName: Device.deviceName,
        installationId: Constants.sessionId,
      };

      const fingerprintString = JSON.stringify(deviceInfo);
      const fingerprint = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );

      return fingerprint;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get device info for fraud tracking
   */
  private async getDeviceInfo() {
    return {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platform: Platform.OS,
      deviceYearClass: Device.deviceYearClass,
      isDevice: Device.isDevice,
    };
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode: string): Promise<{ 
    isValid: boolean; 
    referrerId?: string; 
    error?: any 
  }> {
    try {
      if (!isSupabaseConfigured()) {
        return { isValid: false, error: new Error('Referral validation is temporarily unavailable') };
      }

      const { data, error } = await supabase
        .from('user_referral_codes')
        .select('user_id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (error || !data) {
        return { isValid: false, error: error || new Error('Invalid referral code') };
      }

      return { isValid: true, referrerId: data.user_id };
    } catch (error: any) {
      return { isValid: false, error };
    }
  }

  /**
   * Record a new referral (called when user signs up with a referral code)
   */
  async recordReferral(
    referralCode: string,
    newUserId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(newUserId)) {
        return { success: true };
      }

      // Validate referral code and get referrer
      const validation = await this.validateReferralCode(referralCode);
      if (!validation.isValid || !validation.referrerId) {
        return { success: false, error: new Error('Invalid referral code') };
      }

      // Prevent self-referral
      if (validation.referrerId === newUserId) {
        return { success: false, error: new Error('Cannot refer yourself') };
      }

      // Get device fingerprint and info for fraud prevention
      const deviceFingerprint = await this.generateDeviceFingerprint();
      const deviceInfo = await this.getDeviceInfo();

      // Check if this device has been used before (fraud prevention)
      const { data: existingReferrals, error: checkError } = await supabase
        .from('referrals')
        .select('id')
        .eq('install_fingerprint', deviceFingerprint)
        .limit(1);

      if (checkError) throw checkError;

      // Insert referral record
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: validation.referrerId,
          referred_user_id: newUserId,
          referral_code: referralCode.toUpperCase(),
          status: 'registered',
          registered_at: new Date().toISOString(),
          install_fingerprint: deviceFingerprint,
          device_info: deviceInfo,
        });

      if (insertError) {
        // Check if it's a duplicate referral
        if (insertError.message.includes('unique_referred_user')) {
          return { success: false, error: new Error('User has already been referred') };
        }
        throw insertError;
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Update referral status (called after email verification)
   */
  async updateReferralStatus(
    userId: string,
    status: 'verified' | 'completed'
  ): Promise<{ success: boolean; rewardGranted?: boolean; error?: any }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(userId)) {
        return { success: true, rewardGranted: false };
      }

      // Call database function to update status and check for rewards
      const { data, error } = await supabase
        .rpc('update_referral_status', {
          referred_user_id_param: userId,
          new_status: status
        });

      if (error) throw error;

      return {
        success: (data as any)?.success || true,
        rewardGranted: (data as any)?.reward_granted || false
      };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Get user's referral progress
   */
  async getReferralProgress(userId: string): Promise<{ 
    data: ReferralProgress | null; 
    error?: any 
  }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(userId)) {
        return {
          data: {
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            currentBatchProgress: 0,
            nextMilestone: 10,
            referralsUntilReward: 10,
            totalRewardsEarned: 0,
            totalCashRewardsKsh: 0,
            hasActivePremium: false,
          },
          error: null
        };
      }

      const { data, error } = await supabase
        .rpc('get_referral_progress', { user_id_param: userId });

      if (error) throw error;

      const raw = (data || {}) as any;
      const mapped: ReferralProgress = {
        totalReferrals: Number(raw.total_referrals ?? 0),
        completedReferrals: Number(raw.completed_referrals ?? 0),
        pendingReferrals: Number(raw.pending_referrals ?? 0),
        currentBatchProgress: Number(raw.current_batch_progress ?? 0),
        nextMilestone: Number(raw.next_milestone ?? 10),
        referralsUntilReward: Number(raw.referrals_until_reward ?? 0),
        totalRewardsEarned: Number(raw.total_rewards_earned ?? 0),
        totalCashRewardsKsh: Number(raw.total_cash_rewards_ksh ?? 0),
        hasActivePremium: Boolean(raw.has_active_premium),
        premiumStartDate: typeof raw.premium_start_date === 'string' ? raw.premium_start_date : undefined,
        premiumEndDate: typeof raw.premium_end_date === 'string' ? raw.premium_end_date : undefined,
      };

      return { data: mapped, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }


  /**
   * Get list of referrals made by a user
   */
  async getUserReferrals(userId: string): Promise<{
    data: Referral[] | null;
    error?: any;
  }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(userId)) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const referrals: Referral[] = (data || []).map(item => ({
        id: item.id,
        referrerId: item.referrer_id,
        referredUserId: item.referred_user_id,
        referralCode: item.referral_code,
        status: item.status as 'pending' | 'registered' | 'verified' | 'completed',
        registeredAt: item.registered_at,
        verifiedAt: item.verified_at,
        completedAt: item.completed_at,
        createdAt: item.created_at,
      }));

      return { data: referrals, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Generate shareable referral link
   */
  generateReferralLink(referralCode: string): string {
    const code = this.sanitizeReferralCode(referralCode) || referralCode.trim().toUpperCase();
    const baseUrl = this.getWebAppBaseUrl();
    // Canonical referral link (supports deferred attribution via Play Install Referrer landing page)
    return `${baseUrl}/r/${encodeURIComponent(code)}`;
  }

  /**
   * Parse referral code from deep link
   */
  parseReferralLink(url: string): string | null {
    try {
      const raw = url.trim();
      if (!raw) return null;

      // Handle deep link formats:
      // - linkapp://r/CODE
      // - linkapp://r?code=CODE
      // - legacy: linkapp://refer/CODE
      // - legacy: linkapp://refer?code=CODE
      // - exp+linkapp://r/CODE (Expo dev-client scheme)
      if (raw.includes('://r/')) {
        const after = raw.split('://r/')[1];
        const candidate = after?.split('?')[0] || null;
        return this.sanitizeReferralCode(candidate);
      }

      if (raw.includes('://r')) {
        // e.g. linkapp://r?code=CODE
        const urlObj = new URL(raw);
        const candidate = urlObj.searchParams.get('code') || urlObj.searchParams.get('referral_code');
        return this.sanitizeReferralCode(candidate);
      }

      if (raw.includes('://refer/')) {
        const after = raw.split('://refer/')[1];
        const candidate = after?.split('?')[0] || null;
        return this.sanitizeReferralCode(candidate);
      }

      if (raw.includes('://refer')) {
        // e.g. linkapp://refer?code=CODE
        const urlObj = new URL(raw);
        const candidate = urlObj.searchParams.get('code') || urlObj.searchParams.get('referral_code');
        return this.sanitizeReferralCode(candidate);
      }

      // Handle web link formats:
      // - https://link-app.co/r/CODE
      // - https://link-app.co/refer?code=CODE
      // - legacy: https://linkapp.com/refer?code=CODE
      const urlObj = new URL(raw);
      const path = (urlObj.pathname || '').replace(/\/+$/, '');

      if (path.startsWith('/r/')) {
        const candidate = path.split('/')[2] || null;
        return this.sanitizeReferralCode(candidate);
      }

      if (path === '/refer' || path.startsWith('/refer/')) {
        const candidateFromPath = path.startsWith('/refer/') ? path.split('/')[2] : null;
        const candidateFromQuery = urlObj.searchParams.get('code') || urlObj.searchParams.get('referral_code');
        return this.sanitizeReferralCode(candidateFromPath || candidateFromQuery);
      }

      const candidate = urlObj.searchParams.get('code') || urlObj.searchParams.get('referral_code');
      return this.sanitizeReferralCode(candidate);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get referral statistics
   */
  async getReferralStatistics(userId: string): Promise<{
    data: ReferralStatistics | null;
    error?: any;
  }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(userId)) {
        return {
          data: {
            userId,
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            totalRewardsEarned: 0,
            totalCashRewardsKsh: 0,
            currentBatchProgress: 0,
            nextMilestone: 10,
            nextCashMilestone: 200,
          },
          error: null
        };
      }

      const { data, error } = await supabase
        .from('referral_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Initialize statistics if not found
        const { data: newStats, error: insertError } = await supabase
          .from('referral_statistics')
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;

        return {
          data: {
            userId: newStats.user_id,
            totalReferrals: newStats.total_referrals,
            completedReferrals: newStats.completed_referrals,
            pendingReferrals: newStats.pending_referrals,
            totalRewardsEarned: newStats.total_rewards_earned,
            totalCashRewardsKsh: (newStats as any).total_cash_rewards_ksh || 0,
            currentBatchProgress: newStats.current_batch_progress,
            lastRewardAt: newStats.last_reward_at,
            nextMilestone: newStats.next_milestone,
            nextCashMilestone: (newStats as any).next_cash_milestone || 200,
          },
          error: null
        };
      }

      return {
        data: {
          userId: data.user_id,
          totalReferrals: data.total_referrals,
          completedReferrals: data.completed_referrals,
          pendingReferrals: data.pending_referrals,
          totalRewardsEarned: data.total_rewards_earned,
          totalCashRewardsKsh: (data as any).total_cash_rewards_ksh || 0,
          currentBatchProgress: data.current_batch_progress,
          lastRewardAt: data.last_reward_at,
          nextMilestone: data.next_milestone,
          nextCashMilestone: (data as any).next_cash_milestone || 200,
        },
        error: null
      };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Get user's reward notifications
   */
  async getRewardNotifications(userId: string): Promise<{
    data: ReferralRewardNotification[] | null;
    error?: any;
  }> {
    try {
      if (!isSupabaseConfigured() || !this.isValidUuid(userId)) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('referral_reward_notifications' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;

      const notifications: ReferralRewardNotification[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        referralCount: item.referral_count,
        rewardAmount: item.reward_amount,
        milestone: item.milestone as 200 | 2000,
        status: item.status as 'pending' | 'notified' | 'processed' | 'paid',
        createdAt: item.created_at,
        notifiedAt: item.notified_at,
        processedAt: item.processed_at,
        paidAt: item.paid_at,
        adminNotes: item.admin_notes,
        paymentReference: item.payment_reference,
      }));

      return { data: notifications, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * Get reward amount for milestone
   */
  getRewardAmountForMilestone(milestone: number): number {
    switch (milestone) {
      case 200:
        return 20000;
      case 2000:
        return 200000;
      default:
        return 0;
    }
  }

  /**
   * Get next milestone info
   */
  getNextMilestoneInfo(completedReferrals: number): {
    milestone: number;
    amount: number;
    remaining: number;
  } {
    if (completedReferrals >= 2000) {
      return { milestone: 2000, amount: 200000, remaining: 0 };
    } else if (completedReferrals >= 200) {
      return { milestone: 2000, amount: 200000, remaining: 2000 - completedReferrals };
    } else {
      return { milestone: 200, amount: 20000, remaining: 200 - completedReferrals };
    }
  }
}

export const referralService = new ReferralService();
export default referralService
