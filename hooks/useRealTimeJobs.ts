/**
 * React Hook for Real-time Job Updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import realTimeJobService, { JobChangePayload, JobSubscriptionOptions } from '../services/realTimeJobService';

export interface UseRealTimeJobsOptions {
  subscriptionId?: string;
  filters?: JobSubscriptionOptions['filters'];
  onJobChange?: (payload: JobChangePayload) => void;
  onError?: (error: Error) => void;
  autoSubscribe?: boolean;
}

export interface UseRealTimeJobsReturn {
  isConnected: boolean;
  connectionStatus: {
    isConnected: boolean;
    activeSubscriptions: number;
    reconnectAttempts: number;
  };
  subscribe: () => void;
  unsubscribe: () => void;
}

export const useRealTimeJobs = ({
  subscriptionId: providedId,
  filters,
  onJobChange,
  onError,
  autoSubscribe = true,
}: UseRealTimeJobsOptions = {}): UseRealTimeJobsReturn => {
  const subscriptionId = providedId || `jobs-${Date.now()}`;
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const subscribe = useCallback(() => {
    if (cleanupRef.current) cleanupRef.current();

    const cleanup = realTimeJobService.subscribeToJobChanges(subscriptionId, {
      filters,
      onJobChange: (payload) => {
        onJobChange?.(payload);
      },
      onError: (err) => {
        setIsConnected(false);
        onError?.(err);
      },
    });

    cleanupRef.current = cleanup;
    setIsConnected(true);
  }, [subscriptionId, filters, onJobChange, onError]);

  const unsubscribe = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoSubscribe) subscribe();
    return () => unsubscribe();
  }, [autoSubscribe, subscribe, unsubscribe]);

  return {
    isConnected,
    connectionStatus: realTimeJobService.getConnectionStatus(),
    subscribe,
    unsubscribe,
  };
};

export default useRealTimeJobs;
