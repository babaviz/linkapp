import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

interface NotificationPermissionBannerProps {
  visible: boolean;
  onRequestPermission: () => void;
  onDismiss: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  visible,
  onRequestPermission,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="notifications-outline" 
            size={24} 
            color={colors.primary[600]} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.description}>
            Get notified about new job opportunities, messages, and important updates
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons 
            name="close" 
            size={20} 
            color={colors.text.tertiary} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.laterButton}
          onPress={onDismiss}
        >
          <Text style={styles.laterButtonText}>Maybe Later</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.allowButton}
          onPress={onRequestPermission}
        >
          <Text style={styles.allowButtonText}>Allow Notifications</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    padding: spacing[4],
    ...shadows.base,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  dismissButton: {
    padding: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  laterButton: {
    flex: 1,
    backgroundColor: colors.secondary[100],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  allowButton: {
    flex: 1,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.inverse,
  },
});
