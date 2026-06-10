import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReferralDashboard } from '../../components/referrals';
import { ProfileScreenProps } from '../../types/navigation';

export default function ReferralProgramScreen({ navigation: _navigation }: ProfileScreenProps<'ReferralProgram'>) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ReferralDashboard />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
});
