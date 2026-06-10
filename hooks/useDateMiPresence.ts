import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { DateMiProfileService } from '../services/dateMiService';

const HEARTBEAT_MS = 90 * 1000; // 1m30s
const MIN_SEND_INTERVAL_MS = 10 * 1000; // avoid burst calls on rapid state flips

let activeSubscribers = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let sharedUserId: string | null = null;
let lastSentAt = 0;

async function sendPresence(isOnline: boolean) {
  if (!sharedUserId) return;
  const now = Date.now();
  if (now - lastSentAt < MIN_SEND_INTERVAL_MS) return;
  lastSentAt = now;
  await DateMiProfileService.updateOnlineStatus(sharedUserId, isOnline);
}

function ensureStarted(userId: string) {
  sharedUserId = userId;

  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void sendPresence(true);
      } else {
        void sendPresence(false);
      }
    });
  }

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void sendPresence(true);
      }
    }, HEARTBEAT_MS);
  }

  // Initial ping when DateMi becomes active in UI.
  if (AppState.currentState === 'active') {
    void sendPresence(true);
  }
}

function ensureStopped() {
  activeSubscribers = 0;
  sharedUserId = null;

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

export function useDateMiPresence(options: { userId?: string | null; enabled?: boolean }) {
  const { userId, enabled = true } = options;
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    activeSubscribers += 1;
    hasStartedRef.current = true;
    ensureStarted(userId);

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      if (activeSubscribers === 0 && hasStartedRef.current) {
        ensureStopped();
      }
    };
  }, [enabled, userId]);
}

