/**
 * Universal Chat Service
 * Handles real-time messaging across all app sections using Stream Chat
 */

import { Channel, MessageResponse } from 'stream-chat';
import { streamChatService, ChannelType } from './streamChatService';
import { StreamTokenService } from './streamTokenService';
import { ChatMessage } from '../components/common/ChatInterface';
import { authService } from './authService';

export interface ChatConversation {
  id: string;
  type: 'property' | 'job' | 'service' | 'datemi' | 'general';
  participants: string[];
  lastMessage?: ChatMessage;
  lastActivity: string;
  unreadCount: number;
  metadata?: {
    propertyId?: string;
    jobId?: string;
    serviceId?: string;
    title?: string;
    imageUrl?: string;
    // DateMi-specific identifiers (to render correct 1:1 name without needing channel.name)
    datemiUser1Id?: string;
    datemiUser1Name?: string;
    datemiUser2Id?: string;
    datemiUser2Name?: string;
  };
}

export interface CreateChatParams {
  type: 'property' | 'job' | 'service' | 'datemi' | 'general';
  participantIds: string[];
  metadata?: ChatConversation['metadata'];
  initialMessage?: string;
}

class ChatService {
  private channelToConversationCache = new Map<string, ChatConversation>();
  private messageIdCounter = 0;
  private demoMessageCache = new Map<string, ChatMessage[]>();

  private isConfigured(): boolean {
    return streamChatService.isConnected();
  }

