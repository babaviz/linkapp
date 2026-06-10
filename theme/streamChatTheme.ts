/**
 * Stream Chat Theme Configuration
 * 
 * Custom theme configuration for Stream Chat React Native SDK
 * that matches LinkApp's design system with consistent colors,
 * typography, and component styling.
 */

import type { DeepPartial, Theme } from 'stream-chat-expo';

// LinkApp Color Palette
export const ChatColors = {
  // Primary colors
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  // Secondary colors
  secondary: '#6B7280',
  secondaryLight: '#9CA3AF',
  secondaryDark: '#4B5563',
  
  // Neutral colors
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Chat-specific colors
  messageBackground: '#FFFFFF',
  messageText: '#111827',
  messageBubbleMine: '#3B82F6',
  messageBubbleOther: '#F3F4F6',
  messageTextMine: '#FFFFFF',
  messageTextOther: '#111827',
  messageSenderName: '#3B82F6',
  messageTimestamp: '#9CA3AF',
  
  // Online/offline status
  onlineIndicator: '#10B981',
  offlineIndicator: '#6B7280',
};

// Typography scale
export const ChatTypography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  
  // Font weights
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  
  // Line heights
  tight: 1.25,
  snug: 1.375,
  normalLine: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Spacing scale
export const ChatSpacing = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

// Border radius
export const ChatBorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const ChatShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

/**
 * Main Stream Chat Theme Configuration
 */
