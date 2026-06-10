/**
 * PromptDialog Component
 * A polished dialog component with text input (replaces Alert.prompt)
 * Features improved UI/UX with consistent styling and validation
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
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
import { getUserFacingErrorMessage } from '../../utils/userFacingError';

export interface PromptDialogButton {
  text: string;
  onPress?: (input: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}

export interface PromptDialogProps {
  /** Dialog visibility */
  visible: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/placeholder */
  message?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Default input value */
  defaultValue?: string;
  /** Input type */
  inputType?: 'plain-text' | 'secure-text' | 'numeric' | 'email';
  /** Keyboard type */
  keyboardType?: 'default' | 'numeric' | 'email-address';
  /** Auto-capitalize */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Buttons */
  buttons?: PromptDialogButton[];
  /** Close callback */
  onClose?: () => void;
  /** Show icon */
  icon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  /** Validation function */
  validate?: (input: string) => boolean | string;
  /** Dark mode override */
  isDarkMode?: boolean;
  /** Dismiss on backdrop press */
  dismissOnBackdrop?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  visible,
  title,
  message,
  placeholder,
  defaultValue = '',
  inputType = 'plain-text',
  keyboardType,
  autoCapitalize = 'none',
  buttons = [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'default' },
  ],
  onClose,
  icon,
  validate,
  isDarkMode = false,
  dismissOnBackdrop = true,
  accessibilityLabel,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { isDesktop, isTablet } = useResponsiveDimensions();
  const [inputValue, setInputValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setInputValue(defaultValue);
      setError(null);
      setIsLoading(false);
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
      ]).start(() => {
        // Focus input after animation
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });
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
  }, [visible, defaultValue]);

  // Theme colors
  const theme = {
    background: isDarkMode ? colors.base.gray[800] : colors.base.white,
    inputBackground: isDarkMode ? colors.base.gray[700] : colors.base.gray[50],
    inputBorder: isDarkMode ? colors.base.gray[600] : colors.base.gray[300],
    inputBorderFocused: colors.base.info.main,
    text: {
      primary: isDarkMode ? colors.base.white : colors.base.gray[900],
      secondary: isDarkMode ? colors.base.gray[300] : colors.base.gray[600],
      placeholder: isDarkMode ? colors.base.gray[500] : colors.base.gray[400],
    },
    border: isDarkMode ? colors.base.gray[600] : colors.base.gray[200],
    overlay: 'rgba(0, 0, 0, 0.5)',
    error: colors.base.error.main,
  };

  // Determine keyboard type from input type
  const getKeyboardType = () => {
    if (keyboardType) return keyboardType;
    switch (inputType) {
      case 'numeric':
        return 'numeric';
      case 'email':
        return 'email-address';
      default:
        return 'default';
    }
  };

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && onClose) {
      onClose();
    }
  };

  const handleButtonPress = async (button: PromptDialogButton) => {
    if (button.disabled || button.loading || isLoading) return;

    if (button.style === 'cancel') {
      if (onClose) {
        onClose();
      }
      return;
    }

    // Validate input
    if (validate) {
      const validationResult = validate(inputValue);
      if (validationResult !== true) {
        setError(typeof validationResult === 'string' ? validationResult : 'Invalid input');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (button.onPress) {
        await button.onPress(inputValue);
      }
      
      // Auto-close after successful action
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 100);
      }
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'complete that action' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate dialog width
  const dialogWidth = Math.min(
    isDesktop ? 450 : isTablet ? screenWidth * 0.65 : screenWidth * 0.9,
    450
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
          {icon && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.base.info.light },
              ]}
            >
              <MaterialIcons
                name={icon.name}
                size={icon.size || 32}
                color={icon.color || colors.base.info.main}
              />
            </View>
          )}

          {/* Title */}
          <Text
            style={[styles.title, { color: theme.text.primary }]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text
              style={[styles.message, { color: theme.text.secondary }]}
              numberOfLines={4}
            >
              {message}
            </Text>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: error ? theme.error : theme.inputBorder,
                  color: theme.text.primary,
                },
                error && styles.inputError,
              ]}
              value={inputValue}
              onChangeText={(text) => {
                setInputValue(text);
                if (error) setError(null);
              }}
              placeholder={placeholder || 'Enter text...'}
              placeholderTextColor={theme.text.placeholder}
              secureTextEntry={inputType === 'secure-text'}
              keyboardType={getKeyboardType()}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              editable={!isLoading}
              accessibilityLabel="Text input"
            />
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons
                  name="error-outline"
                  size={16}
                  color={theme.error}
                />
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
              </View>
            )}
          </View>

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
                  (button.disabled || isLoading) && styles.buttonDisabled,
                ];

                const textStyle = [
                  styles.buttonText,
                  isCancel && [styles.buttonTextCancel, { color: theme.text.primary }],
                  isDestructive && styles.buttonTextDestructive,
                  isPrimary && !isDestructive && styles.buttonTextPrimary,
                  (button.disabled || isLoading) && { color: theme.text.secondary },
                ];

                return (
                  <TouchableOpacity
                    key={index}
                    style={buttonStyle}
                    onPress={() => handleButtonPress(button)}
                    disabled={button.disabled || button.loading || isLoading}
                    accessibilityLabel={button.text}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    {(button.loading || isLoading) && !isCancel ? (
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
    padding: 24,
    borderWidth: 1,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 16,
    minHeight: 52,
  },
  inputError: {
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonHalfWidth: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
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
});

export default PromptDialog;

