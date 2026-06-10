/**
 * SearchBar Component
 * Accessible and responsive search bar following Material 3 design principles
 */

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
  Keyboard
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { useColorScheme } from 'react-native';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  leftIcon?: string;
  rightIcon?: string;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: number;
  elevation?: number;
}

export interface SearchBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  isFocused: () => boolean;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>((props, ref) => {
  const {
    value,
    onChangeText,
    onSubmit,
    onClear,
    onFocus,
    onBlur,
    placeholder = 'Search...',
    autoFocus = false,
    editable = true,
    showClearButton = true,
    showSearchIcon = true,
    containerStyle,
    inputStyle,
    leftIcon = 'search',
    rightIcon,
    onLeftIconPress,
    onRightIconPress,
    accessibilityLabel = 'Search input',
    accessibilityHint = 'Type to search for properties',
    testID = 'search-bar',
    theme = 'auto',
    variant = 'filled',
    size = 'medium',
    borderRadius = 12,
    elevation = 2
  } = props;

  const { isTablet, width } = getDynamicDimensions();
  const colorScheme = useColorScheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Determine theme
  const currentTheme = theme === 'auto' ? (colorScheme || 'light') : theme;
  const isDark = currentTheme === 'dark';

  // Theme colors
  const colors = {
    background: isDark ? '#1F2937' : '#FFFFFF',
    surface: isDark ? '#374151' : '#F9FAFB',
    border: isDark ? '#4B5563' : '#E5E7EB',
    borderFocused: isDark ? '#60A5FA' : '#3B82F6',
    text: isDark ? '#F9FAFB' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    placeholder: isDark ? '#6B7280' : '#9CA3AF',
    iconActive: isDark ? '#60A5FA' : '#3B82F6',
    iconInactive: isDark ? '#9CA3AF' : '#6B7280',
    clear: isDark ? '#EF4444' : '#DC2626',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Size configurations
  const sizeConfig = {
    small: {
      height: 44,
      fontSize: fontSize.sm,
      iconSize: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    medium: {
      height: 52,
      fontSize: fontSize.base,
      iconSize: 20,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    large: {
      height: 60,
      fontSize: fontSize.lg,
      iconSize: 24,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
  };

  const config = sizeConfig[size];

  // Imperative methods
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: handleClear,
    isFocused: () => isFocused,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value.trim());
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
    
    // Announce clear action for accessibility
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Search cleared');
    }
  };

  const handleLeftIconPress = () => {
    if (onLeftIconPress) {
      onLeftIconPress();
    } else {
      handleSubmit();
    }
  };

  // Dynamic styles
  const getContainerStyle = () => {
    const baseStyle = {
      height: config.height,
      borderRadius,
      paddingHorizontal: config.paddingHorizontal,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: isFocused ? 0.15 : 0.08,
      shadowRadius: elevation * 2,
      elevation: elevation,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: isFocused ? 2 : 1,
          borderColor: isFocused ? colors.borderFocused : colors.border,
        };
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: colors.surface,
          borderWidth: isFocused ? 2 : 0,
          borderColor: isFocused ? colors.borderFocused : 'transparent',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.background,
          borderWidth: isFocused ? 2 : 1,
          borderColor: isFocused ? colors.borderFocused : colors.border,
        };
    }
  };

  const getInputStyle = () => ({
    flex: 1,
    fontSize: config.fontSize,
    color: colors.text,
    paddingVertical: config.paddingVertical,
    paddingHorizontal: spacing.xs,
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
    ...inputStyle,
  });

  return (
    <Animated.View
      style={[
        getContainerStyle(),
        {
          transform: [{
            scale: focusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.01],
            })
          }],
        },
        containerStyle,
      ]}
      testID={`${testID}-container`}
    >
      {/* Left Icon */}
      {showSearchIcon && (
        <TouchableOpacity
          onPress={handleLeftIconPress}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Search button"
          accessibilityHint="Tap to perform search"
          testID={`${testID}-search-icon`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name={leftIcon as any}
            size={config.iconSize}
            color={isFocused ? colors.iconActive : colors.iconInactive}
          />
        </TouchableOpacity>
      )}

      {/* Text Input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={getInputStyle()}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="search"
        clearButtonMode="never" // We handle clear button manually
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="search"
        accessibilityState={{ disabled: !editable }}
        testID={`${testID}-input`}
        importantForAccessibility="yes"
      />

      {/* Clear Button */}
      {showClearButton && value.length > 0 && (
        <Animated.View
          style={{
            opacity: focusAnim,
          }}
        >
          <TouchableOpacity
            onPress={handleClear}
            style={[styles.iconButton, { paddingLeft: spacing.xs }]}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint="Tap to clear search text"
            testID={`${testID}-clear-button`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="clear"
              size={config.iconSize - 2}
              color={colors.clear}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Right Icon */}
      {rightIcon && (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={[styles.iconButton, { paddingLeft: spacing.xs }]}
          accessibilityRole="button"
          accessibilityLabel="Additional action"
          testID={`${testID}-right-icon`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name={rightIcon as any}
            size={config.iconSize}
            color={colors.iconInactive}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