export const streamChatTheme: DeepPartial<Theme> = {
  colors: {
    // Base colors
    white: ChatColors.white,
    white_snow: ChatColors.gray50,
    white_smoke: ChatColors.gray100,
    black: ChatColors.gray900,
    grey: ChatColors.gray500,
    grey_gainsboro: ChatColors.gray300, // Bumped from gray200 so disabled icons are visible
    grey_whisper: ChatColors.gray100,
    
    // Primary theme colors
    blue_alice: '#EBF4FF', // Light blue background for attachment messages
    accent_blue: ChatColors.primary,
    accent_green: ChatColors.success,
    accent_red: ChatColors.error,
    
    // Sender bubble default (SDK falls back to light_blue for own messages)
    light_blue: ChatColors.messageBubbleMine, // #3B82F6 - ensures sent bubbles are clearly blue
    
    // Text colors
    grey_dark: ChatColors.gray700,
    text_high_emphasis: ChatColors.gray900,
    text_low_emphasis: ChatColors.gray500,
    
    // Status colors
    online_green: ChatColors.success,
    
    // Borders
    border: ChatColors.gray200,
    
    // Backgrounds
    light_gray: ChatColors.gray100, // Received-message bubble fallback
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Message colors - these are used by Stream Chat SDK
    bg_gradient_end: ChatColors.gray50,
    bg_gradient_start: ChatColors.white,
  },

  // Message List Theme
  messageList: {
    container: {
      // Keep transparent so chat screens can render subtle wallpapers behind the list.
      backgroundColor: 'transparent',
      flex: 1,
    },
    listContainer: {
      paddingHorizontal: ChatSpacing.base,
      paddingVertical: ChatSpacing.base,
    },
    errorNotification: {
      backgroundColor: ChatColors.error,
      borderRadius: ChatBorderRadius.md,
      margin: ChatSpacing.base,
      padding: ChatSpacing.base,
    },
    errorNotificationText: {
      color: ChatColors.white,
      fontSize: ChatTypography.sm,
      fontWeight: ChatTypography.medium,
      textAlign: 'center',
    },
  },

  // Message Theme
  // The SDK picks background colours in MessageSimple via:
  //   sent   → content.senderMessageBackgroundColor  ?? colors.light_blue
  //   recv   → content.receiverMessageBackgroundColor ?? colors.light_gray
  messageSimple: {
    content: {
      container: {
        marginBottom: 2,
      },
      containerInner: {
        borderRadius: 16,
      },
      // Explicit bubble colors so they never fall back to SDK defaults
      senderMessageBackgroundColor: ChatColors.messageBubbleMine,   // #3B82F6
      receiverMessageBackgroundColor: ChatColors.messageBubbleOther, // #F3F4F6
      // Normalize markdown text styling for received messages (sent message text is overridden via `myMessageTheme`)
      markdown: {
        text: {
          color: ChatColors.messageTextOther,
          fontSize: 15,
        },
      },
      metaText: {
        fontSize: 11,
        color: ChatColors.gray500,
      },
    },
  },

  // Message Input Theme
  messageInput: {
    container: {
      backgroundColor: ChatColors.white,
      borderTopColor: ChatColors.gray200,
      borderTopWidth: 1,
      paddingHorizontal: ChatSpacing.base,
      paddingVertical: ChatSpacing.sm,
    },
    // NOTE: Keep `inputBox` minimal and style the wrapper (`inputBoxContainer`) instead.
    // `AutoCompleteInput` renders the TextInput inside Stream's `inputBoxContainer`.
    // Styling borders/background on BOTH can cause a "double border" and misaligned radii.
    inputBox: {
      fontSize: ChatTypography.base,
    },
    inputBoxContainer: {
      backgroundColor: ChatColors.gray50,
      borderColor: ChatColors.gray200,
      borderRadius: ChatBorderRadius.xl,
      borderWidth: 1,
      marginHorizontal: ChatSpacing.sm,
    },
    focusedInputBoxContainer: {
      borderColor: ChatColors.primaryLight,
    },
    // Send button container – always visible with a circular background
    sendButton: {
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: ChatSpacing.sm,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: ChatColors.gray100,
    },
    // Override the disabled-state send icon to be more visible
    sendRightIcon: {
      fill: ChatColors.gray400,    // was grey_gainsboro (~gray200), now mid-gray for visibility
    } as any,
    sendUpIcon: {
      fill: ChatColors.primary,    // accent blue when active
    } as any,
    // Send button outer wrapper (sendButtonContainer wraps the Pressable)
    sendButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Attachment button – clean, modern rounded style
    attachButton: {
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: ChatColors.gray100,
    },
    attachButtonContainer: {
      paddingRight: 4,
    },
    // Commands button (lightning icon) – match attach button style
    commandsButton: {
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: ChatColors.gray100,
    },
    // "More options" toggle (circle-right icon shown when user types)
    moreOptionsButton: {
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: ChatColors.gray100,
    },
    // Composer row that wraps input + buttons
    composerContainer: {
      alignItems: 'center',
      paddingVertical: 2,
    },
  },

  // Attachment Picker Theme (bottom sheet) – keep Stream UI, just style it.
  attachmentPicker: {
    bottomSheetContentContainer: {
      backgroundColor: ChatColors.white,
    },
    handle: {
      container: {
        backgroundColor: ChatColors.white,
      },
      indicator: {
        backgroundColor: ChatColors.gray300,
      },
    },
    image: {
      borderRadius: ChatBorderRadius.md,
      overflow: 'hidden',
    },
    imageOverlay: {
      padding: ChatSpacing.sm,
    },
    durationText: {
      fontSize: ChatTypography.xs,
      fontWeight: ChatTypography.semibold,
    },
  },
  attachmentSelectionBar: {
    container: {
      backgroundColor: ChatColors.white,
      borderBottomColor: ChatColors.gray200,
      borderBottomWidth: 1,
      paddingVertical: ChatSpacing.sm,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: ChatColors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },

  // Channel List Theme
  channelListHeaderErrorIndicator: {
    container: {
      backgroundColor: ChatColors.error,
      borderRadius: ChatBorderRadius.sm,
      margin: ChatSpacing.base,
      padding: ChatSpacing.sm,
    },
    errorText: {
      color: ChatColors.white,
      fontSize: ChatTypography.sm,
      fontWeight: ChatTypography.medium,
      textAlign: 'center',
    },
  },

  // Channel Preview Theme
  channelPreview: {
    container: {
      // Make the underlying preview transparent so wrapper backgrounds (e.g. unread highlight)
      // are visible when using custom ChannelList Preview components.
      backgroundColor: 'transparent',
      borderBottomColor: ChatColors.gray100,
      borderBottomWidth: 1,
      paddingHorizontal: ChatSpacing.base,
      paddingVertical: ChatSpacing.base,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      color: ChatColors.gray900,
      fontSize: ChatTypography.base,
      fontWeight: ChatTypography.semibold,
      flex: 1,
    },
    date: {
      color: ChatColors.gray500,
      fontSize: ChatTypography.sm,
    },
    // Unread indicator
    unreadContainer: {
      backgroundColor: ChatColors.primary,
      borderRadius: ChatBorderRadius.full,
      height: 20,
      minWidth: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: ChatSpacing.xs,
    },
    unreadText: {
      color: ChatColors.white,
      fontSize: ChatTypography.xs,
      fontWeight: ChatTypography.bold,
    },
  },

  // Thread Theme
  thread: {
    newThread: {
      backgroundColor: ChatColors.primary,
      borderRadius: ChatBorderRadius.md,
      margin: ChatSpacing.base,
      padding: ChatSpacing.base,
      text: {
        color: ChatColors.white,
        fontSize: ChatTypography.base,
        fontWeight: ChatTypography.medium,
        textAlign: 'center' as const,
      },
    },
  },

  // Loading Indicator
  loadingIndicator: {
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: ChatSpacing.lg,
    },
    loadingText: {
      color: ChatColors.gray500,
      fontSize: ChatTypography.base,
      marginTop: ChatSpacing.base,
    },
  },
};

