/**
 * Simple Upgrade Prompt Component for Testing
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';

interface UpgradePromptSimpleProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  tier?: 'pro' | 'premium';
}

export const UpgradePromptSimple: React.FC<UpgradePromptSimpleProps> = ({
  visible,
  onClose,
  feature,
  tier = 'pro',
}) => {

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            Upgrade to {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Text>
          <Text style={styles.subtitle}>
            {feature ? `${feature} is a premium feature.` : 'Upgrade to unlock premium features!'}
          </Text>
          
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
