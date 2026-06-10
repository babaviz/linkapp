/**
 * Call Notification Handler
 * Handles notification responses for incoming call notifications
 */

import { store } from '../redux/store';
import { acceptCall, rejectCall, setIncomingCall } from '../redux/slices/callSlice';
import type { DateMiNotificationData } from '../services/dateMiNotificationService';

/**
 * Handle incoming call notification response
 * Called when user taps notification or uses action buttons
 */
export async function handleCallNotificationResponse(
  data: DateMiNotificationData,
  actionIdentifier?: string
): Promise<void> {
  const { callId, callType, profileId, profileName, profilePictures } = data;

  if (!callId) {
    return;
  }

  try {
    switch (actionIdentifier) {
      case 'accept_call':
        // Accept the call
        await store.dispatch(acceptCall(callId)).unwrap();
        // Navigate to call screen will be handled by Redux state change
        break;

      case 'reject_call':
        // Reject the call
        await store.dispatch(rejectCall(callId)).unwrap();
        break;

      default:
        // Default action (tap notification) - show incoming call modal
        // This handles the case when app is opened from notification
        if (callId && profileId && profileName) {
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
  } catch (error) {
    // Error handling - notification response shouldn't crash app
  }
}

/**
 * Check if notification data is for a call notification
 */
export function isCallNotification(data: any): boolean {
  return data?.type === 'video_call' || data?.type === 'audio_call';
}

