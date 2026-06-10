/**
 * RingingCallsHandler Component
 * 
 * Watches for incoming ringing calls using Stream Video SDK's useCalls hook.
 * This component should be placed inside StreamVideo provider to properly
 * receive incoming call events.
 * 
 * Manages system ringtone using InCallManager for a native calling experience.
 * 
 * Based on Stream Video React Native SDK documentation:
 * https://getstream.io/video/docs/react-native/incoming-calls/ringing
 */

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setIncomingCall, setCallNotificationId, clearIncomingCall } from '../../redux/slices/callSlice';
import { useCalls, CallingState } from '@stream-io/video-react-native-sdk';
import type { Call } from '@stream-io/video-react-native-sdk';
import DateMiNotificationService from '../../services/dateMiNotificationService';
import { streamVideoService } from '../../services/streamVideoService';
import { startRingtone, stopRingtone } from '../../utils/ringtoneController';

/**
 * RingingCallsHandler watches for incoming calls and dispatches to Redux
 * for the IncomingCallModal to display
 */
export function RingingCallsHandler() {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isConnecting = useAppSelector((state) => state.call.isConnecting);
  const isCallScreenVisible = useAppSelector((state) => state.call.isCallScreenVisible);
  const activeCallPartnerId = useAppSelector((state) => state.call.activeCall.partnerId);
  const incomingCallCid = useAppSelector((state) => state.call.incomingCall.callId);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const handledCallsRef = useRef<Set<string>>(new Set());
  const acceptingCallCidRef = useRef<string | null>(null);
  
  // Get all calls managed by the SDK
  // useCalls() returns an empty array if not inside StreamVideo provider
  let calls: Call[] = [];
  try {
    calls = useCalls();
  } catch {
    // Not inside StreamVideo provider - return empty
    calls = [];
  }
  
  // Filter for ringing calls where we're the receiver (not the creator)
  const ringingCalls = useMemo(() => {
    return calls.filter((call) => {
      // Stream's docs recommend using the `call.ringing` boolean for ringing flows:
      // https://getstream.io/video/docs/react-native/incoming-calls/ringing
      //
      // Some SDK versions may not map ringing → CallingState.RINGING until the call is
      // rendered within a <StreamCall> context, so we prefer `call.ringing` and keep a
      // CallingState fallback for compatibility.
      const isRinging =
        ((call as any)?.ringing === true) ||
        call.state.callingState === CallingState.RINGING;
      return isRinging && !call.isCreatedByMe;
    });
  }, [calls]);

  const firstRingingCall = ringingCalls[0];
  const ringingCallCid = firstRingingCall?.cid ?? null;
  const firstRingingCallRef = useRef<Call | null>(null);
  firstRingingCallRef.current = firstRingingCall ?? null;

  // Acceptance-window guard:
  // During the RINGING → JOINING transition, the ringing call can disappear from `useCalls()`
  // slightly before Redux flips `isConnecting`, which can cause a premature clear of incoming UI.
  useEffect(() => {
    if (isConnecting && incomingCallCid) {
      acceptingCallCidRef.current = incomingCallCid;
      return;
    }
    if (!isConnecting) {
      acceptingCallCidRef.current = null;
    }
  }, [incomingCallCid, isConnecting]);

  // Handle app state changes for background notification logic
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      // Ensure we never keep playing in-app ringtone while backgrounded.
      if (nextState !== 'active') {
        stopRingtone();
      }
    });
    return () => subscription.remove();
  }, []);

  // Track the current call notification ID for auto-dismiss
  const notificationIdRef = useRef<string | null>(null);

  // Process incoming ringing call
  const handleIncomingCall = useCallback(async (call: Call) => {
    // Skip if already handled
    if (handledCallsRef.current.has(call.cid)) {
      return;
    }

    const isBusy = isConnecting || isCallScreenVisible || !!activeCallPartnerId;
    if (isBusy) {
      // When already in a call (or transitioning), do not show a second incoming UI.
      // Best effort: reject as busy so the caller receives an immediate signal.
      handledCallsRef.current.add(call.cid);
      try {
        await streamVideoService.rejectIncomingCall(call.cid, 'busy');
      } catch {
        // ignore
      }
      return;
    }

    handledCallsRef.current.add(call.cid);

    const callState = call.state;
    const createdBy = callState.createdBy;
    
    // Extract caller information
    const custom = callState.custom as any;
    const isDateMiCall = custom?.module === 'datemi';

    const callerId = createdBy?.id || custom?.caller_id || '';
    const callerName = createdBy?.name || custom?.caller_name || 'Incoming Call';
    const callerImage = isDateMiCall ? custom?.caller_image || createdBy?.image : createdBy?.image || custom?.caller_image;
    // IMPORTANT: Determine call type from our custom data (always set in createCall),
    // NOT from settings.video.enabled. The 'default' Stream call type has video enabled
    // in settings even for audio-only calls, which would misidentify voice calls as video.
    const isVideo = custom?.type ? custom.type === 'video' : (callState.settings?.video?.enabled ?? false);

    // Start system ringtone for incoming call with vibration pattern
    // _DEFAULT_ uses the system's default ringtone
    startRingtone();

    // Dispatch to Redux for IncomingCallModal
    dispatch(setIncomingCall({
      callId: call.cid,
      callerId,
      callerName,
      callerImage,
      type: isVideo ? 'video' : 'audio',
    }));

    // Send push notification if app is in background.
    // Store the notification ID so it can be auto-dismissed when call ends.
    const isForeground = appStateRef.current === 'active';
    if (!isForeground && Platform.OS !== 'web') {
      try {
        const notifId = await DateMiNotificationService.notifyIncomingCall(
          {
            id: callerId,
            displayName: callerName,
            profilePictures: callerImage ? [callerImage] : [],
          },
          call.cid,
          isVideo ? 'video' : 'audio'
        );
        if (notifId) {
          notificationIdRef.current = notifId;
          dispatch(setCallNotificationId(notifId));
        }
      } catch {
        // Notification failure shouldn't block call handling
      }
    }
  }, [activeCallPartnerId, dispatch, isCallScreenVisible, isConnecting]);

  // Handle call state changes (e.g., call ended/rejected/accepted while ringing).
  // Auto-dismiss the call notification from the tray and stop ringing.
  const handleCallEnded = useCallback(async (call: Call) => {
    // Remove from handled calls and clear incoming call state
    handledCallsRef.current.delete(call.cid);

    // Auto-dismiss the corresponding call notification
    if (notificationIdRef.current) {
      await DateMiNotificationService.dismissCallNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Stop system ringtone
    stopRingtone();

    dispatch(clearIncomingCall());
  }, [dispatch]);

  // Watch for ringing calls
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      return;
    }

    // Process any new ringing calls
    const ringingCall = firstRingingCallRef.current;
    if (ringingCall) {
      handleIncomingCall(ringingCall);
      
      // Subscribe to call state changes to handle rejection/end
      const unsubscribe = ringingCall.on('call.ended', () => {
        handleCallEnded(ringingCall);
      });
      
      const unsubscribeRejected = ringingCall.on('call.rejected', () => {
        handleCallEnded(ringingCall);
      });
      
      // When call is accepted, stop ringing immediately
      // Don't clear incoming call state - let Redux acceptCall action handle that
      const unsubscribeAccepted = ringingCall.on('call.accepted', () => {
        // Stop ringtone immediately when accepted
        stopRingtone();
        acceptingCallCidRef.current = ringingCall.cid;
        // Auto-dismiss call notification from the tray
        if (notificationIdRef.current) {
          DateMiNotificationService.dismissCallNotification(notificationIdRef.current).catch(() => {
            // ignore
          });
          notificationIdRef.current = null;
        }
      });
      
      const unsubscribeMissed = ringingCall.on('call.missed', () => {
        handleCallEnded(ringingCall);
      });

      return () => {
        unsubscribe();
        unsubscribeRejected();
        unsubscribeAccepted();
        unsubscribeMissed();
      };
    } else {
      // No ringing calls - clear incoming call state if we had one
      // (might have been answered or rejected)
      // Only clear if we actually had handled calls before AND we're not mid-accept.
      const isAccepting = acceptingCallCidRef.current != null;
      if (handledCallsRef.current.size > 0 && !isConnecting && !isAccepting) {
        handledCallsRef.current.clear();
        dispatch(clearIncomingCall());
      }
    }
  }, [ringingCallCid, isAuthenticated, currentUserId, handleIncomingCall, handleCallEnded, dispatch, isConnecting, incomingCallCid]);

  // This component doesn't render anything visible
  return null;
}

export default RingingCallsHandler;