/**
 * Dark Stream Chat Theme Configuration
 *
 * NOTE: Keep this a small override on top of `streamChatTheme` to avoid drift.
 */
export const streamChatThemeDark: DeepPartial<Theme> = {
  ...streamChatTheme,
  colors: {
    ...streamChatTheme.colors,
    // Base surfaces
    white: '#1F2937',
    white_snow: '#111827',
    white_smoke: '#374151',
    border: '#374151',

    // Sender bubble – slightly brighter blue on dark backgrounds
    light_blue: '#2563EB',

    // Receiver bubble – dark card
    light_gray: '#1F2937',

    // Text colors
    black: '#F9FAFB',
    grey: '#9CA3AF',
    grey_dark: '#D1D5DB',
    grey_gainsboro: '#4B5563', // Disabled icon fill – more visible on dark
    text_high_emphasis: '#F9FAFB',
    text_low_emphasis: '#9CA3AF',

    // Background gradient tokens used by SDK components
    bg_gradient_start: '#0B1220',
    bg_gradient_end: '#111827',

    overlay: 'rgba(0, 0, 0, 0.65)',
  },
  messageList: {
    ...streamChatTheme.messageList,
    container: {
      ...streamChatTheme.messageList?.container,
      backgroundColor: 'transparent',
    },
  },
  messageSimple: {
    ...streamChatTheme.messageSimple,
    content: {
      ...streamChatTheme.messageSimple?.content,
      // Explicit dark-mode bubble colors
      senderMessageBackgroundColor: '#2563EB',
      receiverMessageBackgroundColor: '#1F2937',
      markdown: {
        text: {
          color: '#F9FAFB',
          fontSize: 15,
        },
      },
      metaText: {
        ...(streamChatTheme.messageSimple?.content as any)?.metaText,
        color: '#9CA3AF',
      },
    },
  },
  messageInput: {
    ...streamChatTheme.messageInput,
    container: {
      ...streamChatTheme.messageInput?.container,
      backgroundColor: '#0B1220',
      borderTopColor: '#374151',
    },
    inputBox: {
      ...streamChatTheme.messageInput?.inputBox,
      color: '#F9FAFB',
    },
    inputBoxContainer: {
      ...(streamChatTheme.messageInput as any)?.inputBoxContainer,
      backgroundColor: '#111827',
      borderColor: '#374151',
    },
    focusedInputBoxContainer: {
      ...(streamChatTheme.messageInput as any)?.focusedInputBoxContainer,
      borderColor: '#60A5FA',
    },
    attachButton: {
      ...streamChatTheme.messageInput?.attachButton,
      backgroundColor: '#111827',
    },
    commandsButton: {
      ...(streamChatTheme.messageInput as any)?.commandsButton,
      backgroundColor: '#111827',
    },
    moreOptionsButton: {
      ...(streamChatTheme.messageInput as any)?.moreOptionsButton,
      backgroundColor: '#111827',
    },
    sendButton: {
      ...streamChatTheme.messageInput?.sendButton,
      backgroundColor: '#111827',
    },
    sendRightIcon: {
      fill: '#6B7280', // Mid-gray on dark – visible but subtle
    } as any,
    sendUpIcon: {
      fill: '#60A5FA', // Slightly lighter blue for dark mode
    } as any,
  },
  attachmentPicker: {
    ...streamChatTheme.attachmentPicker,
    bottomSheetContentContainer: {
      ...(streamChatTheme.attachmentPicker as any)?.bottomSheetContentContainer,
      backgroundColor: '#0B1220',
    },
    handle: {
      container: {
        backgroundColor: '#0B1220',
      },
      indicator: {
        backgroundColor: '#374151',
      },
    },
  },
  attachmentSelectionBar: {
    ...streamChatTheme.attachmentSelectionBar,
    container: {
      ...(streamChatTheme.attachmentSelectionBar as any)?.container,
      backgroundColor: '#0B1220',
      borderBottomColor: '#374151',
    },
    icon: {
      ...(streamChatTheme.attachmentSelectionBar as any)?.icon,
      backgroundColor: '#111827',
    },
  },
  channelPreview: {
    ...streamChatTheme.channelPreview,
    title: {
      ...streamChatTheme.channelPreview?.title,
      color: '#F9FAFB',
    },
    date: {
      ...streamChatTheme.channelPreview?.date,
      color: '#9CA3AF',
    },
  },
};

