import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatColors } from '../../theme/streamChatTheme';

export type ChatWallpaperVariant = 'default' | 'property' | 'job' | 'service' | 'datemi';

export interface ChatWallpaperProps {
  variant?: ChatWallpaperVariant;
}

const variantAccents: Record<ChatWallpaperVariant, { primary: string; secondary: string }> = {
  default: { primary: ChatColors.primary, secondary: ChatColors.primaryLight },
  property: { primary: ChatColors.primary, secondary: ChatColors.primaryLight },
  job: { primary: ChatColors.success, secondary: '#34D399' },
  service: { primary: ChatColors.warning, secondary: '#FBBF24' },
  datemi: { primary: '#EC4899', secondary: '#F472B6' },
};

export const ChatWallpaper = memo(function ChatWallpaper({ variant = 'default' }: ChatWallpaperProps) {
  // Chat wallpaper is forced to dark for consistent UX.
  const isDarkMode = true;
  const accents = variantAccents[variant] || variantAccents.default;

  const baseGradientColors: [string, string] = isDarkMode
    ? ['#0B1220', '#111827']
    : [ChatColors.gray50, ChatColors.white];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={baseGradientColors} style={StyleSheet.absoluteFill} />

      {/* Subtle accent blobs (kept minimal for perf) */}
      <View
        style={[
          styles.blob,
          styles.blobTopRight,
          {
            backgroundColor: accents.primary,
            opacity: isDarkMode ? 0.12 : 0.08,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomLeft,
          {
            backgroundColor: accents.secondary,
            opacity: isDarkMode ? 0.10 : 0.06,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  blobTopRight: {
    top: -190,
    right: -160,
  },
  blobBottomLeft: {
    bottom: -220,
    left: -170,
  },
});

