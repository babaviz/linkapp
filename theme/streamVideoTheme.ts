import type { DeepPartial, Theme } from '@stream-io/video-react-native-sdk';

/**
 * Minimal Stream Video theme overrides for DateMi.
 * Deep-merged with the SDK default theme.
 */
const themeOverrides = {
  colors: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    iconPrimary: '#FFFFFF',
    iconSecondary: 'rgba(255, 255, 255, 0.8)',
    sheetOverlay: 'rgba(0, 0, 0, 0.55)',
    sheetPrimary: 'rgba(0, 0, 0, 0.7)',
    sheetSecondary: 'rgba(0, 0, 0, 0.85)',
    buttonPrimary: '#8B5CF6',
    buttonSecondary: '#EC4899',
    buttonSuccess: '#10B981',
    buttonWarning: '#F59E0B',
    buttonDisabled: 'rgba(255, 255, 255, 0.18)',
  },
  callContent: {
    container: {
      backgroundColor: '#000000',
    },
  },
  participantLabel: {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    userNameLabel: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  },
  participantNetworkQualityIndicator: {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
  },
};

// NOTE: The SDK's exported DeepPartial type is overly strict for primitive leaf values
// (e.g. ColorValue). We cast to the expected type to keep integration type-safe at usage sites.
export const streamVideoTheme = themeOverrides as unknown as DeepPartial<Theme>;

