/**
 * EscrowTransactionsScreen.tsx
 * TODO: To be implemented in future release
 * This feature will handle escrow transactions for DateMi services
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EscrowTransactionsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚧 Coming Soon</Text>
        <Text style={styles.message}>
          Escrow Transactions feature will be available in a future release.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  }
});
