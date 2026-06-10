import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../redux/hooks';
import dateMiSubscriptionService, { DateMiSubscriptionStatus } from '../services/dateMiSubscriptionService';

export type DateMiFeatureKey = 'messaging' | 'voice_call' | 'video_call';

interface UseDateMiAccessOptions {
  /** When false, the hook will not fetch and will return free defaults. */
  enabled?: boolean;
}

interface UseDateMiAccessReturn {
  isLoading: boolean;
  tier: 'free' | 'pro' | 'premium';
  canMessage: boolean;
  canVoiceCall: boolean;
  canVideoCall: boolean;
  refresh: () => Promise<DateMiSubscriptionStatus | null>;
}

export default function useDateMiAccess(options?: UseDateMiAccessOptions): UseDateMiAccessReturn {
  const enabled = options?.enabled ?? true;
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [status, setStatus] = useState<DateMiSubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef<Promise<DateMiSubscriptionStatus | null> | null>(null);

  const refresh = useCallback(async (): Promise<DateMiSubscriptionStatus | null> => {
    if (!enabled) {
      setStatus(null);
      return null;
    }
    if (!userId) {
      setStatus(null);
      return null;
    }

    if (inFlightRef.current) {
      return await inFlightRef.current;
    }

    const run = (async () => {
      setIsLoading(true);
      try {
        const next = await dateMiSubscriptionService.getSubscriptionStatus(userId);
        setStatus(next);
        return next;
      } catch {
        setStatus(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    })();

    inFlightRef.current = run;
    try {
      return await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  
  // Refresh when returning to a focused screen (e.g., after purchasing an add-on).
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const derived = useMemo(() => {
    const tier = status?.tier ?? 'free';
    const access = status?.access;
    return {
      tier,
      canMessage: Boolean(access?.canSendMessages),
      canVoiceCall: Boolean(access?.canMakeVoiceCalls),
      canVideoCall: Boolean(access?.canMakeVideoCalls),
    };
  }, [status]);

  return {
    isLoading,
    tier: derived.tier,
    canMessage: derived.canMessage,
    canVoiceCall: derived.canVoiceCall,
    canVideoCall: derived.canVideoCall,
    refresh,
  };
}

