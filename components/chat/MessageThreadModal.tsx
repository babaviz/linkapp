/**
 * MessageThreadModal Component
 * 
 * This modal component provides a comprehensive thread view with:
 * - Full thread message display
 * - Reply functionality
 * - Message reactions
 * - User presence indicators  
 * - Keyboard-aware input handling
 * - Dark mode support
 * - Accessibility features
 * - Performance optimizations
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageResponse, Channel as StreamChannel } from 'stream-chat';
import {
  Thread,
  MessageInput,
} from 'stream-chat-expo';
import { ChatColors, ChatSpacing } from '../../theme/streamChatTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface MessageThreadModalProps {
  visible: boolean;
  onClose: () => void;
  channel?: StreamChannel;
  parentMessage?: MessageResponse;
  showParentMessage?: boolean;
  allowReplies?: boolean;
  maxHeight?: number;
  animationType?: 'slide' | 'fade' | 'none';
}

// Enhanced Thread Header Component
const ThreadHeader: React.FC<{
  onClose: () => void;
  replyCount: number;
  isDarkMode: boolean;
}> = React.memo(({ onClose, replyCount, isDarkMode }) => {
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View 
      style={[
        styles.header, 
        isDarkMode && styles.darkHeader,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={0.7}
        accessibilityLabel="Close thread"
        accessibilityRole="button"
        testID="thread-close-button"
      >
        <Ionicons 
          name="close" 
          size={24} 
          color={isDarkMode ? '#F9FAFB' : '#111827'} 
        />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Thread
        </Text>
        <Text style={[styles.headerSubtitle, isDarkMode && styles.darkSubtext]}>
          {replyCount === 0 ? 'No replies yet' : 
           replyCount === 1 ? '1 reply' : 
           `${replyCount} replies`}
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerAction}
          accessibilityLabel="Thread options"
          accessibilityRole="button"
        >
          <Ionicons 
            name="ellipsis-horizontal" 
            size={20} 
            color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// Parent Message Display Component  
const ParentMessageDisplay: React.FC<{
  message: MessageResponse;
  isDarkMode: boolean;
}> = React.memo(({ message, isDarkMode }) => {
  const formatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={[styles.parentMessage, isDarkMode && styles.darkParentMessage]}>
      <View style={styles.parentMessageHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {message.user?.image ? (
              <Image 
                source={{ uri: message.user.image }} 
                style={styles.avatarImage}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <Text style={styles.avatarText}>
                {message.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={[styles.userName, isDarkMode && styles.darkText]}>
            {message.user?.name || 'Unknown User'}
          </Text>
        </View>
        <Text style={[styles.messageTime, isDarkMode && styles.darkSubtext]}>
          {formatTime(message.created_at!)}
        </Text>
      </View>
      
      <Text style={[styles.parentMessageText, isDarkMode && styles.darkText]}>
        {(message.text ?? '') || 'No text content'}
      </Text>
      
      {/* Message attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
          {message.attachments.map((attachment: any, index: number) => (
            <View
              key={
                attachment.id ||
                `${message.id}-${attachment.type || 'att'}-${attachment.image_url || attachment.asset_url || attachment.fallback || attachment.title || index}`
              }
              style={styles.attachmentIndicator}
            >
              <Ionicons 
                name={attachment.type === 'image' ? 'image' : 'attach'} 
                size={16} 
                color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
              />
              <Text style={[styles.attachmentText, isDarkMode && styles.darkSubtext]}>
                {attachment.title || attachment.name || 'Attachment'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// Thread Statistics Component
const ThreadStats: React.FC<{
  replyCount: number;
  participantCount: number;
  lastReplyTime?: Date | string;
  isDarkMode: boolean;
}> = React.memo(({ replyCount, participantCount, lastReplyTime, isDarkMode }) => {
  const formatLastReply = (date?: Date | string) => {
    if (!date) return '';
    
    const lastReply = new Date(date);
    const now = new Date();
    const diff = now.getTime() - lastReply.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (replyCount === 0) return null;

  return (
    <View style={[styles.threadStats, isDarkMode && styles.darkThreadStats]}>
      <View style={styles.statItem}>
        <Ionicons 
          name="chatbubble" 
          size={14} 
          color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
        />
        <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </Text>
      </View>
      
      <View style={styles.statItem}>
        <Ionicons 
          name="people" 
          size={14} 
          color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
        />
        <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
          {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
        </Text>
      </View>
      
      {lastReplyTime && (
        <View style={styles.statItem}>
          <Ionicons 
            name="time" 
            size={14} 
            color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
          />
          <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
            Last reply {formatLastReply(lastReplyTime)}
          </Text>
        </View>
      )}
    </View>
  );
});

// Main MessageThreadModal Component
export const MessageThreadModal: React.FC<MessageThreadModalProps> = ({
  visible,
  onClose,
  channel,
  parentMessage,
  showParentMessage = true,
  allowReplies = true,
  maxHeight,
  animationType = 'slide',
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [isLoading, setIsLoading] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [lastReplyTime, setLastReplyTime] = useState<Date | string>();
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      setError(null);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Update thread statistics
  useEffect(() => {
    if (!parentMessage || !visible) return;

    const updateStats = () => {
      setReplyCount(parentMessage.reply_count || 0);
      
      // Calculate participant count (simplified)
      const participants = new Set([(parentMessage.user as any)?.id]);
      if (parentMessage.thread_participants) {
        parentMessage.thread_participants.forEach((p: any) => participants.add(p.user?.id));
      }
      setParticipantCount(participants.size);
      
      if (parentMessage.latest_reactions && parentMessage.latest_reactions.length > 0) {
        setLastReplyTime(parentMessage.latest_reactions[0].created_at);
      }
    };

    updateStats();
  }, [parentMessage, visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [fadeAnim, slideAnim, onClose]);

  const modalHeight = useMemo(() => {
    return maxHeight || screenHeight * 0.9;
  }, [maxHeight]);

  if (!visible || !parentMessage || !channel) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
      accessibilityViewIsModal
      testID="message-thread-modal"
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityLabel="Close thread"
          accessibilityRole="button"
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            isDarkMode && styles.darkModalContainer,
            {
              height: modalHeight,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <ThreadHeader
              onClose={handleClose}
              replyCount={replyCount}
              isDarkMode={isDarkMode}
            />
            
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={ChatColors.error} />
                <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
                  {error}
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => setError(null)}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.contentContainer}
                  contentInsetAdjustmentBehavior="automatic"
                  showsVerticalScrollIndicator={false}
                  testID="thread-scroll-view"
                >
                  {showParentMessage && (
                    <>
                      <ParentMessageDisplay 
                        message={parentMessage} 
                        isDarkMode={isDarkMode}
                      />
                      
                      <ThreadStats
                        replyCount={replyCount}
                        participantCount={participantCount}
                        lastReplyTime={lastReplyTime}
                        isDarkMode={isDarkMode}
                      />
                      
                      <View style={[styles.divider, isDarkMode && styles.darkDivider]} />
                    </>
                  )}
                  
                  <KeyboardAvoidingView
                    style={styles.threadContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                  >
                    <Thread
                      thread={parentMessage as any}
                      onThreadDismount={handleClose}
                    />
                  </KeyboardAvoidingView>
                </ScrollView>

                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={ChatColors.primary} />
                    <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
                      Loading thread...
                    </Text>
                  </View>
                )}
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: ChatColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.95,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  darkModalContainer: {
    backgroundColor: '#1F2937',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ChatSpacing.md,
    paddingVertical: ChatSpacing.base,
    borderBottomWidth: 1,
    borderBottomColor: ChatColors.gray200,
    backgroundColor: ChatColors.white,
  },
  darkHeader: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  closeButton: {
    padding: ChatSpacing.sm,
    marginRight: ChatSpacing.sm,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ChatColors.gray900,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: ChatColors.gray600,
  },
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    padding: ChatSpacing.sm,
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
  },
  parentMessage: {
    margin: ChatSpacing.md,
    padding: ChatSpacing.md,
    backgroundColor: ChatColors.gray50,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: ChatColors.primary,
  },
  darkParentMessage: {
    backgroundColor: '#374151',
  },
  parentMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ChatSpacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ChatColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ChatSpacing.sm,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: ChatColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatColors.gray900,
  },
  messageTime: {
    fontSize: 12,
    color: ChatColors.gray500,
  },
  parentMessageText: {
    fontSize: 15,
    lineHeight: 20,
    color: ChatColors.gray800,
  },
  attachmentsContainer: {
    marginTop: ChatSpacing.sm,
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  attachmentText: {
    fontSize: 13,
    color: ChatColors.gray600,
    marginLeft: ChatSpacing.xs,
  },
  threadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ChatSpacing.md,
    paddingVertical: ChatSpacing.sm,
    backgroundColor: ChatColors.gray50,
    marginHorizontal: ChatSpacing.md,
    borderRadius: 8,
    flexWrap: 'wrap',
    gap: ChatSpacing.base,
  },
  darkThreadStats: {
    backgroundColor: '#374151',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: ChatColors.gray600,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: ChatColors.gray200,
    marginHorizontal: ChatSpacing.md,
    marginVertical: ChatSpacing.base,
  },
  darkDivider: {
    backgroundColor: '#374151',
  },
  threadContainer: {
    flex: 1,
    minHeight: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ChatSpacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: ChatColors.gray700,
    textAlign: 'center',
    marginVertical: ChatSpacing.base,
  },
  retryButton: {
    backgroundColor: ChatColors.primary,
    paddingHorizontal: ChatSpacing.lg,
    paddingVertical: ChatSpacing.sm,
    borderRadius: 6,
  },
  retryButtonText: {
    color: ChatColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: ChatSpacing.base,
    fontSize: 16,
    color: ChatColors.gray700,
  },
});

