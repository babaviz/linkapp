/**
 * AppAlertModal - Modern error/alert modal matching LinkApp auth design
 * Replaces native Alert.alert with styled modal (light theme, rounded corners, app colors)
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { typography } from '../../theme';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel';
}

export interface AppAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AppAlertButton[];
  onClose: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
}

const AUTH_COLORS = {
  primary: '#1A237E',
  primaryLight: '#E8EAF6',
  textPrimary: '#1A237E',
  textSecondary: '#546E7A',
  textMuted: '#37474F',
  surface: '#FFFFFF',
  border: '#E0E0E0',
} as const;

export const AppAlertModal: React.FC<AppAlertModalProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  icon = 'info-outline',
  iconColor = AUTH_COLORS.primary,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
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
          toValue: 0.9,
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
  }, [visible, scaleAnim, opacityAnim, backdropAnim]);

  const handleButtonPress = (button: AppAlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const dialogWidth = Math.min(screenWidth * 0.88, 340);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
      accessibilityLabel={title}
    >
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
          onPress={() => {
            const cancelBtn = buttons.find((b) => b.style === 'cancel');
            if (cancelBtn?.onPress) cancelBtn.onPress();
            onClose();
          }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
      </Animated.View>

      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            {
              width: dialogWidth,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconWrapper}>
            <MaterialIcons
              name={icon}
              size={36}
              color={iconColor}
            />
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.message} numberOfLines={6}>
            {message}
          </Text>

          <View
            style={[
              styles.buttonRow,
              buttons.length > 2 && styles.buttonColumn,
            ]}
          >
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isCancel ? styles.buttonCancel : styles.buttonPrimary,
                    buttons.length === 1 && styles.buttonFull,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.85}
                  accessibilityLabel={button.text}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel ? styles.buttonTextCancel : styles.buttonTextPrimary,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    backgroundColor: AUTH_COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A237E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AUTH_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: AUTH_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: AUTH_COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: AUTH_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: AUTH_COLORS.textMuted,
  },
});

export default AppAlertModal;
