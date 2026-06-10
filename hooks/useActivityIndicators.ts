import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService, { ActivityData } from '../services/analyticsService';

interface UseActivityIndicatorsOptions {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  userRole?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseActivityIndicatorsReturn {
  activityData: ActivityData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useActivityIndicators = ({
  module,
  userRole,
  refreshInterval = 30000,
  enabled = true
}: UseActivityIndicatorsOptions): UseActivityIndicatorsReturn => {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const hasDataRef = useRef(false);

  const fetchActivity = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) return;

    try {
      if (!options?.silent && !hasDataRef.current) {
        setIsLoading(true);
      }
      setError(null);
      
      const data = await analyticsService.fetchActivityIndicator(module, userRole);
      
      if (isMountedRef.current) {
        setActivityData(data);
        hasDataRef.current = true;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch activity data'));
        // Do not invent numbers on failure; keep last known value (if any).
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [module, userRole, enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    hasDataRef.current = false;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchActivity();

    // Realtime subscription for near real-time updates
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    unsubscribeRef.current = analyticsService.subscribeToActivityIndicator(
      module,
      (data) => {
        if (!isMountedRef.current) return;
        setActivityData(data);
        hasDataRef.current = true;
        setIsLoading(false);
      },
      userRole
    );

    // Fallback polling to recover from missed realtime events / connectivity issues
    const intervalId = setInterval(() => {
      fetchActivity({ silent: true });
    }, refreshInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [module, userRole, refreshInterval, enabled, fetchActivity]);

  return {
    activityData,
    isLoading,
    error,
    refresh: fetchActivity
  };
};

export default useActivityIndicators;
