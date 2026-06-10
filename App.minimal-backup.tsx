/**
 * MINIMAL APP.TSX - Emergency Safe Mode
 * This version bypasses ALL optional features to isolate the crash
 * Use this to verify the app can at least launch
 */

// ONLY essential polyfills
try {
  require('./polyfills');
} catch (error) {
  console.error('[CRITICAL] Polyfills failed:', error);
}

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// NO IMPORTS OF: Redux, Navigation, Services, Components
// This is intentional to isolate the crash

export default function App() {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      console.log('[App] Minimal app mounted successfully!');
      console.log('[App] Platform:', Platform.OS);
      console.log('[App] Environment test...');
      
      // Test environment access
      try {
        const testEnv = require('./config/environment');
        console.log('[App] Environment loaded:', testEnv ? 'YES' : 'NO');
      } catch (envError) {
        console.error('[App] Environment failed:', envError);
        setError(`ENV Error: ${envError}`);
      }
    } catch (mountError) {
      console.error('[App] Mount error:', mountError);
      setError(`Mount Error: ${mountError}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>LinkApp - Safe Mode</Text>
        <Text style={styles.subtitle}>Minimal Version Running</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Error Detected</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅ App Launched Successfully!</Text>
            <Text style={styles.infoText}>
              This is a minimal version with all features disabled.
            </Text>
            <Text style={styles.infoText}>
              Platform: {Platform.OS}
            </Text>
          </View>
        )}
        
        <Text style={styles.hint}>
          If you see this screen, the core React Native setup is working.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E3A8C',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    width: '100%',
  },
  successText: {
    fontSize: 20,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    width: '100%',
  },
  errorTitle: {
    fontSize: 20,
    color: '#C62828',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#B71C1C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 5,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
});
