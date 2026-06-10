/**
 * MapErrorBoundary Component
 * Catches and handles map-related errors gracefully with user-friendly fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../../utils/responsive';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onViewAsList?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorMessage: string;
}

class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorMessage: MapErrorBoundary.getErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Report to error tracking service if available
    // Example: Crashlytics.recordError(error);
  }

  static getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Common map-related error messages
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to load map data. Please check your internet connection.';
    }
    
    if (message.includes('permission') || message.includes('location')) {
      return 'Location permission is required to use maps. Please enable location access.';
    }
    
    if (message.includes('google') || message.includes('maps')) {
      return 'Map service is temporarily unavailable. Please try again later.';
    }
    
    if (message.includes('coordinate') || message.includes('geocod')) {
      return 'Invalid location data. Please try a different location.';
    }
    
    // Generic fallback
    return 'Something went wrong with the map. Please try again.';
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorMessage: '',
    });
  };

  handleOpenSettings = (): void => {
    Linking.openSettings().catch(() => undefined);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default fallback UI
      const isPermissionIssue = this.state.errorMessage.toLowerCase().includes('permission');

      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="map-outline" size={48} color="#6b7280" />
            </View>
            
            <Text style={styles.errorTitle}>Map Unavailable</Text>
            
            <Text style={styles.errorMessage}>
              {this.state.errorMessage}
            </Text>
            
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              {typeof this.props.onViewAsList === 'function' && (
                <TouchableOpacity style={styles.alternativeButton} onPress={this.props.onViewAsList}>
                  <Ionicons name="list" size={20} color="#007AFF" />
                  <Text style={styles.alternativeButtonText}>View as List</Text>
                </TouchableOpacity>
              )}

              {isPermissionIssue && (
                <TouchableOpacity style={styles.alternativeButton} onPress={this.handleOpenSettings}>
                  <Ionicons name="settings-outline" size={20} color="#007AFF" />
                  <Text style={styles.alternativeButtonText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText} numberOfLines={3}>
                  {this.state.error?.stack || this.state.error?.message}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
interface MapErrorWrapperProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onViewAsList?: () => void;
}

export const MapErrorWrapper: React.FC<MapErrorWrapperProps> = (props) => {
  return <MapErrorBoundary {...props} />;
};

// Higher-order component for wrapping map screens
export function withMapErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackComponent?: ReactNode
) {
  const WithMapErrorBoundary: React.FC<P> = (props) => {
    return (
      <MapErrorBoundary fallbackComponent={fallbackComponent}>
        <WrappedComponent {...props} />
      </MapErrorBoundary>
    );
  };

  WithMapErrorBoundary.displayName = `withMapErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithMapErrorBoundary;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorContent: {
    backgroundColor: 'white',
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  errorActions: {
    width: '100%',
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  alternativeButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alternativeButtonText: {
    color: '#007AFF',
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  debugInfo: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: spacing.xs,
  },
  debugText: {
    fontSize: fontSize.xs,
    color: '#7f1d1d',
    fontFamily: 'monospace',
  },
});

export default MapErrorBoundary;
