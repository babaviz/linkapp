/**
 * React Hook for Real-time Property Updates
 * Provides easy-to-use real-time property subscriptions with automatic cleanup
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Property } from '../types/property';
import realTimePropertyService, { 
  PropertyChangePayload, 
  PropertySubscriptionOptions,
  PropertyRealtimeEvent 
} from '../services/realTimePropertyService';

export interface UseRealTimePropertiesOptions {
  subscriptionId?: string;
  filters?: PropertySubscriptionOptions['filters'];
  onPropertyChange?: (payload: PropertyChangePayload) => void;
  onError?: (error: Error) => void;
  autoSubscribe?: boolean;
}

export interface UseRealTimePropertiesReturn {
  isConnected: boolean;
  connectionStatus: {
    isConnected: boolean;
    activeSubscriptions: number;
    reconnectAttempts: number;
  };
  subscribe: () => void;
  unsubscribe: () => void;
  triggerDemoUpdate: (property: Property, eventType?: PropertyRealtimeEvent) => void;
}

/**
 * Hook to manage real-time property subscriptions
 */
export const useRealTimeProperties = ({
  subscriptionId: providedId,
  filters,
  onPropertyChange,
  onError,
  autoSubscribe = true,
}: UseRealTimePropertiesOptions = {}): UseRealTimePropertiesReturn => {
  const subscriptionId = providedId || `component-${Date.now()}`;
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to property changes
  const subscribe = useCallback(() => {

    // Clean up any existing subscription
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Create new subscription
    const cleanup = realTimePropertyService.subscribeToPropertyChanges(subscriptionId, {
      filters,
      onPropertyChange: (payload) => {
        
        onPropertyChange?.(payload);
      },
      onError: (error) => {
        
        setIsConnected(false);
        onError?.(error);
      },
    });

    cleanupRef.current = cleanup;
    setIsConnected(true);
  }, [subscriptionId, filters, onPropertyChange, onError]);

  // Unsubscribe from property changes
  const unsubscribe = useCallback(() => {

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsConnected(false);
  }, [subscriptionId]);

  // Get connection status
  const connectionStatus = realTimePropertyService.getConnectionStatus();

  // Trigger demo update (for testing)
  const triggerDemoUpdate = useCallback((property: Property, eventType?: PropertyRealtimeEvent) => {
    realTimePropertyService.triggerDemoUpdate(property, eventType);
  }, []);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [autoSubscribe, subscribe, unsubscribe]);

  return {
    isConnected,
    connectionStatus,
    subscribe,
    unsubscribe,
    triggerDemoUpdate,
  };
};

/**
 * Hook for subscribing to properties in a specific location
 */
export const useLocationProperties = (
  location: { county?: string; town?: string },
  onPropertyChange: (payload: PropertyChangePayload) => void,
  subscriptionId?: string
): UseRealTimePropertiesReturn => {
  return useRealTimeProperties({
    subscriptionId: subscriptionId || `location-${location.county}-${location.town}`,
    filters: { location },
    onPropertyChange,
  });
};

/**
 * Hook for subscribing to properties of a specific type
 */
export const usePropertyTypeUpdates = (
  propertyType: string,
  onPropertyChange: (payload: PropertyChangePayload) => void,
  subscriptionId?: string
): UseRealTimePropertiesReturn => {
  return useRealTimeProperties({
    subscriptionId: subscriptionId || `type-${propertyType}`,
    filters: { propertyType },
    onPropertyChange,
  });
};

/**
 * Hook for subscribing to featured properties
 */
export const useFeaturedProperties = (
  onPropertyChange: (payload: PropertyChangePayload) => void,
  subscriptionId?: string
): UseRealTimePropertiesReturn => {
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const id = subscriptionId || 'featured-properties';

  const subscribe = useCallback(() => {

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const cleanup = realTimePropertyService.subscribeToFeaturedProperties(
      id,
      (payload) => {
        
        onPropertyChange(payload);
      }
    );

    cleanupRef.current = cleanup;
    setIsConnected(true);
  }, [id, onPropertyChange]);

  const unsubscribe = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const triggerDemoUpdate = useCallback((property: Property, eventType?: PropertyRealtimeEvent) => {
    realTimePropertyService.triggerDemoUpdate(property, eventType);
  }, []);

  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  return {
    isConnected,
    connectionStatus: realTimePropertyService.getConnectionStatus(),
    subscribe,
    unsubscribe,
    triggerDemoUpdate,
  };
};

/**
 * Hook for property price range monitoring
 */
export const usePriceRangeProperties = (
  priceRange: { min?: number; max?: number },
  onPropertyChange: (payload: PropertyChangePayload) => void,
  subscriptionId?: string
): UseRealTimePropertiesReturn => {
  return useRealTimeProperties({
    subscriptionId: subscriptionId || `price-${priceRange.min}-${priceRange.max}`,
    filters: { priceRange },
    onPropertyChange,
  });
};

export default useRealTimeProperties;
