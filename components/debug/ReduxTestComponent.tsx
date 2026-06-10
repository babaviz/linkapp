/**
 * Redux Test Component
 * Use this component to quickly test Redux state management
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signIn, clearError } from '../../redux/slices/authSlice';
import { updateSearchFilters } from '../../redux/slices/searchSlice';

export const ReduxTestComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Test reading from multiple slices
  const auth = useAppSelector(state => state.auth);
  const user = useAppSelector(state => state.user);
  const datemi = useAppSelector(state => state.datemi);
  const search = useAppSelector(state => state.search);
  const subscription = useAppSelector(state => state.subscription);
  const call = useAppSelector(state => state.call);

  const testSyncAction = () => {
    dispatch(clearError());
    
  };

  const testAsyncAction = async () => {
    try {
      const result = await dispatch(signIn({ 
        email: 'demo@test.com', 
        password: 'demo123' 
      }));
      
    } catch (error) {
      
    }
  };

  const testComplexAction = () => {
    dispatch(updateSearchFilters({
      location: {
        address: 'Nairobi',
        coordinates: { latitude: -1.286389, longitude: 36.817223 }
      },
      priceRange: { min: 10000, max: 50000 }
    }));
    
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Redux State Test</Text>
      
      {/* State Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Current State</Text>
        
        <Text style={styles.stateText}>
          Auth: {auth.isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}
          {auth.user && ` (${auth.user.fullName})`}
          {auth.isLoading && ' ⏳ Loading...'}
        </Text>
        
        <Text style={styles.stateText}>
          User: {user.currentProfile ? '✅ Profile loaded' : '❌ No profile'}
          {user.currentProfile && ` (${user.currentProfile.fullName})`}
        </Text>
        
        <Text style={styles.stateText}>
          DateMi: {datemi.isAgeVerified ? '✅ Age verified' : '❌ Not verified'}
          {datemi.myProfile && ` | Profile: ${datemi.myProfile.displayName}`}
        </Text>
        
        <Text style={styles.stateText}>
          Search: {(search.currentQuery as any)?.query || 'No active query'}
          {search.searchResults?.results && ` | ${search.searchResults.results.length} results`}
        </Text>
        
        <Text style={styles.stateText}>
          Subscription: {subscription.currentSubscription?.tier || 'free'} 
          {subscription.currentSubscription?.status && ` (${subscription.currentSubscription.status})`}
        </Text>
        
        <Text style={styles.stateText}>
          Call: {call?.activeCall?.id ? `📞 Active call: ${call.activeCall.id}` : '📞 No active call'}
        </Text>
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Test Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={testSyncAction}>
          <Text style={styles.buttonText}>Test Sync Action</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testAsyncAction}>
          <Text style={styles.buttonText}>Test Async Action</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testComplexAction}>
          <Text style={styles.buttonText}>Test Complex Action</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {auth.error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>❌ Auth Error</Text>
          <Text style={styles.errorText}>{auth.error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  stateText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorSection: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
  },
});

export default ReduxTestComponent;
