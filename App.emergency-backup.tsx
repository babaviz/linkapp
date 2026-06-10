/**
 * EMERGENCY DIAGNOSTIC APP
 * This will help us see EXACTLY where the crash happens
 * Shows error messages instead of crashing silently
 */

console.log('[EMERGENCY] App loading started...');

// Try polyfills
try {
  console.log('[EMERGENCY] Loading polyfills...');
  require('./polyfills');
  console.log('[EMERGENCY] Polyfills loaded ✓');
} catch (error) {
  console.error('[EMERGENCY] Polyfills FAILED:', error);
}

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

console.log('[EMERGENCY] React imports loaded ✓');

// Track what works
const diagnostics: Array<{step: string; status: 'success' | 'failed'; error?: string}> = [];

function addDiagnostic(step: string, status: 'success' | 'failed', error?: any) {
  console.log(`[DIAGNOSTIC] ${step}: ${status}`, error || '');
  diagnostics.push({ step, status, error: error ? String(error) : undefined });
}

// Test each import one by one
console.log('[EMERGENCY] Testing imports...');

// Test 1: Redux
let ReduxProvider: any = null;
let store: any = null;
try {
  console.log('[TEST] Loading React-Redux...');
  const redux = require('react-redux');
  ReduxProvider = redux.Provider;
  addDiagnostic('React-Redux', 'success');
  
  console.log('[TEST] Loading Redux store...');
  const storeModule = require('./redux/store');
  store = storeModule.store;
  addDiagnostic('Redux Store', 'success');
} catch (error) {
  addDiagnostic('Redux', 'failed', error);
}

// Test 2: Navigation
let RootNavigator: any = null;
try {
  console.log('[TEST] Loading Navigation...');
  const nav = require('./navigation/RootNavigator');
  RootNavigator = nav.default;
  addDiagnostic('Navigation', 'success');
} catch (error) {
  addDiagnostic('Navigation', 'failed', error);
}

// Test 3: Environment
try {
  console.log('[TEST] Loading Environment...');
  require('./config/environment');
  addDiagnostic('Environment', 'success');
} catch (error) {
  addDiagnostic('Environment', 'failed', error);
}

// Test 4: Supabase
try {
  console.log('[TEST] Loading Supabase...');
  require('./services/supabaseClient');
  addDiagnostic('Supabase Client', 'success');
} catch (error) {
  addDiagnostic('Supabase Client', 'failed', error);
}

// Test 5: Services
const serviceTests = [
  'authService',
  'dateMiService',
  'chatService',
  'streamVideoService',
  'streamChatService',
  'locationService',
  'notificationServiceExpo'
];

serviceTests.forEach(serviceName => {
  try {
    console.log(`[TEST] Loading ${serviceName}...`);
    require(`./services/${serviceName}`);
    addDiagnostic(serviceName, 'success');
  } catch (error) {
    addDiagnostic(serviceName, 'failed', error);
  }
});

console.log('[EMERGENCY] All tests complete');

export default function EmergencyApp() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    console.log('[EMERGENCY] App component mounted');
    setMounted(true);
  }, []);

  const successCount = diagnostics.filter(d => d.status === 'success').length;
  const failureCount = diagnostics.filter(d => d.status === 'failed').length;
  const firstFailure = diagnostics.find(d => d.status === 'failed');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔧 Emergency Diagnostics</Text>
        <Text style={styles.subtitle}>App Loading Analysis</Text>
        
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            ✅ Passed: {successCount} | ❌ Failed: {failureCount}
          </Text>
          <Text style={styles.statusText}>
            Component Mounted: {mounted ? '✅ YES' : '⏳ NO'}
          </Text>
        </View>

        {firstFailure && (
          <View style={styles.criticalError}>
            <Text style={styles.criticalTitle}>🚨 FIRST FAILURE</Text>
            <Text style={styles.criticalStep}>{firstFailure.step}</Text>
            <Text style={styles.criticalMessage}>{firstFailure.error || 'Unknown error'}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Detailed Results:</Text>
        
        {diagnostics.map((diag, index) => (
          <View 
            key={index} 
            style={[
              styles.diagnostic,
              diag.status === 'failed' ? styles.diagnosticFailed : styles.diagnosticSuccess
            ]}
          >
            <Text style={styles.diagnosticStep}>
              {diag.status === 'success' ? '✅' : '❌'} {diag.step}
            </Text>
            {diag.error && (
              <Text style={styles.diagnosticError}>{diag.error}</Text>
            )}
          </View>
        ))}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📋 What This Tells Us:</Text>
          <Text style={styles.instructionsText}>
            • The FIRST ❌ is where your app crashes{'\n'}
            • Share this screen with developer{'\n'}
            • Take screenshot and send it
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  criticalError: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  criticalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  criticalStep: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  criticalMessage: {
    fontSize: 12,
    color: '#ffcccc',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  diagnostic: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  diagnosticSuccess: {
    backgroundColor: '#1b3a1b',
  },
  diagnosticFailed: {
    backgroundColor: '#3a1b1b',
  },
  diagnosticStep: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  diagnosticError: {
    fontSize: 11,
    color: '#ff9999',
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: '#2a2a4a',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
});
