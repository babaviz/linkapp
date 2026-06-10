import React, { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setCallScreenVisible, setCallError } from '../../redux/slices/callSlice';
import { LinkingService } from '../../services/linkingService';
import { streamVideoService } from '../../services/streamVideoService';

// Navigation can be slower on some Android devices (JS thread stalls, slow transitions).
// Keep trying for a bit longer to avoid false "call screen couldn't open" errors.
const NAV_READY_WAIT_TIMEOUT_MS = 10_000;
const NAV_FAIL_TIMEOUT_AFTER_READY_MS = 10_000;
const NAV_POLL_INTERVAL_MS = 150;
const NAV_ATTEMPT_INTERVAL_MS = 800;

const CALL_SCREEN_UNAVAILABLE_MESSAGE =
  "We couldn't open the call screen. Please try again or restart the app.";

/**
 * Centralized call-screen navigation.
 * Retries navigation; if still not on VideoCall after timeout, shows error and resets state.
 */
export function CallNavigationCoordinator() {
  const dispatch = useAppDispatch();
  const isCallScreenVisible = useAppSelector((state) => state.call.isCallScreenVisible);
  const activeCallId = useAppSelector((state) => state.call.activeCall.id);
  const activePartnerId = useAppSelector((state) => state.call.activeCall.partnerId);
  const incomingCallId = useAppSelector((state) => state.call.incomingCall.callId);

  // A stable-ish key so the navigation loop restarts for each call attempt,
  // even if `isCallScreenVisible` stays true.
  const callAttemptKey = `${activeCallId ?? ''}|${activePartnerId ?? ''}|${incomingCallId ?? ''}`;

  const navRunIdRef = useRef(0);
  const lastNavigateAttemptAtMsRef = useRef(0);

  useEffect(() => {
    const currentRouteName = LinkingService.getCurrentRouteName?.();

    if (isCallScreenVisible) {
      if (currentRouteName === 'VideoCall') return;

      navRunIdRef.current += 1;
      const runId = navRunIdRef.current;

      const startedAtMs = Date.now();
      let navReadyFirstSeenAtMs: number | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanupWithError = () => {
        // Best-effort: if a call is ringing/active, terminate it so we don't leave ghost sessions.
        streamVideoService.endCall().catch(() => {
          // ignore
        });
        dispatch(setCallScreenVisible(false));
        dispatch(setCallError(CALL_SCREEN_UNAVAILABLE_MESSAGE));
      };

      const tick = () => {
        if (runId !== navRunIdRef.current) return;

        const routeName = LinkingService.getCurrentRouteName?.();
        if (routeName === 'VideoCall') return;

        const nowMs = Date.now();
        const navReady = routeName !== undefined;
        if (navReady && navReadyFirstSeenAtMs == null) {
          navReadyFirstSeenAtMs = nowMs;
        }

        const readyWaitExceeded = !navReady && nowMs - startedAtMs > NAV_READY_WAIT_TIMEOUT_MS;
        const afterReadyExceeded =
          navReadyFirstSeenAtMs != null && nowMs - navReadyFirstSeenAtMs > NAV_FAIL_TIMEOUT_AFTER_READY_MS;

        // Only fail once we either saw navigation become ready, or it never became ready after a long wait.
        if (readyWaitExceeded || afterReadyExceeded) {
          const finalRouteName = LinkingService.getCurrentRouteName?.();
          if (finalRouteName !== 'VideoCall') {
            cleanupWithError();
          }
          return;
        }

        // Rate-limit navigation attempts to avoid pushing duplicate screens.
        if (navReady) {
          const lastAttemptAt = lastNavigateAttemptAtMsRef.current;
          if (nowMs - lastAttemptAt >= NAV_ATTEMPT_INTERVAL_MS) {
            lastNavigateAttemptAtMsRef.current = nowMs;
            LinkingService.navigate('VideoCall');
          }
        }

        timeoutId = setTimeout(tick, NAV_POLL_INTERVAL_MS);
      };

      // Run immediately, then keep polling until we land on VideoCall or timeout.
      tick();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    if (!isCallScreenVisible && currentRouteName === 'VideoCall') {
      LinkingService.goBack?.();
    }
  }, [isCallScreenVisible, callAttemptKey, dispatch]);

  return null;
}

export default CallNavigationCoordinator;