/**
 * Theme override applied to the current user's (sent) messages via the Channel
 * `myMessageTheme` prop. This ensures sent message text is white on the blue bubble
 * and meta text is a translucent white rather than dark gray.
 */
export const myMessageThemeLight: DeepPartial<Theme> = {
  messageSimple: {
    content: {
      markdown: {
        text: {
          color: ChatColors.messageTextMine, // #FFFFFF
          fontSize: 15,
        },
      },
      metaText: {
        color: 'rgba(255,255,255,0.70)',
        fontSize: 11,
      },
      containerInner: {
        borderWidth: 0, // No border on sent bubbles – the blue fill is enough
      },
    },
  },
};

/**
 * Same as above but for dark mode (text stays white, meta slightly different).
 */
export const myMessageThemeDark: DeepPartial<Theme> = {
  messageSimple: {
    content: {
      markdown: {
        text: {
          color: '#FFFFFF',
          fontSize: 15,
        },
      },
      metaText: {
        color: 'rgba(255,255,255,0.60)',
        fontSize: 11,
      },
      containerInner: {
        borderWidth: 0,
      },
    },
  },
};

/**
 * Message theme variants for different message types
 */
export const messageThemeVariants = {
  // Property listing messages
  property: {
    containerInner: {
      backgroundColor: '#EBF4FF', // Light blue
      borderLeftColor: ChatColors.primary,
      borderLeftWidth: 4,
    },
  },
  
  // Job posting messages
  job: {
    containerInner: {
      backgroundColor: '#F0FDF4', // Light green
      borderLeftColor: ChatColors.success,
      borderLeftWidth: 4,
    },
  },
  
  // Service listing messages
  service: {
    containerInner: {
      backgroundColor: '#FEF3F2', // Light red
      borderLeftColor: ChatColors.warning,
      borderLeftWidth: 4,
    },
  },
  
  // Date Mi messages
  datemi: {
    containerInner: {
      backgroundColor: '#FDF2F8', // Light pink
      borderLeftColor: '#EC4899', // Pink
      borderLeftWidth: 4,
    },
  },
};

// Export both named and default
export default streamChatTheme;
