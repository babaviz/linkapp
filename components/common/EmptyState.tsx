import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';

export type EmptyStateTone = 'light' | 'dark';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  tone?: EmptyStateTone;
  accentColor?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  testID?: string;
}

const DEFAULT_ACCENT = '#10B981';

export default function EmptyState({
  icon,
  title,
  description,
  tone = 'light',
  accentColor,
  primaryAction,
  secondaryAction,
  style,
  contentStyle,
  titleStyle,
  descriptionStyle,
  testID,
}: EmptyStateProps) {
  const isDark = tone === 'dark';
  const resolvedAccent = accentColor ?? DEFAULT_ACCENT;

  const titleColor = isDark ? '#FFFFFF' : '#111827';
  const descriptionColor = isDark ? 'rgba(255,255,255,0.75)' : '#6B7280';

  const primaryBg = isDark ? '#FFFFFF' : resolvedAccent;
  const primaryText = isDark ? '#111827' : '#FFFFFF';

  const secondaryBorder = isDark ? 'rgba(255,255,255,0.5)' : '#E5E7EB';
  const secondaryText = isDark ? '#FFFFFF' : '#111827';

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={[styles.content, contentStyle]}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}

        <Text style={[styles.title, { color: titleColor }, titleStyle]}>{title}</Text>

        {description ? (
          <Text style={[styles.description, { color: descriptionColor }, descriptionStyle]}>
            {description}
          </Text>
        ) : null}

        {(primaryAction || secondaryAction) ? (
          <View style={styles.actions}>
            {primaryAction ? (
              <Pressable
                onPress={primaryAction.onPress}
                accessibilityRole="button"
                accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: primaryBg,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={[styles.primaryButtonText, { color: primaryText }]}>
                  {primaryAction.label}
                </Text>
              </Pressable>
            ) : null}

            {secondaryAction ? (
              <Pressable
                onPress={secondaryAction.onPress}
                accessibilityRole="button"
                accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: secondaryBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: secondaryText }]}>
                  {secondaryAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...getCrossPlatformShadow({
      width: 0,
      height: 6,
      radius: 12,
      opacity: 0.12,
      color: '#000',
      elevation: 6,
    }),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

