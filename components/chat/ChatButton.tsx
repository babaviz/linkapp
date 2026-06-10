/**
 * ChatButton Component
 * 
 * Reusable chat button component that can be integrated into property listings,
 * job postings, service listings, and dating profiles to initiate conversations.
 */

import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useStreamChat } from '../../hooks/useStreamChat';

export interface ChatButtonProps {
  // Required props
  listingId: string;
  listingType: 'property' | 'job' | 'service' | 'datemi';
  ownerId: string;
  ownerName?: string;
  
  // Listing data for context
  listingData: {
    title: string;
    location?: string;
    price?: number;
    salary?: number;
    company?: string;
    category?: string;
    image?: string;
  };
  
  // Style props
  variant?: 'primary' | 'secondary' | 'outline' | 'icon';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  
  // Custom labels
  label?: string;
  loadingLabel?: string;
  
  // Callback props
  onChatStart?: (channelId: string) => void;
  onError?: (error: string) => void;
}

type NavigationProp = StackNavigationProp<any>;

export const ChatButton: React.FC<ChatButtonProps> = ({
  listingId,
  listingType,
  ownerId,
  ownerName,
  listingData,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  label,
  loadingLabel = 'Starting chat...',
  onChatStart,
  onError,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const {
    isConnected,
    isConnecting,
    user,
    createPropertyChannel,
    createJobChannel,
    createServiceChannel,
    createDateMiChannel,
    createDirectMessageChannel,
  } = useStreamChat();

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  /**
   * Get default label based on listing type
   */
  const getDefaultLabel = (): string => {
    if (label) return label;
    
    switch (listingType) {
      case 'property': return 'Message Owner';
      case 'job': return 'Message Employer';
      case 'service': return 'Message Provider';
      case 'datemi': return 'Start Chat';
      default: return 'Message';
    }
  };

  /**
   * Check if user can start chat
   */
  const canStartChat = (): boolean => {
    if (disabled) return false;
    if (!isConnected) return false;
    if (!user) return false;
    if (user.id === ownerId) return false; // Can't chat with yourself
    return true;
  };

  /**
   * Create or get channel for the listing
   */
  const handleChatPress = useCallback(async () => {
    if (!canStartChat()) {
      if (!isConnected) {
        Alert.alert(
          'Chat Unavailable',
          'Chat service is not available. Please try again later.'
        );
        return;
      }
      if (user?.id === ownerId) {
        Alert.alert(
          'Cannot Chat',
          'You cannot start a chat with yourself.'
        );
        return;
      }
      return;
    }

    setIsCreatingChannel(true);

    try {
      let channel = null;

      switch (listingType) {
        case 'property':
          channel = await createPropertyChannel(listingId, ownerId, {
            title: listingData.title,
            price: listingData.price || 0,
            location: listingData.location || '',
            image: listingData.image,
          });
          break;

        case 'job':
          channel = await createJobChannel(listingId, ownerId, {
            title: listingData.title,
            company: listingData.company || 'Company',
            location: listingData.location || '',
            salary: listingData.salary,
          });
          break;

        case 'service':
          channel = await createServiceChannel(listingId, ownerId, {
            name: listingData.title,
            category: listingData.category || 'Service',
            location: listingData.location || '',
            image: listingData.image,
          });
          break;

        case 'datemi':
          channel = await createDateMiChannel(ownerId, {
            name: ownerName || 'User',
            image: listingData.image,
          });
          break;

        default:
          channel = await createDirectMessageChannel(ownerId, ownerName || 'User');
          break;
      }

      if (channel) {

        // Navigate to the chat channel
        navigation.navigate('ChatChannel', {
          channelCid: channel.cid,
          channel: channel,
          channelName: (channel.data as any)?.name || getDefaultLabel(),
        });

        // Call success callback
        if (onChatStart) {
          onChatStart(channel.cid);
        }
      } else {
        throw new Error('Failed to create chat channel');
      }
    } catch (error: any) {

      const errorMessage = error.message || 'Failed to start chat';
      
      Alert.alert(
        'Chat Error',
        `Unable to start chat: ${errorMessage}`,
        [
          { text: 'OK' }
        ]
      );

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsCreatingChannel(false);
    }
  }, [
    canStartChat,
    listingType,
    listingId,
    ownerId,
    ownerName,
    listingData,
    createPropertyChannel,
    createJobChannel,
    createServiceChannel,
    createDateMiChannel,
    createDirectMessageChannel,
    navigation,
    onChatStart,
    onError,
    getDefaultLabel,
    isConnected,
    user,
  ]);

  /**
   * Get button styles based on variant and size
   */
  const getButtonStyles = () => {
    const baseStyles: any[] = [styles.button];
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyles.push(styles.buttonLarge);
        break;
      default:
        baseStyles.push(styles.buttonMedium);
        break;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.buttonOutline);
        break;
      case 'icon':
        baseStyles.push(styles.buttonIconVariant);
        break;
      default:
        baseStyles.push(styles.buttonPrimary);
        break;
    }

    // Full width
    if (fullWidth) {
      baseStyles.push(styles.buttonFullWidth);
    }

    // Disabled state
    if (!canStartChat()) {
      baseStyles.push(styles.buttonDisabled);
    }

    return baseStyles;
  };

  /**
   * Get text styles
   */
  const getTextStyles = () => {
    const baseStyles: any[] = [styles.buttonText];

    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.textSmall);
        break;
      case 'large':
        baseStyles.push(styles.textLarge);
        break;
      default:
        baseStyles.push(styles.textMedium);
        break;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.textSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.textOutline);
        break;
      default:
        baseStyles.push(styles.textPrimary);
        break;
    }

    // Disabled state
    if (!canStartChat()) {
      baseStyles.push(styles.textDisabled);
    }

    return baseStyles;
  };

  const isLoading = isCreatingChannel || isConnecting;
  const buttonLabel = isLoading ? loadingLabel : getDefaultLabel();

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={getButtonStyles()}
        onPress={handleChatPress}
        disabled={!canStartChat() || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="chatbubble" size={size === 'small' ? 16 : size === 'large' ? 28 : 20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={handleChatPress}
      disabled={!canStartChat() || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' ? '#3B82F6' : '#FFFFFF'}
            style={styles.buttonIcon}
          />
        ) : (
          <Ionicons 
            name="chatbubble" 
            size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
            color={variant === 'outline' ? '#3B82F6' : '#FFFFFF'}
            style={styles.buttonIcon}
          />
        )}
        <Text style={getTextStyles()}>
          {buttonLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },

  // Size variants
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonMedium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonLarge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },

  // Style variants
  buttonPrimary: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonIconVariant: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // Width variants
  buttonFullWidth: {
    width: '100%',
  },

  // Disabled state
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Text styles
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Text size variants
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },

  // Text color variants
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: '#3B82F6',
  },

  // Disabled text
  textDisabled: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
});
