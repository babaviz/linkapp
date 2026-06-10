/**
 * BaseModal Component
 * A standardized, reusable modal component with consistent styling and behavior
 * Supports both light and dark themes with smooth animations
 */

import React, { useRef, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useResponsiveDimensions, getDeviceType } from '../../utils/responsive';

export interface BaseModalProps {
  /** Modal visibility */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Modal title (optional) */
  title?: string;
  /** Modal subtitle (optional) */
  subtitle?: string;
  /** Custom header content */
  headerContent?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Footer content (optional) */
  footerContent?: ReactNode;
  /** Animation type */
  animationType?: 'slide' | 'fade' | 'slideUp';
  /** Modal size */
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Enable dismiss on backdrop tap */
  dismissOnBackdrop?: boolean;
  /** Enable dismiss on back button */
  dismissOnBackButton?: boolean;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Dark mode override */
  isDarkMode?: boolean;
  /** Disable scrolling */
  disableScroll?: boolean;
  /** Custom container style */
  containerStyle?: any;
  /** Custom content style */
  contentStyle?: any;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Status bar style override */
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
}

export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  headerContent,
  children,
  footerContent,
  animationType = 'slideUp',
  size = 'medium',
  dismissOnBackdrop = true,
  dismissOnBackButton = true,
  showCloseButton = true,
  isDarkMode = false,
  disableScroll = false,
  containerStyle,
  contentStyle,
  accessibilityLabel,
  statusBarStyle,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { deviceType, isDesktop, isTablet } = useResponsiveDimensions();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        animationType === 'slideUp'
          ? Animated.spring(slideAnim, {
              toValue: 0,
              tension: 65,
              friction: 8,
              useNativeDriver: true,
            })
          : animationType === 'fade'
          ? Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 65,
                friction: 8,
                useNativeDriver: true,
              }),
            ])
          : Animated.timing(slideAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
      ]).start();
    } else {
      // Hide animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        animationType === 'slideUp'
          ? Animated.timing(slideAnim, {
              toValue: screenHeight,
              duration: 250,
              useNativeDriver: true,
            })
          : animationType === 'fade'
          ? Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 250,
                useNativeDriver: true,
              }),
            ])
          : Animated.timing(slideAnim, {
              toValue: screenHeight,
              duration: 250,
              useNativeDriver: true,
            }),
      ]).start();
    }
  }, [visible, animationType, screenHeight]);

  // Theme colors
  const theme = {
    background: isDarkMode ? colors.base.gray[800] : colors.base.white,
    surface: isDarkMode ? colors.base.gray[700] : colors.base.gray[50],
    text: {
      primary: isDarkMode ? colors.base.white : colors.base.gray[900],
      secondary: isDarkMode ? colors.base.gray[300] : colors.base.gray[600],
      tertiary: isDarkMode ? colors.base.gray[400] : colors.base.gray[500],
    },
    border: isDarkMode ? colors.base.gray[600] : colors.base.gray[200],
    overlay: 'rgba(0, 0, 0, 0.6)',
  };

  // Modal dimensions based on size and device type
  const getModalDimensions = () => {
    // Desktop and tablet use smaller width percentages for better UX
    const widthMultipliers = {
      small: isDesktop ? 0.4 : isTablet ? 0.6 : 0.85,
      medium: isDesktop ? 0.5 : isTablet ? 0.7 : 0.9,
      large: isDesktop ? 0.65 : isTablet ? 0.8 : 0.95,
      fullscreen: 1,
    };
    
    const maxWidths = {
      small: isDesktop ? 500 : 400,
      medium: isDesktop ? 700 : 500,
      large: isDesktop ? 900 : 600,
      fullscreen: screenWidth,
    };
    
    switch (size) {
      case 'small':
        return {
          width: Math.min(screenWidth * widthMultipliers.small, maxWidths.small),
          maxHeight: screenHeight * 0.5,
        };
      case 'medium':
        return {
          width: Math.min(screenWidth * widthMultipliers.medium, maxWidths.medium),
          maxHeight: screenHeight * 0.7,
        };
      case 'large':
        return {
          width: Math.min(screenWidth * widthMultipliers.large, maxWidths.large),
          maxHeight: screenHeight * 0.85,
        };
      case 'fullscreen':
        return {
          width: screenWidth,
          maxHeight: screenHeight,
        };
      default:
        return {
          width: Math.min(screenWidth * 0.9, 500),
          maxHeight: screenHeight * 0.7,
        };
    }
  };

  const modalDimensions = getModalDimensions();

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  // Animation transforms
  const getAnimatedStyles = () => {
    if (animationType === 'fade') {
      return {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      };
    }
    return {
      transform: [
        {
          translateY:
            animationType === 'slideUp' || animationType === 'slide'
              ? slideAnim
              : 0,
        },
      ],
    };
  };

  const ContentWrapper = disableScroll ? View : ScrollView;
  const contentWrapperProps = disableScroll
    ? {}
    : {
        showsVerticalScrollIndicator: false,
        contentContainerStyle: { flexGrow: 1 },
        contentInsetAdjustmentBehavior: "automatic" as const,
        keyboardShouldPersistTaps: 'handled' as const,
      };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={dismissOnBackButton ? onClose : undefined}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
      statusBarTranslucent
    >
      {/* Status Bar */}
      {Platform.OS === 'ios' && statusBarStyle && (
        <StatusBar barStyle={statusBarStyle} />
      )}

      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: theme.overlay,
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Modal Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View
          style={[
            styles.modalWrapper,
            size === 'fullscreen' && styles.fullscreenWrapper,
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                width: modalDimensions.width,
                maxHeight: modalDimensions.maxHeight,
              },
              size === 'fullscreen' && styles.fullscreenContainer,
              getAnimatedStyles(),
              containerStyle,
            ]}
          >
            <SafeAreaView
              style={styles.safeArea}
              edges={size === 'fullscreen' ? ['top', 'bottom'] : []}
            >
              {/* Header */}
              {(title || headerContent || showCloseButton) && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.headerContent}>
                    {headerContent || (
                      <View style={styles.titleContainer}>
                        {title && (
                          <Text
                            style={[
                              styles.title,
                              { color: theme.text.primary },
                            ]}
                            numberOfLines={2}
                          >
                            {title}
                          </Text>
                        )}
                        {subtitle && (
                          <Text
                            style={[
                              styles.subtitle,
                              { color: theme.text.secondary },
                            ]}
                            numberOfLines={3}
                          >
                            {subtitle}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={[
                        styles.closeButton,
                        { backgroundColor: theme.surface },
                      ]}
                      accessibilityLabel="Close modal"
                      accessibilityRole="button"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={theme.text.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <ContentWrapper
                style={[styles.content, contentStyle]}
                {...contentWrapperProps}
              >
                {children}
              </ContentWrapper>

              {/* Footer */}
              {footerContent && (
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: theme.border },
                  ]}
                >
                  {footerContent}
                </View>
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoid: {
    flex: 1,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  fullscreenWrapper: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modalContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 25, // For Android
    borderWidth: 1,
  },
  fullscreenContainer: {
    borderRadius: 0,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
});

export default BaseModal;
