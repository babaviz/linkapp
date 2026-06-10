/**
 * Universal Chat Interface Component
 * Supports real-time messaging across all app sections (Property, Jobs, Services, DateMi)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import { getDynamicDimensions, spacing } from '../../utils/responsive';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'system';
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface ChatInterfaceProps {
  chatId: string;
  chatType: 'property' | 'job' | 'service' | 'datemi' | 'general';
  participants: ChatParticipant[];
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  onLoadMoreMessages?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onLongPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwnMessage, 
  showAvatar, 
  onLongPress 
}) => {
  const { isTablet } = getDynamicDimensions();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '';
    }
  };

  return (
    <View
      style={{
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        marginVertical: 2,
        paddingHorizontal: spacing.md,
        alignItems: 'flex-end'
      }}
    >
      {/* Avatar */}
      {showAvatar && !isOwnMessage && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.xs
          }}
        >
          <Text style={{ fontSize: 14 }}>
            {message.senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Message Container */}
      <TouchableOpacity
        onLongPress={onLongPress}
        style={{
          maxWidth: '75%',
          marginHorizontal: spacing.xs
        }}
        activeOpacity={0.8}
      >
        {/* Sender Name (for group chats) */}
        {!isOwnMessage && showAvatar && (
          <Text
            style={{
              fontSize: 12,
              color: '#6B7280',
              marginBottom: 2,
              marginLeft: spacing.xs
            }}
          >
            {message.senderName}
          </Text>
        )}

        {/* Message Bubble */}
        <View
          style={{
            backgroundColor: isOwnMessage ? '#10B981' : '#FFFFFF',
            borderRadius: 18,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderTopLeftRadius: !isOwnMessage && showAvatar ? 4 : 18,
            borderTopRightRadius: isOwnMessage && showAvatar ? 4 : 18,
            ...getCrossPlatformShadow({
              width: 0,
              height: 2,
              radius: 4,
              opacity: 0.1,
              color: '#000',
              elevation: 2
            }),
            borderWidth: isOwnMessage ? 0 : 1,
            borderColor: '#E5E7EB'
          }}
        >
          <Text
            style={{
              fontSize: isTablet ? 16 : 15,
              color: isOwnMessage ? '#FFFFFF' : '#111827',
              lineHeight: isTablet ? 22 : 20
            }}
          >
            {message.message}
          </Text>

          {/* Timestamp and Status */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
              alignItems: 'center',
              marginTop: 4
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: isOwnMessage ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                marginRight: spacing.xs
              }}
            >
              {formatTime(message.timestamp)}
            </Text>
            {isOwnMessage && (
              <Text
                style={{
                  fontSize: 12,
                  color: message.status === 'read' ? '#34D399' : 'rgba(255,255,255,0.7)'
                }}
              >
                {getStatusIcon(message.status)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function ChatInterface({
  chatId,
  chatType,
  participants,
  messages,
  currentUserId,
  onSendMessage,
  onLoadMoreMessages,
  isLoading = false,
  placeholder = "Type a message..."
}: ChatInterfaceProps) {
  const { width: screenWidth, height: screenHeight, isTablet } = getDynamicDimensions();
  const headerHeight = useHeaderHeight();
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const otherParticipant = participants.find(p => p.id !== currentUserId);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent as any, () => setKeyboardHeight(0));
    return () => {
      // @ts-ignore - remove exists on RN Keyboard subscription
      showSub.remove?.();
      // @ts-ignore
      hideSub.remove?.();
    };
  }, []);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleMessageLongPress = (message: ChatMessage) => {
    Alert.alert(
      'Message Options',
      `From: ${message.senderName}\nTime: ${new Date(message.timestamp).toLocaleString()}`,
      [
        { text: 'Copy', onPress: () => {/* Implement copy functionality */} },
        { text: 'Reply', onPress: () => {/* Implement reply functionality */} },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.senderId !== item.senderId;

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        onLongPress={() => handleMessageLongPress(item)}
      />
    );
  };

  const getChatTypeColor = (type: string) => {
    switch (type) {
      case 'property': return '#10B981';
      case 'job': return '#3B82F6';
      case 'service': return '#F59E0B';
      case 'datemi': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const chatColor = getChatTypeColor(chatType);

  return (
    <KeyboardAvoidingView
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }} edges={['left', 'right', 'bottom']}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingVertical: spacing.md,
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMoreMessages}
          onEndReachedThreshold={0.5}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.md }}>💬</Text>
              <Text style={{ 
                fontSize: isTablet ? 18 : 16, 
                fontWeight: '600', 
                color: '#374151',
                textAlign: 'center',
                marginBottom: spacing.sm 
              }}>
                Start the conversation
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                textAlign: 'center',
                lineHeight: 20 
              }}>
                Send a message to begin chatting with {otherParticipant?.name || 'other participants'}
              </Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
              {otherParticipant?.name} is typing...
            </Text>
          </View>
        )}

        {/* Message Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB'
          }}
        >
          {/* Message Input Field */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#F3F4F6',
              borderRadius: 24,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              maxHeight: 100,
              justifyContent: 'center'
            }}
          >
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              multiline
              style={{
                fontSize: isTablet ? 16 : 15,
                color: '#111827',
                minHeight: 20,
                maxHeight: 80,
                paddingTop: Platform.OS === 'ios' ? 8 : 0
              }}
              textAlignVertical="center"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim() || isLoading}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: messageText.trim() ? chatColor : '#D1D5DB',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: spacing.sm,
              ...getCrossPlatformShadow({
                width: 0,
                height: 2,
                radius: 6,
                opacity: 0.25,
                color: chatColor,
                elevation: 4
              })
            }}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: !messageText.trim() || isLoading }}
          >
            <Text style={{ fontSize: 20, color: '#FFFFFF', marginLeft: 2 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
