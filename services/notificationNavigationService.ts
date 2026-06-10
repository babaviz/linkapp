/**
 * NotificationNavigationService
 *
 * Centralizes all notification-to-screen routing logic.
 * Previously, routing was scattered across App.tsx, notificationService.ts,
 * and NotificationScreen.tsx. This single-entry-point ensures:
 *
 * - Consistent routing for every notification type
 * - "1 screen = 1 action" rule: no intermediate screens
 * - Low-latency: navigation starts immediately, state updates in parallel
 * - Graceful fallback to Notifications screen if routing fails
 */

import { LinkingService } from './linkingService';
import { store } from '../redux/store';
import { setIncomingCall } from '../redux/slices/callSlice';
import messageNotificationService from './messageNotificationService';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface NotificationPayload {
  type?: string;
  // Call fields
  callId?: string;
  callType?: 'audio' | 'video';
  // Chat / message fields
  cid?: string;
  channel_cid?: string;
  channel_type?: string;
  channel_id?: string;
  chatId?: string;
  channelCid?: string;
  conversationId?: string;
  // Profile / entity fields
  profileId?: string;
  profileName?: string;
  profilePictures?: string[];
  // Job / service / property fields
  jobId?: string;
  serviceId?: string;
  propertyId?: string;
  // Match fields
  matchId?: string;
  // Generic
  screen?: string;
  params?: Record<string, unknown>;
  // Payment
  amount?: number;
  paymentType?: string;
  [key: string]: unknown;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Wait until navigation is ready, then navigate.
 * Retries up to `maxRetries` times with 250ms intervals.
 */
function safeNavigate(screenName: string, params?: Record<string, unknown>, maxRetries: number = 12): void {
  const attempt = (triesLeft: number) => {
    if (LinkingService.getCurrentRouteName()) {
      LinkingService.navigate(screenName, params);
      return;
    }
    if (triesLeft <= 0) return;
    setTimeout(() => attempt(triesLeft - 1), 250);
  };
  attempt(maxRetries);
}

/**
 * Resolve the chat channel CID from various payload formats.
 */
function resolveChannelCid(data: NotificationPayload): string | undefined {
  if (data.cid) return data.cid;
  if (data.channel_cid) return data.channel_cid;
  if (data.channelCid) return data.channelCid;
  if (data.channel_type && data.channel_id) return `${data.channel_type}:${data.channel_id}`;
  if (data.chatId) return data.chatId;
  if (data.conversationId) return data.conversationId;
  return undefined;
}

// ------------------------------------------------------------------
// Main Service
// ------------------------------------------------------------------

class NotificationNavigationService {
  /**
   * Route a notification response to the correct screen.
   *
   * Call this from `handleNotificationResponse` in App.tsx or anywhere
   * a notification action/tap is received. It performs routing immediately
   * and never shows an intermediate screen.
   */
  navigateFromNotification(
    data: NotificationPayload,
    actionIdentifier?: string
  ): void {
    const dataType = data.type;

    // ----------------------------------------------------------------
    // 0. Referral notifications → referral program / signup
    // ----------------------------------------------------------------
    if (dataType === 'referral_reward' || dataType === 'referral_captured' || dataType === 'referral_applied') {
      const state = store.getState() as any;
      const isSignedIn = Boolean(state?.auth?.isAuthenticated && state?.auth?.user?.id);

      if (isSignedIn) {
        safeNavigate('ReferralProgram');
      } else {
        // For referral-related notifications, encourage signup.
        safeNavigate('SignUp');
      }
      return;
    }

    // ----------------------------------------------------------------
    // 1. Call notifications
    // ----------------------------------------------------------------
    if (dataType === 'video_call' || dataType === 'audio_call') {
      this.handleCallNavigation(data, actionIdentifier);
      return;
    }

    // ----------------------------------------------------------------
    // 2. Message / chat notifications → direct to ChatChannel
    // ----------------------------------------------------------------
    if (dataType === 'message' || dataType === 'chat') {
      const channelCid = resolveChannelCid(data);
      if (channelCid) {
        // Mark the conversation as read on open (clears grouped notifications)
        if (data.conversationId) {
          messageNotificationService.markConversationRead(data.conversationId);
        }
        safeNavigate('ChatChannel', { channelCid });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 3. Match notifications → direct to DateMi chat
    // ----------------------------------------------------------------
    if (dataType === 'match' || dataType === 'super_like') {
      if (data.profileId) {
        safeNavigate('DateMiChat', { matchId: data.matchId, profileId: data.profileId });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 4. Like / profile view → direct to DateMi profile
    // ----------------------------------------------------------------
    if (dataType === 'like' || dataType === 'profile_view') {
      if (data.profileId) {
        safeNavigate('ProfileView', { profileId: data.profileId });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 5. Job notifications
    // ----------------------------------------------------------------
    if (dataType === 'job_alert' || dataType === 'job') {
      if (data.jobId) {
        safeNavigate('JobDetails', { jobId: data.jobId });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 6. Service notifications
    // ----------------------------------------------------------------
    if (dataType === 'service') {
      if (data.serviceId) {
        safeNavigate('ServiceDetails', { serviceId: data.serviceId });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 7. Property notifications
    // ----------------------------------------------------------------
    if (dataType === 'property') {
      if (data.propertyId) {
        safeNavigate('PropertyDetails', { propertyId: data.propertyId });
        return;
      }
    }

    // ----------------------------------------------------------------
    // 8. Payment notifications
    // ----------------------------------------------------------------
    if (dataType === 'payment' && data.amount) {
      safeNavigate('PaymentScreen', { amount: data.amount, type: data.paymentType || 'general' });
      return;
    }

    // ----------------------------------------------------------------
    // 9. Stream Chat CID present without explicit type → chat
    // ----------------------------------------------------------------
    const channelCid = resolveChannelCid(data);
    if (channelCid) {
      safeNavigate('ChatChannel', { channelCid });
      return;
    }

    // ----------------------------------------------------------------
    // 10. Generic screen navigation
    // ----------------------------------------------------------------
    if (data.screen) {
      safeNavigate(data.screen, (data.params as Record<string, unknown>) || {});
      return;
    }

    // ----------------------------------------------------------------
    // Fallback: Notifications screen (only when authenticated)
    // ----------------------------------------------------------------
    const state = store.getState() as { auth?: { isAuthenticated?: boolean } };
    if (state?.auth?.isAuthenticated) {
      safeNavigate('Notifications');
    }
  }

  /**
   * Handle incoming call notification actions (accept / reject / tap).
   */
  private handleCallNavigation(data: NotificationPayload, actionIdentifier?: string): void {
    const { callId, callType, profileId, profileName, profilePictures } = data;

    if (!callId) {
      const state = store.getState() as { auth?: { isAuthenticated?: boolean } };
      if (state?.auth?.isAuthenticated) {
        safeNavigate('Notifications');
      }
      return;
    }

    switch (actionIdentifier) {
      case 'accept_call':
        // Accept via Redux thunk
        store.dispatch(
          require('../redux/slices/callSlice').acceptCall(callId)
        );
        break;

      case 'reject_call':
        // Reject via Redux thunk
        store.dispatch(
          require('../redux/slices/callSlice').rejectCall(callId)
        );
        break;

      default:
        // Default tap: show the incoming call modal so user can accept/decline
        if (profileId && profileName) {
          store.dispatch(setIncomingCall({
            callId,
            callerId: profileId,
            callerName: profileName,
            callerImage: profilePictures?.[0],
            type: (callType || 'video') as 'audio' | 'video',
          }));
        }
        break;
    }
  }
}

// Export singleton
const notificationNavigationService = new NotificationNavigationService();
export default notificationNavigationService;
