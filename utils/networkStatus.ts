/**
 * Network Status Utility
 * Provides network connectivity checking and monitoring
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import logger from './logger';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  details: NetInfoState | null;
}

/**
 * Check current network connection status
 * @returns Promise with network status information
 */
export async function checkNetworkConnection(): Promise<NetworkStatus> {
  try {
    const state = await NetInfo.fetch();
    
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state,
    };
  } catch (error) {
    logger.warn('[NetworkStatus] Failed to check network:', error);
    // Return disconnected state if check fails
    return {
      isConnected: false,
      isInternetReachable: false,
      type: null,
      details: null,
    };
  }
}

/**
 * React hook for monitoring network connection status
 * Automatically subscribes to network state changes
 * 
 * @returns Object with isConnected boolean and network details
 * 
 * @example
 * const { isConnected, isInternetReachable, refresh } = useNetworkStatus();
 * 
 * if (!isConnected) {
 *   Alert.alert('No Internet', 'Please check your connection');
 *   return;
 * }
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistically assume connected initially
    isInternetReachable: null,
    type: null,
    details: null,
  });
  
  const [isChecking, setIsChecking] = useState(false);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setIsChecking(true);
    try {
      const currentStatus = await checkNetworkConnection();
      setStatus(currentStatus);
      return currentStatus;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    refresh();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state,
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return {
    ...status,
    isChecking,
    refresh,
  };
}

/**
 * Get user-friendly network error message
 * @param error Optional error object
 * @returns Formatted error message for network issues
 */
export function getNetworkErrorMessage(error?: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || 
        message.includes('fetch failed') || 
        message.includes('enotfound') ||
        message.includes('timeout') ||
        message.includes('connection')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
  }
  
  return 'Network error. Please check your connection and try again.';
}

/**
 * Ensure network is available before executing an operation
 * Shows alert if not connected
 * 
 * @param operation Function to execute if network is available
 * @param options Configuration options
 * @returns Promise resolving to operation result or null if no network
 * 
 * @example
 * await withNetworkCheck(async () => {
 *   await authService.signIn(email, password);
 * }, { showAlert: true });
 */
export async function withNetworkCheck<T>(
  operation: () => Promise<T>,
  options: {
    showAlert?: boolean;
    alertTitle?: string;
    alertMessage?: string;
  } = {}
): Promise<T | null> {
  const { showAlert = false, alertTitle = 'No Internet Connection', alertMessage } = options;
  
  const status = await checkNetworkConnection();
  
  if (!status.isConnected) {
    if (showAlert) {
      // Dynamic import to avoid circular dependencies
      const { Alert } = await import('react-native');
      Alert.alert(
        alertTitle,
        alertMessage || 'Please check your internet connection and try again.'
      );
    }
    return null;
  }
  
  try {
    return await operation();
  } catch (error) {
    // If operation fails with network error, provide helpful message
    if (showAlert) {
      const { Alert } = await import('react-native');
      Alert.alert(alertTitle, getNetworkErrorMessage(error));
    }
    throw error;
  }
}
