/**
 * ErrorBoundary Component with Enhanced Error Logging and Recovery
 * 
 * This component catches errors in the React component tree and displays a fallback UI.
 * It has special handling for Stream Chat property configuration errors.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getUserFacingError } from '../../utils/userFacingError';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetCount: number;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: 0
    };
  }
  
  resetError = () => {
    // Call the onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
    
    // Increment reset count to track how many times we've tried to recover
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: prevState.resetCount + 1
    }));
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // If this is the TypeError we're looking for, log additional details
    if (error.message.includes('property is not configurable')) {
      // Try to identify the property that caused the error
      const propertyMatch = error.message.match(/property "([^"]+)"/);
      if (propertyMatch) {
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Check for property configuration errors
      const isPropertyConfigError = 
        this.state.error?.message?.includes('property is not configurable') ||
        this.state.error?.message?.includes('Cannot redefine property');
      
      const componentName = this.props.component || 
        (this.state.errorInfo?.componentStack?.split('\n')[1]?.trim() || 'Unknown');

      const friendly = getUserFacingError(this.state.error, {
        action: 'load this screen',
        displayStyle: 'inline',
      });
        
      return (
        <View style={styles.container}>
          <Text style={styles.errorTitle}>
            {isPropertyConfigError 
              ? 'Chat Unavailable'
              : friendly.title}
          </Text>
          
          <Text style={styles.errorMessage}>
            {isPropertyConfigError
              ? `We couldn’t start chat in this screen (${componentName}). Try again. If it keeps happening, restart the app.`
              : friendly.message}
          </Text>
          
          {__DEV__ && this.state.errorInfo && (
            <Text style={styles.componentStack}>
              {this.state.errorInfo.componentStack}
            </Text>
          )}
          
          {/* Only show reset button if we haven't tried too many times */}
          {this.state.resetCount < 3 && (
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={this.resetError}
            >
              <Text style={styles.resetButtonText}>
                {isPropertyConfigError 
                  ? 'Try Again with Safe Mode'
                  : 'Try Again'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#dc3545'
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#6c757d'
  },
  componentStack: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'left',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa'
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

export default ErrorBoundary;
