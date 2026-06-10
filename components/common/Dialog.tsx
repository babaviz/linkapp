/**
 * Dialog Component
 * A polished, reusable dialog component that replaces Alert.alert
 * Features improved UI/UX with consistent styling, typography, and accessibility
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useResponsiveDimensions } from '../../utils/responsive';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}

export interface DialogProps {
  /** Dialog visibility */
  visible: boolean;
  /** Dialog title */
  title?: string;
  /** Dialog message/content */
  message?: string;
  /** Custom content (overrides message) */
  children?: React.ReactNode;
  /** Dialog buttons */
  buttons?: DialogButton[];
  /** Close callback */
  onClose?: () => void;
  /** Show icon */
  icon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  /** Dialog type for predefined styles */
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Dark mode override */
  isDarkMode?: boolean;
  /** Dismiss on backdrop press */
  dismissOnBackdrop?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  message,
  children,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  icon,
  type = 'default',
  isDarkMode = false,
  dismissOnBackdrop = true,
  accessibilityLabel,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { isDesktop, isTablet } = useResponsiveDimensions();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Theme colors
  const theme = {
    background: isDarkMode ? colors.base.gray[800] : colors.base.white,
    text: {
      primary: isDarkMode ? colors.base.white : colors.base.gray[900],
      secondary: isDarkMode ? colors.base.gray[300] : colors.base.gray[600],
    },
    border: isDarkMode ? colors.base.gray[600] : colors.base.gray[200],
    overlay: 'rgba(0, 0, 0, 0.5)',
  };

  // Type-specific colors
  const getTypeColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: colors.base.success.main,
          background: colors.base.success.light,
        };
      case 'warning':
        return {
          icon: colors.base.warning.main,
          background: colors.base.warning.light,
        };
      case 'error':
        return {
          icon: colors.base.error.main,
          background: colors.base.error.light,
        };
      case 'info':
        return {
          icon: colors.base.info.main,
          background: colors.base.info.light,
        };
      default:
        return {
          icon: colors.base.info.main,
          background: isDarkMode ? colors.base.gray[700] : colors.base.gray[50],
        };
    }
  };

  const typeColors = getTypeColors();
  const defaultIcon = icon || (type !== 'default' ? {
    name: type === 'success' ? 'check-circle' : type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info',
    color: typeColors.icon,
    size: 48,
  } : undefined);

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && onClose) {
      onClose();
    }
  };

  const handleButtonPress = (button: DialogButton) => {
    if (button.disabled || button.loading) return;
    
    if (button.onPress) {
      button.onPress();
    }
    
    // Auto-close for default buttons unless they explicitly prevent it
    if (button.style !== 'cancel' && !button.onPress) {
      if (onClose) {
        onClose();
      }
    }
  };

  // Calculate dialog width
  const dialogWidth = Math.min(
    isDesktop ? 400 : isTablet ? screenWidth * 0.6 : screenWidth * 0.85,
    400
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel || title || 'Dialog'}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Dialog Container */}
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            {
              width: dialogWidth,
              backgroundColor: theme.background,
              borderColor: theme.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          {defaultIcon && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: typeColors.background },
              ]}
            >
              <MaterialIcons
                name={defaultIcon.name}
                size={defaultIcon.size || 48}
                color={defaultIcon.color || typeColors.icon}
              />
            </View>
          )}

          {/* Title */}
          {title && (
            <Text
              style={[styles.title, { color: theme.text.primary }]}
              numberOfLines={3}
            >
              {title}
            </Text>
          )}

          {/* Message or Children */}
          {children ? (
            <View style={styles.content}>{children}</View>
          ) : message ? (
            <Text
              style={[styles.message, { color: theme.text.secondary }]}
              numberOfLines={10}
            >
              {message}
            </Text>
          ) : null}

          {/* Buttons */}
          {buttons.length > 0 && (
            <View
              style={[
                styles.buttonContainer,
                buttons.length > 2 && styles.buttonContainerVertical,
              ]}
            >
              {buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                const isPrimary = !isCancel && !isDestructive && index === buttons.length - 1;
                const isLastButton = index === buttons.length - 1;

                const buttonStyle = [
                  styles.button,
                  buttons.length === 1 && styles.buttonFullWidth,
                  buttons.length === 2 && styles.buttonHalfWidth,
                  buttons.length > 2 && styles.buttonVertical,
                  isCancel && [
                    styles.buttonCancel,
                    { borderColor: theme.border },
                  ],
                  isDestructive && styles.buttonDestructive,
                  isPrimary && !isDestructive && styles.buttonPrimary,
                  button.disabled && styles.buttonDisabled,
                  // Add top margin for cancel button when it's last in vertical layout
                  isCancel && buttons.length > 2 && isLastButton && styles.buttonCancelSeparated,
                ];

                const textStyle = [
                  styles.buttonText,
                  isCancel && [styles.buttonTextCancel, { color: theme.text.primary }],
                  isDestructive && styles.buttonTextDestructive,
                  isPrimary && !isDestructive && styles.buttonTextPrimary,
                  button.disabled && { color: theme.text.secondary },
                ];

                return (
                  <TouchableOpacity
                    key={index}
                    style={buttonStyle}
                    onPress={() => handleButtonPress(button)}
                    disabled={button.disabled || button.loading}
                    accessibilityLabel={button.text}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    {button.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          isDestructive || isPrimary
                            ? colors.base.white
                            : theme.text.primary
                        }
                      />
                    ) : (
                      <Text style={textStyle}>{button.text}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderWidth: 1,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  content: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  buttonContainerVertical: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonHalfWidth: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
    flex: 0,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonPrimary: {
    backgroundColor: colors.base.info.main,
  },
  buttonDestructive: {
    backgroundColor: colors.base.error.main,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextCancel: {
    color: colors.base.gray[700],
  },
  buttonTextPrimary: {
    color: colors.base.white,
  },
  buttonTextDestructive: {
    color: colors.base.white,
  },
  buttonCancelSeparated: {
    marginTop: 6,
  },
});

export default Dialog;