  private generateUniqueMessageId(prefix: string = 'msg'): string {
    this.messageIdCounter++;
    return `${prefix}_${Date.now()}_${this.messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create or get existing chat conversation
   */
  async createOrGetConversation(params: CreateChatParams): Promise<ChatConversation> {
    try {
      if (!this.isConfigured()) {
        // When chat is not configured, do not create demo data; return a minimal conversation without messages
        return {
          id: `offline_${Date.now()}`,
          type: params.type,
          participants: params.participantIds,
          lastActivity: new Date().toISOString(),
          unreadCount: 0,
          metadata: params.metadata,
        };
      }

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const normalizedParticipants = Array.from(
        new Set(
          (params.participantIds || [])
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );

      if (!normalizedParticipants.includes(currentUser.id)) {
        normalizedParticipants.push(currentUser.id);
      }

      // Create channel ID based on type and metadata
      let channelId: string;
      let channelData: any = {
        name: params.metadata?.title || 'Chat',
        members: normalizedParticipants,
      };

      if (params.metadata?.propertyId) {
        const otherUser = normalizedParticipants.find((id) => id !== currentUser.id);
        if (!otherUser) throw new Error('Property chat requires another participant');
        channelId = StreamTokenService.createListingConversationChannelId(
          'property',
          params.metadata.propertyId,
          currentUser.id,
          otherUser
        );
        channelData = {
          ...channelData,
          property_id: params.metadata.propertyId,
          property_title: params.metadata.title,
          property_image: params.metadata.imageUrl,
        };
      } else if (params.metadata?.jobId) {
        const otherUser = normalizedParticipants.find((id) => id !== currentUser.id);
        if (!otherUser) throw new Error('Job chat requires another participant');
        channelId = StreamTokenService.createListingConversationChannelId(
          'job',
          params.metadata.jobId,
          currentUser.id,
          otherUser
        );
        channelData = {
          ...channelData,
          job_id: params.metadata.jobId,
          job_title: params.metadata.title,
        };
      } else if (params.metadata?.serviceId) {
        const otherUser = normalizedParticipants.find((id) => id !== currentUser.id);
        if (!otherUser) throw new Error('Service chat requires another participant');
        channelId = StreamTokenService.createListingConversationChannelId(
          'service',
          params.metadata.serviceId,
          currentUser.id,
          otherUser
        );
        channelData = {
          ...channelData,
          service_id: params.metadata.serviceId,
          service_name: params.metadata.title,
          service_image: params.metadata.imageUrl,
        };
      } else {
        // For direct messages or general chats
        const sortedIds = [...normalizedParticipants].sort();
        channelId = `dm_${sortedIds.join('_')}`;
      }

      // Get or create channel using Stream Chat
      const channel = await streamChatService.getChannel(
        params.type as ChannelType,
        channelId,
        channelData
      );

      if (!channel) {
        throw new Error('Failed to create channel');
      }

      // Send initial message if provided
      if (params.initialMessage && channel) {
        await streamChatService.sendMessage(channel, {
          text: params.initialMessage
        });
      }

      // Convert Stream Channel to ChatConversation
      return this.transformChannelToConversation(channel);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Transform Stream Channel to ChatConversation interface
   */
  private transformChannelToConversation(channel: Channel): ChatConversation {
    const channelData = channel.data as any;
    const lastMessage = channel.state.messages[channel.state.messages.length - 1];
    
    // Build metadata based on channel data
    const metadata: ChatConversation['metadata'] = {};
    if (channelData.property_id) {
      metadata.propertyId = channelData.property_id;
      metadata.title = channelData.property_title;
      metadata.imageUrl = channelData.property_image;
    } else if (channelData.job_id) {
      metadata.jobId = channelData.job_id;
      metadata.title = channelData.job_title;
    } else if (channelData.service_id) {
      metadata.serviceId = channelData.service_id;
      metadata.title = channelData.service_name;
      metadata.imageUrl = channelData.service_image;
    } else if (channelData.name) {
      metadata.title = channelData.name;
    }

    // DateMi: store both sides so we can show the other person's name reliably.
    if (channelData?.datemi_conversation === true || channelData?.user1_id || channelData?.user2_id) {
      metadata.datemiUser1Id = channelData.user1_id;
      metadata.datemiUser1Name = channelData.user1_name;
      metadata.datemiUser2Id = channelData.user2_id;
      metadata.datemiUser2Name = channelData.user2_name;
    }

    // Determine the conversation type
    // DateMi conversations use 'messaging' channel type but have datemi_conversation flag
    let conversationType: ChatConversation['type'] = channel.type as ChatConversation['type'];
    if (channelData.datemi_conversation === true || channelData.user1_id || channelData.user2_id) {
      conversationType = 'datemi';
    } else if (channelData.property_id) {
      conversationType = 'property';
    } else if (channelData.job_id) {
      conversationType = 'job';
    } else if (channelData.service_id) {
      conversationType = 'service';
    }

    const conversation: ChatConversation = {
      id: channel.cid,
      type: conversationType,
      participants: Object.keys(channel.state.members),
      lastActivity: (channel.state.last_message_at ? 
        (typeof channel.state.last_message_at === 'string' ? channel.state.last_message_at : channel.state.last_message_at.toISOString()) : 
        (typeof channel.data.created_at === 'string' ? channel.data.created_at : new Date().toISOString())
      ),
      unreadCount: channel.countUnread(),
      metadata
    };

    if (lastMessage) {
      conversation.lastMessage = this.transformMessageToChat(lastMessage as any);
    }

    // Cache the conversation
    this.channelToConversationCache.set(channel.cid, conversation);

    return conversation;
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(userId: string): Promise<ChatConversation[]> {
    try {
      if (!this.isConfigured()) {
        // Do not prepopulate demo conversations by default
        return [];
      }

      // Get all user channels from Stream Chat
      // Performance: keep the initial conversations list lightweight.
      // Fetch more via pagination later if needed.
      const channels = await streamChatService.getUserChannels(30);
      
      // Transform channels to conversations
      const conversations = channels.map(channel => 
        this.transformChannelToConversation(channel)
      );

      // Sort by last activity
      conversations.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

      return conversations;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      if (!this.isConfigured()) {
        // Do not prepopulate demo messages by default
        return [];
      }

      // Extract channel type and id from conversation ID (format: "messaging:channelId")
      const [channelType, channelId] = conversationId.split(':');
      if (!channelType || !channelId) {
        throw new Error('Invalid conversation ID format');
      }

      // Get the channel
      const channel = streamChatService.getCachedChannel(
        channelType as ChannelType, 
        channelId
      ) || await streamChatService.getChannel(
        channelType as ChannelType,
        channelId
      );

      if (!channel) {
        throw new Error('Channel not found');
      }

      // IMPORTANT:
      // Conversation lists often fetch channels with `watch: false` and `message_limit: 1` for performance.
      // When opening a conversation, we must query more messages (and/or watch) to load history reliably.
      //
      // For this legacy conversation API, fetch the latest `limit` messages.
      // We intentionally ignore `offset` here to keep behavior predictable and avoid pagination bugs.
      void offset;
      try {
        await channel.query({ messages: { limit } } as any);
      } catch (_e) {
        // If query fails (e.g., transient network), fall back to whatever is already in state.
        void _e;
      }

      const messages = (channel.state?.messages || [])
        .slice(-limit)
        .map((msg) => this.transformMessageToChat(msg as any));

      return messages;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    message: string;
    type: 'text' | 'image';
    replyTo?: string;
  }): Promise<ChatMessage> {
    try {
      if (!this.isConfigured()) {
        // When offline/unconfigured, do not generate or append demo messages
        return {
          id: this.generateUniqueMessageId(`${params.conversationId}_offline`),
          senderId: params.senderId,
          senderName: params.senderName,
          message: params.message,
          timestamp: new Date().toISOString(),
          type: params.type,
          status: 'sent',
        };
      }

      // Extract channel type and id from conversation ID
      const [channelType, channelId] = params.conversationId.split(':');
      if (!channelType || !channelId) {
        throw new Error('Invalid conversation ID format');
      }

      // Get the channel
      const channel = streamChatService.getCachedChannel(
        channelType as ChannelType,
        channelId
      ) || await streamChatService.getChannel(
        channelType as ChannelType,
        channelId
      );

      if (!channel) {
        throw new Error('Channel not found');
      }

      // Ensure the channel is watched/initialized so the sender sees their message instantly
      // and subsequent reads include the message in state.
      const isInitialized = (channel as any)?.initialized === true;
      if (!isInitialized) {
        try {
          await channel.watch({ state: true, presence: true } as any);
        } catch (_e) {
          void _e;
        }
      }

      // Send message using Stream Chat
      const messageData: any = {
        text: params.message
      };

      if (params.replyTo) {
        messageData.parent_id = params.replyTo;
      }

      if (params.type === 'image') {
        messageData.attachments = [{
          type: 'image',
          image_url: params.message,
          fallback: 'Image'
        }];
        messageData.text = 'Shared an image';
      }

      const sentMessage = await channel.sendMessage(messageData);

      return this.transformMessageToChat(sentMessage.message);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, messageId: string): Promise<void> {
    try {
      if (!this.isConfigured()) return;

      // Extract channel type and id from conversation ID
      const [channelType, channelId] = conversationId.split(':');
      if (!channelType || !channelId) {
        return;
      }

      // Get the channel
      const channel = streamChatService.getCachedChannel(
        channelType as ChannelType,
        channelId
      ) || await streamChatService.getChannel(
        channelType as ChannelType,
        channelId
      );

      if (channel) {
        // Mark channel as read
        await channel.markRead();
      }
    } catch (error) {
      
    }
  }

  /**
   * Subscribe to real-time messages
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: ChatMessage) => void
  ): (() => void) | null {
    if (!this.isConfigured()) return null;

    try {
      // Extract channel type and id from conversation ID
      const [channelType, channelId] = conversationId.split(':');
      if (!channelType || !channelId) {
        return null;
      }

      // Get the channel
      streamChatService.getChannel(
        channelType as ChannelType,
        channelId
      ).then(channel => {
        if (channel) {
          // Subscribe to new messages
          const handleNewMessage = (event: any) => {
            if (event.message) {
              callback(this.transformMessageToChat(event.message));
            }
          };

          channel.on('message.new', handleNewMessage);

          // Return unsubscribe function
          return () => {
            channel.off('message.new', handleNewMessage);
          };
        }
      });

      return null;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversations(
    userId: string,
    callback: (conversation: ChatConversation) => void
  ): (() => void) | null {
    if (!this.isConfigured()) return null;

    // With Stream Chat, we listen to channel events
    const handleChannelUpdate = (event: any) => {
      if (event.channel) {
        const conversation = this.transformChannelToConversation(event.channel);
        callback(conversation);
      }
    };

    // Subscribe to various channel events
    const client = streamChatService.getClient();
    if (client) {
      client.on('channel.updated', handleChannelUpdate);
      client.on('message.new', handleChannelUpdate);
      client.on('notification.message_new', handleChannelUpdate);

      // Return unsubscribe function
      return () => {
        client.off('channel.updated', handleChannelUpdate);
        client.off('message.new', handleChannelUpdate);
        client.off('notification.message_new', handleChannelUpdate);
      };
    }

    return null;
  }

  // Demo/Mock data methods for development
  private getDemoConversation(params: CreateChatParams): ChatConversation {
    return {
      id: `demo_chat_${Date.now()}`,
      type: params.type,
      participants: params.participantIds,
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      metadata: params.metadata
    };
  }

  private getDemoConversations(userId: string): ChatConversation[] {
    // Generate unique IDs for demo conversations to avoid key conflicts
    const timestamp = Date.now();
    
    return [
      {
        id: `demo_property_chat_${userId}_${timestamp}_1`,
        type: 'property',
        participants: [userId, 'property_owner_123'],
        lastActivity: new Date().toISOString(),
        unreadCount: 2,
        metadata: {
          propertyId: 'prop_123',
          title: '3 Bedroom Apartment in Westlands',
          imageUrl: 'https://example.com/property.jpg'
        }
      },
      {
        id: `demo_job_chat_${userId}_${timestamp}_2`,
        type: 'job',
        participants: [userId, 'employer_456'],
        lastActivity: new Date().toISOString(),
        unreadCount: 0,
        metadata: {
          jobId: 'job_456',
          title: 'React Native Developer Position'
        }
      }
    ];
  }

  private getDemoMessages(conversationId: string, limit: number): ChatMessage[] {
    // Check if we already have cached messages for this conversation
    if (this.demoMessageCache.has(conversationId)) {
      const cached = this.demoMessageCache.get(conversationId)!;
      return cached.slice(0, limit);
    }

    const now = new Date();
    const messages: ChatMessage[] = [
      {
        id: this.generateUniqueMessageId(`${conversationId}_demo`),
        senderId: 'other_user',
        senderName: 'Property Owner',
        message: 'Hello! I see you\'re interested in my property. How can I help you?',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        type: 'text',
        status: 'read'
      },
      {
        id: this.generateUniqueMessageId(`${conversationId}_demo`),
        senderId: 'current_user',
        senderName: 'You',
        message: 'Hi! I\'d like to know more about the apartment. Is it still available?',
        timestamp: new Date(now.getTime() - 1800000).toISOString(),
        type: 'text',
        status: 'read'
      },
      {
        id: this.generateUniqueMessageId(`${conversationId}_demo`),
        senderId: 'other_user',
        senderName: 'Property Owner',
        message: 'Yes, it\'s still available! Would you like to schedule a viewing?',
        timestamp: new Date(now.getTime() - 900000).toISOString(),
        type: 'text',
        status: 'delivered'
      }
    ];

    // Cache the messages for this conversation
    this.demoMessageCache.set(conversationId, messages);
    
    return messages.slice(0, limit);
  }

  private createDemoMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    message: string;
    type: 'text' | 'image';
  }): ChatMessage {
    const newMessage: ChatMessage = {
      id: this.generateUniqueMessageId(`${params.conversationId}_new`),
      senderId: params.senderId,
      senderName: params.senderName,
      message: params.message,
      timestamp: new Date().toISOString(),
      type: params.type,
      status: 'sent'
    };

    // Add to cache if conversation is cached
    if (this.demoMessageCache.has(params.conversationId)) {
      const cached = this.demoMessageCache.get(params.conversationId)!;
      cached.push(newMessage);
    }

    return newMessage;
  }

  /**
   * Transform Stream Chat message to ChatMessage interface
   */
  private transformMessageToChat(message: MessageResponse): ChatMessage {
    // Ensure we always have a unique ID, even if Stream Chat doesn't provide one
    const messageId = message.id || this.generateUniqueMessageId('stream_msg');
    
    return {
      id: messageId,
      senderId: message.user?.id || '',
      senderName: message.user?.name || message.user?.id || 'Unknown',
      message: message.text || '',
      timestamp: message.created_at ? 
        (typeof message.created_at === 'string' ? message.created_at : (message.created_at as any).toISOString()) : 
        new Date().toISOString(),
      type: message.attachments?.some(a => a.type === 'image') ? 'image' : 'text',
      status: 'delivered', // Stream Chat doesn't have the same status concept
      replyTo: message.parent_id
    };
  }

  /**
   * Utility functions
   */
  getConversationTitle(conversation: ChatConversation, currentUserId: string): string {
    // DateMi: prefer match name from stored user1/user2 fields
    if (conversation.type === 'datemi') {
      const m = conversation.metadata;
      if (m?.datemiUser1Id && m?.datemiUser2Id) {
        if (currentUserId === m.datemiUser1Id && m.datemiUser2Name) return m.datemiUser2Name;
        if (currentUserId === m.datemiUser2Id && m.datemiUser1Name) return m.datemiUser1Name;
      }
      if (conversation.metadata?.title) {
        return conversation.metadata.title;
      }
      // Fall back to a friendly 1:1 label (never call it a group chat)
      return 'Chat with your match';
    }

    if (conversation.metadata?.title) {
      return conversation.metadata.title;
    }

    // Generate title based on type and participants
    const otherParticipants = conversation.participants.filter(p => p !== currentUserId);
    if (otherParticipants.length === 1) {
      return `Chat with User`; // In real app, fetch user name
    }

    return `Group Chat (${conversation.participants.length} participants)`;
  }

  formatLastMessagePreview(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  getTimeSince(timestamp: string): string {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageTime.toLocaleDateString();
  }

  /**
   * Clear demo message cache for a conversation or all conversations
   */
  clearDemoCache(conversationId?: string): void {
    if (conversationId) {
      this.demoMessageCache.delete(conversationId);
    } else {
      this.demoMessageCache.clear();
    }
  }

  /**
   * Reset all caches and counters
   */
  resetCaches(): void {
    this.channelToConversationCache.clear();
    this.demoMessageCache.clear();
    this.messageIdCounter = 0;
  }
}

let instance: ChatService | null = null;
function getInstance(): ChatService {
  if (!instance) instance = new ChatService();
  return instance;
}

export const chatService = new Proxy({} as ChatService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
