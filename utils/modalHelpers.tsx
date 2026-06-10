/**
 * Modal Helper Utilities
 * Provides consistent modal behavior and styling across the app
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  showCloseButton?: boolean;
  leftAction?: {
    label: string;
    onPress: () => void;
    color?: string;
  };
  rightAction?: {
    label: string;
    onPress: () => void;
    color?: string;
    disabled?: boolean;
  };
  isDarkMode?: boolean;
}

export interface ModalFooterProps {
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    destructive?: boolean;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  cancelAction?: {
    label?: string;
    onPress: () => void;
  };
  isDarkMode?: boolean;
}

// Standard Modal Header Component
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showCloseButton = true,
  leftAction,
  rightAction,
  isDarkMode = false,
}) => {
  const theme = getTheme(isDarkMode);

  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      {/* Left Action or Close Button */}
      <View style={styles.headerLeft}>
        {leftAction ? (
          <TouchableOpacity
            onPress={leftAction.onPress}
            style={styles.headerActionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.headerActionText, { color: leftAction.color || theme.primary }]}>
              {leftAction.label}
            </Text>
          </TouchableOpacity>
        ) : showCloseButton ? (
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeIconButton, { backgroundColor: theme.surface }]}
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={20} color={theme.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionButton} />
        )}
      </View>

      {/* Title */}
      <View style={styles.headerCenter}>
        <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.text.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Action */}
      <View style={styles.headerRight}>
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.headerActionButton}
            disabled={rightAction.disabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.headerActionText,
                {
                  color: rightAction.disabled
                    ? theme.text.disabled
                    : rightAction.color || theme.primary,
                },
              ]}
            >
              {rightAction.label}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionButton} />
        )}
      </View>
    </View>
  );
};

// Standard Modal Footer Component
export const ModalFooter: React.FC<ModalFooterProps> = ({
  primaryAction,
  secondaryAction,
  cancelAction,
  isDarkMode = false,
}) => {
  const theme = getTheme(isDarkMode);

  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <View style={styles.footerButtons}>
        {/* Cancel/Secondary Actions */}
        {(cancelAction || secondaryAction) && (
          <View style={styles.leftButtons}>
            {cancelAction && (
              <TouchableOpacity
                onPress={cancelAction.onPress}
                style={[styles.cancelButton, { borderColor: theme.border }]}
                accessibilityLabel={cancelAction.label || "Cancel"}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.primary }]}>
                  {cancelAction.label || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
            {secondaryAction && (
              <TouchableOpacity
                onPress={secondaryAction.onPress}
                style={[styles.secondaryButton, { backgroundColor: theme.surface }]}
                disabled={secondaryAction.disabled}
                accessibilityLabel={secondaryAction.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    {
                      color: secondaryAction.disabled
                        ? theme.text.disabled
                        : theme.text.primary,
                    },
                  ]}
                >
                  {secondaryAction.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Primary Action */}
        {primaryAction && (
          <TouchableOpacity
            onPress={primaryAction.onPress}
            style={[
              styles.primaryButton,
              {
                backgroundColor: primaryAction.destructive
                  ? theme.danger
                  : primaryAction.disabled
                  ? theme.disabled
                  : theme.primary,
              },
            ]}
            disabled={primaryAction.disabled || primaryAction.loading}
            accessibilityLabel={primaryAction.label}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {primaryAction.loading ? 'Loading...' : primaryAction.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Quick Confirmation Modal Helper
export const createConfirmationModal = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return {
    title,
    message,
    buttons: [
      {
        text: cancelLabel,
        style: 'cancel' as const,
        onPress: onCancel,
      },
      {
        text: confirmLabel,
        style: destructive ? ('destructive' as const) : ('default' as const),
        onPress: onConfirm,
      },
    ],
  };
};

// Modal Size Presets
export const MODAL_SIZES = {
  small: {
    width: Math.min(SCREEN_WIDTH * 0.85, 350),
    maxHeight: '50%',
  },
  medium: {
    width: Math.min(SCREEN_WIDTH * 0.9, 450),
    maxHeight: '70%',
  },
  large: {
    width: Math.min(SCREEN_WIDTH * 0.95, 550),
    maxHeight: '85%',
  },
  fullscreen: {
    width: '100%',
    height: '100%',
  },
};

// Theme helper
const getTheme = (isDarkMode: boolean) => ({
  primary: isDarkMode ? '#60A5FA' : '#3B82F6',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  disabled: isDarkMode ? '#4B5563' : '#9CA3AF',
  surface: isDarkMode ? '#374151' : '#F3F4F6',
  border: isDarkMode ? '#374151' : '#E5E7EB',
  text: {
    primary: isDarkMode ? '#F9FAFB' : '#111827',
    secondary: isDarkMode ? '#D1D5DB' : '#6B7280',
    disabled: isDarkMode ? '#6B7280' : '#9CA3AF',
  },
});

// Animation presets
export const MODAL_ANIMATIONS = {
  slideUp: {
    animationType: 'slide' as const,
    presentationStyle: 'pageSheet' as const,
  },
  fade: {
    animationType: 'fade' as const,
    presentationStyle: 'overFullScreen' as const,
  },
  slideFromRight: {
    animationType: 'slide' as const,
    presentationStyle: 'formSheet' as const,
  },
};

// Common modal props for consistency
export const getModalProps = (type: 'default' | 'fullscreen' | 'sheet' = 'default') => {
  switch (type) {
    case 'fullscreen':
      return {
        animationType: 'slide' as const,
        presentationStyle: 'fullScreen' as const,
        statusBarTranslucent: true,
      };
    case 'sheet':
      return {
        animationType: 'slide' as const,
        presentationStyle: Platform.OS === 'ios' ? ('pageSheet' as const) : ('fullScreen' as const),
        statusBarTranslucent: Platform.OS === 'android',
      };
    default:
      return {
        animationType: 'fade' as const,
        presentationStyle: 'overFullScreen' as const,
        transparent: true,
        statusBarTranslucent: true,
      };
  }
};

// Accessibility helpers
export const getModalAccessibilityProps = (label: string) => ({
  accessible: true,
  accessibilityViewIsModal: true,
  accessibilityLabel: label,
  importantForAccessibility: 'yes' as const,
});

const styles = StyleSheet.create({
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerLeft: {
    width: 48,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerRight: {
    width: 48,
    alignItems: 'flex-end',
  },
  headerActionButton: {
    minWidth: 48,
    minHeight: 32,
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },

  // Footer Styles
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtons: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default {
  ModalHeader,
  ModalFooter,
  createConfirmationModal,
  MODAL_SIZES,
  MODAL_ANIMATIONS,
  getModalProps,
  getModalAccessibilityProps,
};
