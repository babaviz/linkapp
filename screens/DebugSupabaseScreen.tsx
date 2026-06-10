import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured, getSupabase, recreateSupabaseClient } from '../services/supabaseClient';
import { storageService } from '../services/storageService';
import { initializeSupabaseInfrastructure } from '../services/initSupabase';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function DebugSupabaseScreen() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest = { name, status, message, details };
      
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    updateTest(testName, 'pending', 'Running...');
    try {
      await testFn();
      updateTest(testName, 'success', 'Passed');
    } catch (error: any) {
      updateTest(testName, 'error', error.message || 'Failed', error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Environment Configuration
    await runTest('Environment Check', async () => {
      const configured = isSupabaseConfigured();
      if (!configured) {
        throw new Error('Supabase not configured - check .env file');
      }
    });

    // Test 2: Client Recreation
    await runTest('Client Recreation', async () => {
      const newClient = recreateSupabaseClient();
      if (!newClient) {
        throw new Error('Failed to recreate client');
      }
    });

    // Test 3: Basic Connection Test
    await runTest('Connection Test', async () => {
      const result = await authService.testConnection();
      if (!result.success) {
        throw new Error(result.message);
      }
    });

    // Test 4: Demo Authentication
    await runTest('Demo Authentication', async () => {
      const signInResult = await authService.signIn({
        email: 'demo@test.com',
        password: 'demo123'
      });
      
      if (!signInResult.data) {
        throw new Error('Demo authentication failed');
      }

      // Test getting current user
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('Failed to get current user after sign in');
      }

      // Sign out
      await authService.signOut();
    });

    // Test 5: Infrastructure Check
    await runTest('Infrastructure Check', async () => {
      const result = await initializeSupabaseInfrastructure();
      if (!result.success) {
        throw new Error(result.message || 'Infrastructure check failed');
      }
    });

    // Test 6: Storage Configuration
    await runTest('Storage Service', async () => {
      const configured = storageService.isConfigured();
      if (!configured) {
        throw new Error('Storage service not configured');
      }
    });

    // Test 7: Database Query Test
    await runTest('Database Query', async () => {
      const { error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
    });

    // Test 8: Real User Registration (if possible)
    await runTest('Real Registration Test', async () => {
      const testEmail = `test-${Date.now()}@linkapp.com`;
      const result = await authService.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        fullName: 'Test User',
        phone: '+254700000000'
      });

      // This might fail if user already exists, which is okay
      if (!result.data && !result.error?.message?.includes('already')) {
        throw new Error(`Registration failed: ${result.error?.message}`);
      }
    });

    setIsRunning(false);
  };

  const clearTests = () => {
    setTests([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const showTestDetails = (test: TestResult) => {
    if (test.details) {
      Alert.alert(
        `${test.name} Details`,
        JSON.stringify(test.details, null, 2),
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    // Log environment on component mount
    
    // Supabase check complete
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Supabase Integration Debug</Text>
        <Text style={styles.subtitle}>Test Supabase connectivity in React Native environment</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Run All Tests</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={clearTests}
            disabled={isRunning}
          >
            <Text style={[styles.buttonText, { color: '#374151' }]}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          
          {tests.length === 0 ? (
            <Text style={styles.noResults}>No tests run yet</Text>
          ) : (
            tests.map((test, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.testResult,
                  { borderLeftColor: getStatusColor(test.status) }
                ]}
                onPress={() => showTestDetails(test)}
              >
                <View style={styles.testHeader}>
                  <Text style={styles.testIcon}>{getStatusIcon(test.status)}</Text>
                  <Text style={styles.testName}>{test.name}</Text>
                </View>
                <Text style={[
                  styles.testMessage,
                  { color: getStatusColor(test.status) }
                ]}>
                  {test.message}
                </Text>
                {test.details && (
                  <Text style={styles.testDetailsHint}>Tap for details</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.summaryContainer}>
          {tests.length > 0 && (
            <>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>
                Total: {tests.length} | 
                Passed: {tests.filter(t => t.status === 'success').length} | 
                Failed: {tests.filter(t => t.status === 'error').length} |
                Running: {tests.filter(t => t.status === 'pending').length}
              </Text>
              <Text style={styles.summaryRate}>
                Success Rate: {tests.length > 0 ? Math.round((tests.filter(t => t.status === 'success').length / tests.length) * 100) : 0}%
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  noResults: {
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 24,
  },
  testResult: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  testMessage: {
    fontSize: 14,
    marginLeft: 26,
  },
  testDetailsHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginLeft: 26,
    marginTop: 4,
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
});
